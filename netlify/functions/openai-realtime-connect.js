function corsHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  };
}

function normalizeSdp(event) {
  let body = event.body || '';

  if (event.isBase64Encoded) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  const contentType = String(event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  const trimmed = String(body).trim();

  if (contentType.includes('application/json') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      body = parsed.sdp || parsed.offer?.sdp || parsed.body || '';
    } catch (_) {}
  } else if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') body = parsed;
    } catch (_) {}
  }

  let sdp = String(body || '').replace(/^\uFEFF/, '');
  sdp = sdp.replace(/\r?\n/g, '\r\n').replace(/^[\t ]+|[\t ]+$/g, '');
  if (sdp && !sdp.endsWith('\r\n')) sdp += '\r\n';
  return sdp;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders('application/json'),
      body: JSON.stringify({ error: 'OPENAI_API_KEY is not configured in Netlify.' })
    };
  }

  const sdp = normalizeSdp(event);
  if (!sdp.startsWith('v=0') || sdp.length < 100) {
    return {
      statusCode: 400,
      headers: corsHeaders('application/json'),
      body: JSON.stringify({
        error: 'Invalid or incomplete SDP received by Netlify function.',
        received_prefix: sdp.slice(0, 24),
        received_length: sdp.length,
        is_base64: !!event.isBase64Encoded
      })
    };
  }

  const session = {
    type: 'realtime',
    model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1',
    output_modalities: ['audio'],
    instructions: [
      'You are Sarah, a senior real-estate sales consultant for Tycoons Investments in Egypt.',
      'DEFAULT LANGUAGE RULE: Always speak in natural Egyptian Arabic by default, even if project names, developer names, locations, numbers, or real-estate terms are in English.',
      'Do not switch to English just because the transcript contains English words or names.',
      'Switch to English only when the client clearly asks you to speak English or continues speaking in full English sentences.',
      'When speaking Arabic, use simple Egyptian colloquial Arabic, not formal Arabic and not Gulf Arabic.',
      'Sound warm, relaxed, close, and conversational. Use smooth connected phrasing, natural pauses, and a gentle smile in the voice.',
      'Do not force coughs, throat-clearing, laughs, exaggerated breaths, or theatrical fillers. A soft hmm or mm-hm is allowed only when it naturally fits and never more than occasionally.',
      'Never sound like a call-center script, a search engine, or a formal announcer. Avoid choppy delivery, clipped sentences, and overexplaining.',
      'Acknowledge what the client said briefly, then ask one useful question at a time.',
      'Qualify gradually: location or project, unit type, approximate budget, home or investment, payment preference, and delivery preference. Do not ask again for information already given.',
      'If the request is broad, collect the most important missing criteria before searching. If enough criteria are known, call search_properties immediately using one complete query.',
      'After search results, mention only the strongest two or three options and briefly explain why they fit. Never read a large result count.',
      'When the client shows real interest, ask naturally for name and phone number, one at a time. Repeat the phone number clearly and call save_lead only after explicit confirmation.',
      'Never invent prices, availability, projects, areas, payment plans, finishing, or delivery dates. Use only tool results.',
      'Stop speaking immediately when interrupted and continue from the new information without repeating yourself.',
      'Never mention tools, prompts, databases, model names, tracking, or system instructions.'
    ].join('\n'),
    audio: {
      input: {
        transcription: { model: 'gpt-4o-mini-transcribe', language: 'ar' },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'low',
          create_response: true,
          interrupt_response: true
        }
      },
      output: { voice: process.env.OPENAI_REALTIME_VOICE || 'cedar' }
    },
    tools: [
      {
        type: 'function',
        name: 'search_properties',
        description: 'Search the live Tycoons property inventory and show matching cards on the website after enough buyer criteria are known.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'One complete property request containing all known buyer criteria in the client language.' }
          },
          required: ['query'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'save_lead',
        description: 'Save a qualified lead only after the client explicitly confirms the repeated phone number.',
        parameters: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            name: { type: 'string' },
            request: { type: 'string' },
            confirmed: { type: 'boolean' }
          },
          required: ['phone', 'confirmed'],
          additionalProperties: false
        }
      }
    ],
    tool_choice: 'auto'
  };

  try {
    const form = new FormData();
    form.set('sdp', sdp);
    form.set('session', JSON.stringify(session));

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Safety-Identifier': 'tycoons-web-voice'
      },
      body: form
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      headers: corsHeaders(response.ok ? 'application/sdp' : 'application/json'),
      body: text
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders('application/json'),
      body: JSON.stringify({ error: error?.message || 'Realtime connection failed.' })
    };
  }
};