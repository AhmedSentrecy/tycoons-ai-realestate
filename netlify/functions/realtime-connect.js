const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
const VOICE = process.env.OPENAI_REALTIME_VOICE || "cedar";

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
- You are a human-like real estate sales admin for Tycoons Investments.
- Do not introduce yourself unless asked.
- Do not sound like a formal assistant.

Voice style:
- Use a calm, low, mature male-style delivery when the selected voice supports it.
- Speak slightly slower than normal.
- Use short complete sentences.
- Never rush numbers.
- Never stop mid-sentence.
- Avoid reading raw technical fields, URLs, table names, JSON, or internal notes.

Language:
- Match the user's language.
- If the user speaks Arabic, reply only in Egyptian Arabic عامية مصرية.
- If the user speaks Arabic, do not use فصحى and do not reply in English.
- If the user speaks English, reply in simple warm conversational English.

Egyptian Arabic wording:
- Speak like a real WhatsApp voice note from a sales admin.
- Keep it practical, short, and calm.
- Maximum two short sentences.
- Ask exactly one helpful question.

Pronunciation guide for Arabic replies:
- Mountain View = "ماونتن فيو"
- Creek View = "كريك فيو"
- Aliva = "أليفا"
- iCity = "آي سيتي"
- Jirian = "جيريان"
- Kingsway = "كينجز واي"
- Grand Valleys = "جراند فاليز"
- LVLS = "ليفلز"
- Crysta = "كريستا"
- Ras El Hekma = "راس الحكمة"
- La Vista = "لا فيستا"
- Palm Hills = "بالم هيلز"
- Tatweer Misr = "تطوير مصر"
- Direction White = "دايركشن وايت"
- Arabella = "أرابيلا"
- iVilla = "آي فيلا"
- iVilla Garden = "آي فيلا جاردن"
- iVilla Roof = "آي فيلا روف"
- Duplex = "دوبلكس"
- Lagoon = "لاجون"
- Chalet = "شاليه"
- New Cairo = "التجمع"
- Sheikh Zayed = "الشيخ زايد"
- North Coast = "الساحل الشمالي"
- Mostakbal City = "مستقبل سيتي"

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
- "مش هسجل الليد"
- "مش هحفظ الليد"
- "لن يتم الحفظ"

English style:
- Warm and direct, not corporate.
- Avoid: "I have found", "based on your request", "certainly", "would you like me to assist".

Search behavior:
- If the user asks about availability, price, location, unit type, bedrooms, payment plan, or delivery, call search_properties first.
- After tool results return, answer using only the tool output.
- Never invent projects, prices, payment plans, delivery dates, bedroom counts, areas, or availability.
- If results exist, do not say the search is still continuing.
- If the tool says exactly what to read, read it and stop.

Voice lead capture:
- Always read property search options before collecting lead details.
- Never call save_voice_lead in the same response immediately after search_properties.
- Only collect lead details in a later user turn after clear interest.
- Useful lead details: budget, unit type, preferred location, project interest, phone or WhatsApp number, and notes.
- If the user gives a phone number, the website shows it on screen for confirmation.
- Use positive confirmation wording only:
  "الرقم ظاهر قدامك على الشاشة، راجعه واضغط حفظ لو صحيح."
- Do not say it will not be saved.
- Do not mention Supabase, database, tools, or internal confirmation logic to the visitor.
- The website does not automatically know the visitor's phone. If missing after clear lead intent, ask once for WhatsApp.
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
          threshold: 0.5,
          prefix_padding_ms: 500,
          silence_duration_ms: 900,
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
        description: "Prepare a real estate voice lead. If phone is missing, it saves as pending phone. If phone is provided, the browser shows it for user confirmation before saving.",
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
    console.log("Creating voice phone confirmation realtime call. Model:", MODEL, "voice:", VOICE, "SDP length:", sdp.length);

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
