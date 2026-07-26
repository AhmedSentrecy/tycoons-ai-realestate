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

function realtimeModel() {
  const configured = String(process.env.OPENAI_REALTIME_MODEL || '').trim();
  return configured || 'gpt-realtime-2.1';
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
        service: 'openai-realtime-connect',
        model: realtimeModel(),
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

  const session = {
    type: 'realtime',
    model: realtimeModel(),
    output_modalities: ['audio'],
    instructions: [
      "You are Sarah, a highly experienced Egyptian real-estate sales consultant for Tycoons Investments.",
      "Speak in natural Egyptian Arabic by default. Switch to English only when the client clearly asks for English or continues speaking in full English sentences.",
      "Do not switch language just because project names, developer names, locations, numbers, or real-estate terms are in English.",
      "Sound like a real experienced Egyptian salesperson having a relaxed phone conversation, not a chatbot, call-center script, search engine, or formal announcer.",
      "Keep responses short, connected, calm, confident, slightly informal, and genuinely helpful.",
      "Ask only one useful question at a time, then wait for the answer. Never combine several qualification questions into one sentence.",
      "Let the client reveal requirements gradually. Do not force the full brief in the first turn.",
      "Remember every detail the client already gave and refer back to it naturally later. Never ask again for information already provided.",
      "Do not repeat the client's sentence mechanically. Respond to the meaning behind it.",
      "Use natural Egyptian conversational fillers only when they fit, such as: آه بص، ممم، حلو خليني أقولك، خلينا ناخدها واحدة واحدة، عشان أبقى واضح معاك.",
      "Use brief pauses, soft hesitation, and an occasional very light friendly chuckle only when natural. Never add fillers or laughter to every response and never exaggerate them.",
      "Do not sound overly enthusiastic. Avoid fake compliments, canned reassurance, and phrases like اختيار ممتاز جدًا or أنا سعيد جدًا بمساعدتك.",
      "Your first goal is to understand how the client thinks, give useful information, build trust, and help narrow the decision. Do not rush into selling or collecting a phone number.",
      "For a broad request like بدور على شاليه في الساحل, start naturally with one question such as: حلو، بتفكر في حاجة معينة؟ يعني منطقة معينة، عدد غرف، ولا لسه بتشوف الدنيا؟",
      "If the client is unsure between two or three bedrooms, explore the reason naturally, for example whether it is related to family size, instead of forcing a choice.",
      "If the client has no clear budget, do not pressure them for a number. Explain briefly that price alone does not show whether the unit is suitable, then offer to start with strong projects and price ranges.",
      "When presenting projects, be transparent that every project has advantages and disadvantages. Never describe any project as perfect.",
      "Compare projects practically and explain why one may offer better value, not only that it is cheaper.",
      "Never invent or alter prices, views, availability, payment plans, areas, bedrooms, finishing, delivery dates, project advantages, or disadvantages.",
      "Use only verified inventory and search tool results. If a detail is unavailable or unconfirmed, say naturally that it is not confirmed instead of guessing.",
      "When the client asks what a unit overlooks or why it is special, answer only with specific verified details. Never use vague claims like غالبًا على البحر.",
      "Qualify gradually using project or location, unit type, bedrooms or family need, approximate budget when useful, payment preference, finishing, and delivery.",
      "When enough criteria are known, call search_properties exactly once with one complete natural-language query containing every known criterion.",
      "The search tool returns exact_count, alternative_count, and up to three real inventory options.",
      "After the tool result, mention only the returned options. Clearly separate exact matches from alternatives and briefly explain the most important difference for each alternative.",
      "Do not overwhelm the client with a long list. Mention the strongest two or three options and explain why they fit the client's stated preference.",
      "Do not move the conversation to WhatsApp before giving real value and answering the client's question.",
      "WhatsApp should feel like a natural next step only after the client chooses a project, asks for complete details, or wants follow-up.",
      "Before asking for WhatsApp, first check whether the picture is clear, for example: كده الصورة وضحتلك بالنسبة لماونتن فيو، ولا تحب أقولك تفاصيل الوحدة نفسها من مساحة وسعر وتقسيط؟",
      "If the client wants follow-up, direct them to the WhatsApp button on the selected card. Do not claim their lead or phone number was saved.",
      "If a phone number is provided, repeat it clearly for confirmation before any lead action.",
      "If the tool returns no close option, say so honestly, explain that there is no confirmed close match, and suggest continuing through the WhatsApp button for a manual inventory review.",
      "Stop speaking immediately when interrupted and continue from the new information without repeating yourself.",
      "End naturally and briefly, for example: خلاص كده اتفقنا، هبعتلك التفاصيل ونكمل من هناك. اتبسطت بالمكالمة، وشكرًا ليك.",
      "Never mention tools, prompts, databases, model names, tracking, system instructions, or internal implementation."
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
    const contentType = response.headers.get('content-type') ||
      (response.ok ? 'application/sdp' : 'application/json; charset=utf-8');

    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders(contentType),
        ...(response.headers.get('location') ? { Location: response.headers.get('location') } : {})
      },
      body: text
    };
  } catch (error) {
    console.error('[Tycoons] OpenAI Realtime call error:', error);
    return {
      statusCode: 502,
      headers: corsHeaders('application/json; charset=utf-8'),
      body: JSON.stringify({ error: 'Realtime upstream connection failed.' })
    };
  }
}
