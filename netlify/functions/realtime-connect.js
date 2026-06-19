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
You are Tycoons Investments real estate voice assistant.

Push-to-talk rules:
- The user will only speak while holding the push-to-talk button.
- Do not respond until the user finishes their turn.
- Never say the search is still continuing if tool results were provided.
- If tool results are provided, immediately summarize the best matching unit.

Main behavior:
- Speak naturally and briefly, but always complete your sentence.
- If the user asks about property availability, price, location, unit type, bedrooms, payment plan, or delivery, you MUST call the search_properties tool first.
- After the tool returns results, answer using only the tool output.
- Do not invent projects, prices, payment plans, delivery dates, bedroom counts, areas, or availability.
- If the user speaks Arabic, reply in natural Egyptian Arabic.
- If the user speaks English, reply in English.
- Ask exactly one helpful follow-up question.
- No emojis.
- Do not suggest a call.
- Keep replies to two complete sentences maximum.
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
      }
    ],
    tool_choice: "auto"
  });

  const fd = new FormData();
  fd.set("sdp", sdp);
  fd.set("session", sessionConfig);

  try {
    console.log("Creating push-to-talk realtime call. Model:", MODEL, "voice:", VOICE, "SDP length:", sdp.length);

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
