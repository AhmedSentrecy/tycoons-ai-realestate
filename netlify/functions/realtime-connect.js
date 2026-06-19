const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
const VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";

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

  const sdp = event.body || "";

  if (!sdp.includes("v=0")) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid SDP offer." })
    };
  }

  const instructions = `
You are Tycoons Investments real estate voice assistant.

Use the search_properties tool before answering any question about property availability, price, location, payment plan, or unit type.
Never invent projects, prices, delivery dates, payment plans, bedroom counts, or availability.
If the user speaks Arabic, reply in natural Egyptian Arabic.
If the user speaks English, reply in English.
Keep spoken answers short and ask one helpful follow-up question.
No emojis. Do not suggest a call.
`;

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: MODEL,
    instructions,
    audio: {
      output: { voice: VOICE }
    },
    tools: [
      {
        type: "function",
        name: "search_properties",
        description: "Search the live Tycoons property inventory for matching real estate units.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The user's full natural-language property request."
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
      console.error("OpenAI realtime/calls error:", text);
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: text })
      };
    }

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
