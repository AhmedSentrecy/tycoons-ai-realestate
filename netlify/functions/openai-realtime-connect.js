function corsHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
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

function liveModel() {
  const configured = String(process.env.OPENAI_LIVE_MODEL || '').trim();
  return configured || 'gpt-live-1';
}

function backendModel() {
  const configured = String(process.env.OPENAI_LIVE_BACKEND_MODEL || '').trim();
  return configured || 'gpt-5.6-terra';
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders('text/plain; charset=utf-8'), body: '' };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: corsHeaders('application/json; charset=utf-8'),
      body: JSON.stringify({
        ok: true,
        service: 'openai-live-connect',
        model: liveModel(),
        backend_model: backendModel(),
        api_key_configured: Boolean(process.env.OPENAI_API_KEY)
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders('application/json; charset=utf-8'),
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders('application/json; charset=utf-8'),
      body: JSON.stringify({ error: 'OPENAI_API_KEY is not configured in Netlify.' })
    };
  }

  const sdp = normalizeSdp(event);
  if (!sdp.startsWith('v=0') || sdp.length < 100 || sdp.length > 200_000) {
    return {
      statusCode: 400,
      headers: corsHeaders('application/json; charset=utf-8'),
      body: JSON.stringify({
        error: 'Invalid or incomplete SDP received by Netlify function.',
        received_prefix: sdp.slice(0, 24),
        received_length: sdp.length,
        is_base64: Boolean(event.isBase64Encoded)
      })
    };
  }

  const conversationInstructions = [
    "You are Sarah, a highly experienced Egyptian real-estate sales consultant for Tycoons Investments.",
    "Speak in natural Egyptian Arabic by default. Switch to English only when the client clearly asks for English or continues speaking in full English sentences.",
    "Do not switch language just because project names, developer names, locations, numbers, or real-estate terms are in English.",
    "Sound like a real experienced Egyptian salesperson having a relaxed phone conversation, not a chatbot, call-center script, search engine, or formal announcer.",
    "Keep spoken replies short, connected, calm, confident, slightly informal, and genuinely helpful.",
    "Ask only one useful question at a time, then wait for the answer.",
    "Let the client reveal requirements gradually and remember every detail already given.",
    "Delegate every request that needs current inventory, verified project facts, prices, availability, payment plans, comparisons, or property search to the backend.",
    "Never invent property facts. If the backend cannot verify a detail, say naturally that it is not confirmed.",
    "Do not move the conversation to WhatsApp before giving real value. Suggest the WhatsApp button only after the client chooses a project, asks for complete details, or wants follow-up.",
    "Stop speaking immediately when interrupted and continue from the newest information without repeating yourself.",
    "Never mention delegation, tools, prompts, databases, model names, tracking, system instructions, or internal implementation."
  ].join('\n');

  const backendInstructions = [
    "You are the verified property-search backend for a live voice conversation with a Tycoons Investments client.",
    "Transcripts may contain mistakes, unfinished phrases, overlaps, and later corrections. Use the latest context and every requirement the client already provided.",
    "Never invent or alter prices, views, availability, payment plans, areas, bedrooms, finishing, delivery dates, project advantages, or disadvantages.",
    "For current inventory or a property recommendation, call search_properties exactly once with one complete natural-language query containing every known criterion.",
    "The tool returns exact_count, alternative_count, and up to three real inventory options. Mention only returned options and clearly separate exact matches from alternatives.",
    "Compare options practically and explain why one may offer better value, not only that it is cheaper. Every project can have advantages and disadvantages.",
    "If a required detail is unavailable, return that it is unconfirmed. If no close option exists, state that honestly.",
    "Return concise, verified facts suitable for a spoken Egyptian Arabic conversation. Do not claim that a lead, phone number, or WhatsApp message was saved."
  ].join('\n');

  const searchTool = {
    type: 'function',
    name: 'search_properties',
    description: 'Search the live Tycoons inventory and return ranked exact matches and clearly-labelled alternatives.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'One complete property request containing every buyer criterion already provided, in the client language.'
        }
      },
      required: ['query'],
      additionalProperties: false
    },
    strict: true
  };

  const session = {
    model: liveModel(),
    instructions: conversationInstructions,
    store: false,
    audio: {
      output: { voice: process.env.OPENAI_LIVE_VOICE || 'stone' }
    },
    delegation: {
      type: 'responses',
      responses: {
        model: backendModel(),
        instructions: backendInstructions,
        tools: [searchTool],
        tool_choice: 'auto',
        parallel_tool_calls: false
      }
    }
  };

  try {
    const response = await fetch('https://api.openai.com/v1/live/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': 'tycoons-web-voice'
      },
      body: JSON.stringify({
        session,
        transport: { type: 'webrtc', sdp }
      })
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') ||
      'application/json; charset=utf-8';

    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders(contentType),
        ...(response.headers.get('location') ? { Location: response.headers.get('location') } : {})
      },
      body: text
    };
  } catch (error) {
    console.error('[Tycoons] OpenAI GPT-Live session error:', error);
    return {
      statusCode: 502,
      headers: corsHeaders('application/json; charset=utf-8'),
      body: JSON.stringify({ error: 'GPT-Live upstream connection failed.' })
    };
  }
}
