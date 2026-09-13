const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadHandler() {
  const modulePath = path.resolve(__dirname, '../netlify/functions/openai-realtime-connect.js');
  const moduleUrl = `${pathToFileURL(modulePath).href}?test=${Date.now()}-${Math.random()}`;
  const loaded = await import(moduleUrl);
  return loaded.handler;
}

async function run() {
  process.env.OPENAI_LIVE_MODEL = 'gpt-live-1';
  process.env.OPENAI_LIVE_BACKEND_MODEL = 'gpt-5.6-terra';
  delete process.env.OPENAI_API_KEY;
  let handler = await loadHandler();

  const health = await handler({ httpMethod: 'GET', headers: {}, body: '' });
  assert.equal(health.statusCode, 200);
  const healthBody = JSON.parse(health.body);
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.service, 'openai-live-connect');
  assert.equal(healthBody.model, 'gpt-live-1');
  assert.equal(healthBody.backend_model, 'gpt-5.6-terra');
  assert.equal(healthBody.api_key_configured, false);

  const options = await handler({ httpMethod: 'OPTIONS', headers: {}, body: '' });
  assert.equal(options.statusCode, 204);

  const method = await handler({ httpMethod: 'PUT', headers: {}, body: '' });
  assert.equal(method.statusCode, 405);

  const missingKey = await handler({ httpMethod: 'POST', headers: {}, body: 'v=0\r\n' });
  assert.equal(missingKey.statusCode, 500);

  process.env.OPENAI_API_KEY = 'test-key';
  handler = await loadHandler();

  const invalidSdp = await handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/sdp' },
    body: 'not-an-sdp'
  });
  assert.equal(invalidSdp.statusCode, 400);

  const validSdp = [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'm=audio 9 UDP/TLS/RTP/SAVPF 111',
    'a=rtpmap:111 opus/48000/2',
    'a=ice-ufrag:test',
    'a=ice-pwd:test-password',
    'a=fingerprint:sha-256 00:11:22:33:44:55:66:77'
  ].join('\r\n') + '\r\n';

  let capturedUrl;
  let capturedOptions;
  global.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 201,
      headers: {
        get(name) {
          if (String(name).toLowerCase() === 'content-type') return 'application/json; charset=utf-8';
          return null;
        }
      },
      text: async () => JSON.stringify({
        session: { id: 'live_test' },
        transport: { type: 'webrtc', sdp: 'v=0\r\ns=answer\r\n' }
      })
    };
  };

  const connected = await handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sdp: validSdp })
  });

  assert.equal(connected.statusCode, 201);
  assert.equal(capturedUrl, 'https://api.openai.com/v1/live/sessions');
  assert.equal(capturedOptions.headers['Content-Type'], 'application/json');
  const request = JSON.parse(capturedOptions.body);
  assert.equal(request.transport.type, 'webrtc');
  assert.equal(request.transport.sdp, validSdp);
  assert.equal(request.session.model, 'gpt-live-1');
  assert.equal(request.session.audio.output.voice, 'stone');
  assert.equal(request.session.delegation.type, 'responses');
  assert.equal(request.session.delegation.responses.model, 'gpt-5.6-terra');
  // Configuration regression checks, not a substitute for spoken conversation evals.
  const livePrompt = request.session.instructions;
  const backendPrompt = request.session.delegation.responses.instructions;
  assert.match(livePrompt, /بالذكاء الاصطناعي/);
  assert.match(livePrompt, /Backchannel policy:/);
  assert.match(livePrompt, /Interruption policy:/);
  assert.match(livePrompt, /Delegation policy:/);
  assert.match(livePrompt, /لا تعتبر السكوت موافقة/);
  assert.match(backendPrompt, /QUALIFICATION:/);
  assert.match(backendPrompt, /down payment separately from total price/);
  assert.match(backendPrompt, /purchase timeline separately from delivery date/);
  assert.match(backendPrompt, /Exclude the client's name, phone/);
  assert.match(backendPrompt, /that is not inventory evidence/);
  assert.match(backendPrompt, /Respect refusal and withdrawal/);
  assert.equal(request.session.store, false);
  assert.equal(
    request.session.delegation.responses.tools.some((tool) => tool.name === 'search_properties'),
    true
  );

  console.log('Realtime function tests passed');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.env = ORIGINAL_ENV;
    global.fetch = ORIGINAL_FETCH;
  });
