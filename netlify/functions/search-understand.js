// Smart search: OpenAI reads the buyer's free text (Egyptian Arabic or English) and returns
// a clean search query plus what the buyer is asking about. It never sees or returns units:
// the site's own search still finds the real inventory, so no unit or price can be invented.
// If OpenAI is missing, slow or fails, the site falls back to its normal search.

const QUESTIONS = ["rent", "yield", "price", "payment", "delivery", "none"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["search_query", "question", "bedrooms", "furnished"],
  properties: {
    search_query: { type: "string" },
    question: { type: "string", enum: QUESTIONS },
    bedrooms: { type: ["integer", "null"] },
    furnished: { type: ["boolean", "null"] },
  },
};

const SYSTEM = [
  "You turn a real estate buyer's search text for Egypt into a short search query for a keyword search engine.",
  "Keep only property criteria the buyer actually wrote: project name, developer, area or city, unit type, bedrooms, size, budget, down payment, installment years, delivery, finishing.",
  "Write project and developer names in their usual Arabic spelling and fix obvious misspellings (اى سيتى → آي سيتي, ماونتن فيو, سوديك, بالم هيلز).",
  "Keep numbers and their meaning exactly (تحت 10 مليون, مقدم 5%, تقسيط 8 سنين).",
  "Remove question words and the topic of the question: كام, بكام, إيه, ازاي, الإيجار, العائد, السعر, rent, yield, price, how much.",
  "Never add a project, area, number or criterion the buyer did not write. If the text has no property criteria, return it unchanged.",
  "question: rent if they ask about rent; yield for return or ROI; price for prices; payment for down payment, installments or payment plans; delivery for handover; otherwise none.",
  "bedrooms: the number of bedrooms if written, else null. furnished: true or false only if written, else null.",
  "Examples: «الايجار فى اى سيتى التجمع كام» → search_query «آي سيتي التجمع», question rent.",
  "«شقة 3 غرف في التجمع تحت 10 مليون» → search_query «شقة 3 غرف في التجمع تحت 10 مليون», question none, bedrooms 3.",
  "«نظام السداد في ماونتن فيو اي سيتي» → search_query «ماونتن فيو آي سيتي», question payment.",
].join("\n");

const cache = new Map();
const CACHE_LIMIT = 500;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function cleanResult(output, original) {
  const searchQuery = String(output?.search_query || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const question = QUESTIONS.includes(output?.question) ? output.question : "none";
  const bedrooms = Number.isInteger(output?.bedrooms) && output.bedrooms > 0 && output.bedrooms < 10 ? output.bedrooms : null;
  const furnished = typeof output?.furnished === "boolean" ? output.furnished : null;
  return { search_query: searchQuery.length >= 2 ? searchQuery : original, question, bedrooms, furnished };
}

export async function understand(query, env = process.env, fetchImpl = fetch) {
  const model = env.SEARCH_OPENAI_MODEL || "gpt-5-mini";
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ role: "system", content: SYSTEM }, { role: "user", content: query }],
      text: { format: { type: "json_schema", name: "search_understanding", strict: true, schema: SCHEMA } },
      reasoning: { effort: "minimal" },
      max_output_tokens: 400,
    }),
    signal: AbortSignal.timeout(6000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(data?.error?.message || `openai_${response.status}`).slice(0, 200));
  const text = data.output_text || (data.output || []).flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  return cleanResult(JSON.parse(text || "{}"), query);
}

export default async function searchUnderstand(request) {
  if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  const body = await request.json().catch(() => ({}));
  const query = String(body?.query || "").replace(/\s+/g, " ").trim();
  if (query.length < 2 || query.length > 200) return json(400, { ok: false, error: "bad_query" });
  if (!process.env.OPENAI_API_KEY) return json(200, { ok: false, error: "not_configured" });

  const key = query.toLowerCase();
  if (cache.has(key)) return json(200, { ok: true, cached: true, ...cache.get(key) });
  try {
    const result = await understand(query);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return json(200, { ok: true, ...result });
  } catch (error) {
    console.warn("search-understand failed", String(error?.message || error).slice(0, 200));
    return json(200, { ok: false, error: "unavailable" });
  }
}

export const config = {
  path: "/api/search-understand",
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
