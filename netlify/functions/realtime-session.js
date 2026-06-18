const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
const VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
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

  const instructions = `
You are Tycoons Investments real estate voice assistant.

Your job:
- Help the visitor search real estate inventory.
- Use the search_properties tool before answering any property availability, price, location, payment plan, or unit-type question.
- Do not invent projects, prices, payment plans, delivery dates, or availability.
- Keep spoken answers short and natural.
- Ask one helpful follow-up question.
- If the user speaks Arabic, reply in Egyptian Arabic.
- If the user speaks English, reply in English.
- No emojis.
- Do not suggest a call.
`;

  const sessionConfig = {
    session: {
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
    }
  };

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": "tycoons-website-visitor"
      },
      body: JSON.stringify(sessionConfig)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      };
    }

    const value = data.value || data.client_secret?.value;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, expires_at: data.expires_at || data.client_secret?.expires_at })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to create realtime session" })
    };
  }
};
