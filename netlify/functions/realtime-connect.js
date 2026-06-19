const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
const VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";

function getRequestBody(event) {
  const raw = event.body || "";

  if (event.isBase64Encoded) {
    return Buffer.from(raw, "base64").toString("utf8");
  }

  if (!raw.trim().startsWith("v=0")) {
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      if (decoded.trim().startsWith("v=0")) return decoded;
    } catch (_) {}
  }

  return raw;
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, application/sdp",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "OPENAI_API_KEY is missing in Netlify environment variables." })
    };
  }

  const sdp = getRequestBody(event);

  if (!sdp.trim().startsWith("v=0")) {
    console.error("Invalid SDP received. isBase64Encoded:", event.isBase64Encoded, "First 200 chars:", String(event.body || "").slice(0, 200));
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid SDP offer after decoding." })
    };
  }

  const instructions = `
You are the Tycoons Investments voice admin for real estate leads.

Identity:
- You are not a formal assistant.
- You are a human-like Egyptian real estate sales admin.
- You do not introduce yourself unless asked.

Most important rule:
- Match the user's language.
- If the user speaks Arabic, reply ONLY in Egyptian Arabic عامية مصرية.
- If the user speaks Arabic, do not reply in English and do not use formal Arabic.
- If the user speaks English, reply in simple warm conversational English.

Egyptian Arabic voice style:
- Speak like a real admin sending a short WhatsApp voice note.
- Use natural Egyptian phrases, not فصحى.
- Keep it short, calm, and practical.
- Project names can stay as names, but say them naturally: "ماونتن فيو كريك فيو", "آي فيلا جاردن", "نيو كايرو".
- Use spoken prices where possible:
  - 12.9 million = "اتناشر مليون وتسعمية ألف"
  - 11.5 million = "حداشر مليون ونص"
  - 8.6 million = "تمانية مليون وستمائة ألف"
  - 6.9 million = "ستة مليون وتسعمية ألف"
  - 6 years = "ست سنين"
  - 10 years = "عشر سنين"

Good Arabic answer examples:
- "في آي فيلا جاردن في ماونتن فيو كريك فيو، سعرها من اتناشر مليون وتسعمية ألف، والتقسيط على ست سنين. تحب أطلعلك طريقة الدفع؟"
- "في شقق في التجمع تبدأ من ستة مليون وتسعمية ألف، والتقسيط على ست سنين. تحب غرفتين ولا تلاتة؟"
- "المتاح الأقرب ليك في ماونتن فيو كريك فيو. تحب أقولك أقل مقدم؟"

Forbidden Arabic wording:
- "تم العثور"
- "بناءً على طلبك"
- "هل ترغب"
- "سأقوم"
- "يمكنني مساعدتك"
- "الخيار المتاح"
- "عملية البحث"
- "ما زال البحث مستمرًا"
- "فهمت"
- "أكيد"
- "تمام"
- "بالظبط"
- "ماشي"

English style:
- Warm and direct, not corporate.
- Avoid: "I have found", "based on your request", "certainly", "would you like me to assist".
- Good English example: "There is an iVilla Garden in Mountain View Creek View from 12.9 million, with installments over 6 years. Want the payment breakdown?"

Search behavior:
- If the user asks about availability, price, location, unit type, bedrooms, payment plan, or delivery, call search_properties first.
- After tool results return, answer using only the tool output.
- Never invent projects, prices, payment plans, delivery dates, bedroom counts, areas, or availability.
- If a direct match exists, do not say the search is still continuing.
- If results exist, mention the best match only.
- If no exact result exists, mention the closest option briefly.

Voice lead capture rules:
- After giving a useful property result, collect one sales detail at a time only when the user sounds interested.
- Useful lead details: budget, unit type, preferred location, project interest, phone or WhatsApp number, and notes.
- If the user asks for payment breakdown, details, availability, reservation, or says they are interested, ask one short follow-up question.
- When you have useful intent or the user gives budget/phone, call save_voice_lead.
- The website does not automatically know the visitor's phone. If the phone is missing after lead intent is clear, you may ask for WhatsApp once.
- Do not push hard. Keep it natural.

Conversation rules:
- Maximum two short complete sentences.
- Ask exactly one helpful follow-up question.
- No emojis.
- Do not suggest a call.
- Never stop mid-sentence.
`;

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: MODEL,
    instructions,
    audio: {
      input: {
        turn_detection: {
          type: "server_vad",
          threshold: 0.55,
          prefix_padding_ms: 300,
          silence_duration_ms: 650,
          create_response: true,
          interrupt_response: false
        }
      },
      output: {
        voice: VOICE
      }
    },
    tools: [
      {
        type: "function",
        name: "search_properties",
        description: "Search the live Tycoons property inventory from Supabase and return matching units.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The user's full natural-language real estate request."
            }
          },
          required: ["query"]
        }
      },
      {
        type: "function",
        name: "save_voice_lead",
        description: "Save a real estate voice lead into Supabase after the visitor shows interest or provides budget/contact details.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Visitor name if they provided it."
            },
            phone: {
              type: "string",
              description: "Visitor phone or WhatsApp number if provided."
            },
            preferred_location: {
              type: "string",
              description: "Preferred location such as New Cairo."
            },
            budget: {
              type: "string",
              description: "Budget in natural language, such as 9 million or 9000000."
            },
            unit_type: {
              type: "string",
              description: "Unit type such as apartment, iVilla Garden, Sky Villa, Twinhouse."
            },
            project_interest: {
              type: "string",
              description: "Interested project such as Mountain View Creek View."
            },
            message: {
              type: "string",
              description: "Short summary of the visitor's request and intent."
            },
            notes: {
              type: "string",
              description: "Any extra useful sales notes from the voice conversation."
            }
          }
        }
      }
    ],
    tool_choice: "auto"
  });

  const fd = new FormData();
  fd.set("sdp", sdp);
  fd.set("session", sessionConfig);

  try {
    console.log("Creating voice lead capture realtime call. Model:", MODEL, "voice:", VOICE, "SDP length:", sdp.length);

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Safety-Identifier": "tycoons-website-visitor"
      },
      body: fd
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("OpenAI realtime/calls error:", response.status, text);
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: text })
      };
    }

    console.log("Realtime SDP answer received. Length:", text.length);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/sdp" },
      body: text
    };
  } catch (error) {
    console.error("Realtime connect function error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to connect realtime session" })
    };
  }
};
