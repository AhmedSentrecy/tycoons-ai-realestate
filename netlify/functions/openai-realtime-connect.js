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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'OPENAI_API_KEY is not configured in Netlify.' })
    };
  }

  const session = {
    type: 'realtime',
    model: 'gpt-realtime-2.1',
    instructions: [
      'You are the voice property assistant for Tycoons Investments in Egypt.',
      'Speak naturally in Egyptian Arabic when the user speaks Arabic, otherwise use English.',
      'Keep replies concise and useful.',
      'When the user describes a property need, call search_properties with the clearest complete query you can infer.',
      'When the user provides a phone number, repeat it back and ask for confirmation before calling save_lead.',
      'Do not invent prices, availability, projects, or payment plans.'
    ].join(' '),
    audio: {
      input: {
        transcription: { model: 'gpt-4o-mini-transcribe', language: 'ar' },
        turn_detection: { type: 'server_vad', create_response: true, interrupt_response: true }
      },
      output: { voice: 'marin' }
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
    form.set('sdp', event.body || '');
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
      headers: {
        'Content-Type': response.ok ? 'application/sdp' : 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error && error.message ? error.message : 'Realtime connection failed.' })
    };
  }
};
