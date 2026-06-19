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
    console.error("Invalid SDP received. First 200 chars:", sdp.slice(0, 200));
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid SDP offer." })
    };
  }

  // Minimal stability test session.
  // This intentionally removes tools/function-calling so we can confirm
  // the raw OpenAI Realtime WebRTC session stays open first.
  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: MODEL,
    instructions: "You are a short voice test agent for Tycoons Investments. Reply briefly. If the user asks about property data, say: I am connected, and the inventory search tool will be added next.",
    audio: {
      output: {
        voice: VOICE
      }
    }
  });

  const fd = new FormData();
  fd.set("sdp", sdp);
  fd.set("session", sessionConfig);

  try {
    console.log("Creating minimal realtime call with model:", MODEL, "voice:", VOICE);

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
