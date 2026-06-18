const SUPABASE_URL = "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";

function headers(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", ...extra };
}

async function getUnits() {
  const url = SUPABASE_URL + "/rest/v1/units?select=*&availability_status=eq.available&order=starting_price.asc";
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error("Supabase units error: " + await res.text());
  return res.json();
}

async function logSearch(query, matched) {
  try {
    await fetch(SUPABASE_URL + "/rest/v1/search_logs", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ query, matched_results: matched })
    });
  } catch (error) {
    console.warn("Search log failed", error);
  }
}

function localFallback(query, units) {
  const q = String(query || "").toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = units.map((unit) => {
    const haystack = [unit.project_name, unit.developer, unit.location, unit.unit_type, unit.bedrooms_text, unit.down_payment_text, unit.installments_text, unit.delivery_text, unit.description, unit.search_text].filter(Boolean).join(" ").toLowerCase();
    let score = 0;
    terms.forEach((term) => { if (term.length > 2 && haystack.includes(term)) score += 1; });
    return { ...unit, _score: score };
  }).filter((unit) => unit._score > 0);
  scored.sort((a, b) => b._score - a._score || Number(a.starting_price || 0) - Number(b.starting_price || 0));
  return (scored.length ? scored : units).slice(0, 6);
}

function extractJson(text) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch (_) {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

function compactUnit(unit) {
  return {
    id: unit.id,
    project_name: unit.project_name,
    developer: unit.developer,
    location: unit.location,
    unit_type: unit.unit_type,
    bedrooms_text: unit.bedrooms_text,
    area_sqm: unit.area_sqm,
    starting_price: unit.starting_price,
    down_payment_text: unit.down_payment_text,
    installments_text: unit.installments_text,
    delivery_text: unit.delivery_text,
    description: unit.description,
    search_text: unit.search_text
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const body = JSON.parse(event.body || "{}");
    const query = String(body.query || "").trim();
    if (!query) return { statusCode: 400, body: JSON.stringify({ error: "Missing query" }) };

    const units = await getUnits();
    if (!process.env.OPENAI_API_KEY) {
      const results = localFallback(query, units);
      await logSearch(query, results.length);
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: "OpenAI key is not available to the function yet. I used basic inventory search.", results, mode: "fallback-no-key" }) };
    }

    const unitList = units.slice(0, 80).map(compactUnit);
    const prompt = `You are the AI property search engine for Tycoons Investments.
You must choose only from the supplied units. Never invent projects, prices, areas, payment plans, or delivery dates.
User query: ${query}

Available units JSON:
${JSON.stringify(unitList)}

Return JSON only with this exact shape:
{
  "answer": "short helpful answer in the same language as the user. If Arabic, use Egyptian Arabic.",
  "result_ids": ["unit id 1", "unit id 2"],
  "reason": "brief reason"
}

Rules:
- Choose up to 6 best matching units.
- Match location, budget, unit type, bedrooms, down payment, installments, and delivery if mentioned.
- If the user asks Arabic, answer in Egyptian Arabic.
- Keep the answer concise and sales-friendly.`;

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: prompt })
    });

    if (!openaiRes.ok) {
      const details = await openaiRes.text();
      const fallback = localFallback(query, units);
      await logSearch(query, fallback.length);
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: "AI search had an API issue, so I used basic inventory search instead.", results: fallback, mode: "fallback-openai-error", details }) };
    }

    const data = await openaiRes.json();
    const outputText = data.output_text || (data.output || []).flatMap((item) => item.content || []).map((content) => content.text || content.output_text || "").join("");
    const parsed = extractJson(outputText);
    let selected = [];
    if (parsed && Array.isArray(parsed.result_ids)) {
      const idSet = new Set(parsed.result_ids);
      selected = units.filter((unit) => idSet.has(unit.id));
    }
    if (!selected.length) selected = localFallback(query, units);
    await logSearch(query, selected.length);

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: parsed?.answer || "I found the closest matching properties from your live inventory.", results: selected.slice(0, 6), mode: "ai" }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: error.message || "Server error" }) };
  }
};
