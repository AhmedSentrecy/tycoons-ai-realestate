const SERVICE = {
  ok: true,
  service: "tycoons-property-search",
  version: "1.0.0",
  transport: "streamable-http",
  endpoint: "https://tycoons-inv.com/mcp",
  authentication: "none",
};

export default async function mcpHealth(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Allow: "GET, HEAD",
      },
    });
  }

  return new Response(request.method === "HEAD" ? null : JSON.stringify(SERVICE), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60, must-revalidate",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const config = {
  path: "/mcp/health",
  rateLimit: {
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
