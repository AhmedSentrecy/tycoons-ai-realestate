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

  return String(body || '').replace(/^\uFEFF/, '').trim();
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
      'You are the voice property assistant for Tycoons Investments in Egypt.',
      'Speak naturally in Egyptian Arabic when the user speaks Arabic, otherwise use English.',
      'Keep replies short and practical.',
      'The conversation is full duplex: stop speaking immediately when the user interrupts and listen to the new request.',
      'When the user describes a property need, call search_properties with one clear complete query.',
      'When the user provides a phone number, repeat it clearly and ask for confirmation before calling save_lead.',
      'Never invent prices, availability, projects, payment plans, or delivery dates.'
    ].join(' '),
    audio: {
      input: {
        transcription: { model: 'gpt-4o-mini-transcribe' },
        turn_detection: {
          type: 'semantic_vad',
          create_response: true,
          interrupt_response: true
        }
      },
      output: { voice: process.env.OPENAI_REALTIME_VOICE || 'marin' }
    },
    tools: [
      {
        type: 'function',
        name: 'search_properties',
        description: 'Search the live Tycoons property inventory and show matching cards on the website.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The full property request in the user language.' }
          },
          required: ['query'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'save_lead',
        description: 'Save a lead only after the user confirms the phone number.',
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
    // OpenAI's unified Realtime WebRTC endpoint expects normal text fields here.
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
