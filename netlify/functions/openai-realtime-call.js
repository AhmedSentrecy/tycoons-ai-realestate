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
    output_modalities: ['audio'],
    instructions: [
      'You are the voice property assistant for Tycoons Investments in Egypt.',
      'Speak naturally in Egyptian Arabic when the user speaks Arabic, otherwise use English.',
      'Keep replies short and practical.',
      'When the user describes a property need, call search_properties with one complete natural-language query.',
      'When the user gives a phone number, repeat it clearly and ask for confirmation before calling save_lead.',
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
      output: { voice: 'marin' }
    },
    tools: [
      {
        type: 'function',
        name: 'search_properties',
        description: 'Search the Tycoons website inventory and show matching property cards on the page.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The complete property search request in the user language.' }
          },
          required: ['query']
        }
      },
      {
        type: 'function',
        name: 'save_lead',
        description: 'Submit a lead only after the user has confirmed the phone number.',
        parameters: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            name: { type: 'string' },
            request: { type: 'string' },
            confirmed: { type: 'boolean' }
          },
          required: ['phone', 'confirmed']
        }
      }
    ],
    tool_choice: 'auto'
  };

  try {
    const fd = new FormData();
    fd.set('sdp', event.body || '');
    fd.set('session', JSON.stringify(session));

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Safety-Identifier': 'tycoons-website-voice'
      },
      body: fd
    });

    const body = await response.text();
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/sdp',
        'Access-Control-Allow-Origin': '*'
      },
      body
    };
  } catch (error) {
    console.error('[Tycoons] OpenAI Realtime call error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create OpenAI Realtime call.' })
    };
  }
};
