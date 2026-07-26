const HOME_LINKS =
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", ' +
  '</llms.txt>; rel="service-doc"; type="text/plain", ' +
  '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"';

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lt: "<",
    nbsp: " ",
    quot: '"',
    raquo: "»",
    rdquo: "”",
  };

  return value
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function htmlToMarkdown(html, sourceUrl) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  let markdown = main
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => {
      return `\n\n${"#".repeat(Number(level))} ${text}\n\n`;
    })
    .replace(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, _quote, href, text) => {
      const resolved = new URL(href, sourceUrl).toString();
      return `[${text}](${resolved})`;
    })
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<(p|div|section|article|header|footer|nav|ul|ol|table|tr)\b[^>]*>/gi, "\n\n")
    .replace(/<\/(p|div|section|article|header|footer|nav|ul|ol|table|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  markdown = decodeEntities(markdown)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `${markdown}\n`;
}

function appendVary(headers, value) {
  const current = headers.get("Vary");
  const values = new Set(
    (current ? current.split(",") : [])
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  values.add(value);
  headers.set("Vary", [...values].join(", "));
}

export default async function markdownForAgents(request, context) {
  const url = new URL(request.url);
  const acceptsMarkdown = request.headers
    .get("Accept")
    ?.split(",")
    .some((entry) => entry.split(";")[0].trim().toLowerCase() === "text/markdown");

  if (!acceptsMarkdown || !["GET", "HEAD"].includes(request.method)) return;

  const response = await context.next();
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  const markdown = htmlToMarkdown(await response.text(), request.url);
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.delete("Content-Encoding");
  headers.delete("Content-Length");
  appendVary(headers, "Accept");
  if (url.pathname === "/" || url.pathname === "/index.html") {
    headers.set("Link", HOME_LINKS);
  }

  return new Response(request.method === "HEAD" ? null : markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const config = { path: "/*" };
