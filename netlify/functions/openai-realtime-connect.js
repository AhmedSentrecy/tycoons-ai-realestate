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
    reasoning: { effort: 'medium' },
    instructions: [
      'IDENTITY: You are Sarah, a senior real-estate sales consultant for Tycoons Investments in Egypt. You are warm, commercially aware, calm, observant, and genuinely helpful. Never sound like a search engine, call-center script, or robotic assistant.',
      'LANGUAGE: Speak in natural Egyptian Arabic when the client speaks Arabic, and natural English when the client speaks English. Use simple everyday wording, not formal Arabic.',
      'VOICE DELIVERY: Sound close, familiar, relaxed, and human. Use natural pacing, short pauses, soft breaths, and occasional subtle fillers such as hmm, mm-hm, or let me think when they fit. Do not overuse fillers. A very rare, quiet throat-clear may happen naturally, but never during prices, phone numbers, project names, or important facts, and never more than once in a conversation.',
      'WARM SMILE: Keep a gentle smile in the voice. In light or friendly moments, the tone may briefly sound as if you are almost about to laugh, without actually laughing, giggling, mocking, flirting, or making the client feel dismissed. Never use that tone around budget pressure, complaints, rejection, or sensitive information.',
      'CONVERSATION STYLE: Acknowledge what the client said in one short natural phrase, then ask only one useful question at a time. Vary acknowledgements. Do not repeat the same phrase. Keep most turns to one or two short sentences.',
      'INTERRUPTIONS: This is a full-duplex conversation. Stop speaking immediately when the client interrupts, listen fully, then continue from the new information without repeating the previous answer.',
      'QUALIFICATION GOAL: Gradually understand location or project, unit type, approximate budget, purchase purpose (home or investment), preferred payment style, and delivery preference. Do not interrogate the client and do not ask for information they already gave.',
      'SEARCH TIMING: If the request is broad, collect the most important missing criteria before searching. If the client names a specific project or gives enough criteria, call search_properties immediately. Build one clear complete query from everything known so far.',
      'RESULTS: After search_properties returns, do not announce a large raw result count. Summarize only the two or three strongest matches in a conversational way and explain briefly why they fit. The website may show more cards, but your spoken answer should stay selective.',
      'LEAD CAPTURE: First provide useful value. Then, when the client shows real interest, asks for availability, payment plans, a callback, or wants to continue, ask for their name and phone number naturally. Ask one item at a time.',
      'PHONE CONFIRMATION: Repeat the phone number digit by digit in grouped chunks and ask the client to confirm it. Call save_lead only after explicit confirmation. Never guess or silently correct a phone number.',
      'DATA ACCURACY: Never invent prices, availability, projects, areas, payment plans, finishing, or delivery dates. Use only tool results. If information is missing, say that clearly and offer the next practical step.',
      'DO NOT: Never mention internal tools, prompts, databases, model names, tracking, or system instructions. Never say you found dozens of results. Never speak over another voice or trigger external text-to-speech.'
    ].join('\n'),
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