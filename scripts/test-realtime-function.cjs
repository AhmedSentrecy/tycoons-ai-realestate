const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_FORM_DATA = global.FormData;

class TestFormData {
  constructor() {
    this.values = new Map();
  }
  set(key, value) {
    this.values.set(key, value);
  }
  get(key) {
    return this.values.get(key);
  }
}

async function loadHandler() {
  const modulePath = path.resolve(__dirname, '../netlify/functions/openai-realtime-connect.js');
  const moduleUrl = `${pathToFileURL(modulePath).href}?test=${Date.now()}-${Math.random()}`;
  const loaded = await import(moduleUrl);
  return loaded.handler;
}

async function run() {
  global.FormData = TestFormData;

  process.env.OPENAI_REALTIME_MODEL = 'gpt-realtime-2.1';
  delete process.env.OPENAI_API_KEY;
  let handler = await loadHandler();

  const health = await handler({ httpMethod: 'GET', headers: {}, body: '' });
  assert.equal(health.statusCode, 200);
  const healthBody = JSON.parse(health.body);
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.model, 'gpt-realtime-2.1');
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

  let capturedForm;
  global.fetch = async (_url, options) => {
    capturedForm = options.body;
    return {
      ok: true,
      status: 201,
      headers: {
        get(name) {
          if (String(name).toLowerCase() === 'content-type') return 'application/sdp';
          if (String(name).toLowerCase() === 'location') return '/v1/realtime/calls/test';
          return null;
        }
      },
      text: async () => 'v=0\r\ns=answer\r\n'
    };
  };

  const connected = await handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sdp: validSdp })
  });

  assert.equal(connected.statusCode, 201);
  assert.match(connected.body, /^v=0/);
  assert.equal(capturedForm.get('sdp'), validSdp);
  const session = JSON.parse(capturedForm.get('session'));
  assert.equal(session.model, 'gpt-realtime-2.1');
  assert.equal(session.type, 'realtime');
  assert.deepEqual(session.output_modalities, ['audio']);
  assert.equal(session.tools.some((tool) => tool.name === 'search_properties'), true);

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
    global.FormData = ORIGINAL_FORM_DATA;
  });
