const SUPABASE_URL = "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    ...extra
  };
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

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(String(text || ""));
}

function formatPrice(value) {
  if (!value) return "price on request";
  return new Intl.NumberFormat("en-US").format(Number(value)) + " EGP";
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
    finishing: unit.finishing,
    description: unit.description,
    search_text: unit.search_text
  };
}

function localFallback(query, units) {
  const q = String(query || "").toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = units.map((unit) => {
    const haystack = [
      unit.project_name,
      unit.developer,
      unit.location,
      unit.unit_type,
      unit.bedrooms_text,
      unit.down_payment_text,
      unit.installments_text,
      unit.delivery_text,
      unit.description,
      unit.search_text
    ].filter(Boolean).join(" ").toLowerCase();

    let score = 0;

    terms.forEach((term) => {
      if (term.length > 2 && haystack.includes(term)) score += 1;
    });

    if (q.includes("new cairo") && haystack.includes("new cairo")) score += 5;
    if (q.includes("ain sokhna") && haystack.includes("ain sokhna")) score += 5;
    if (q.includes("apartment") && haystack.includes("apartment")) score += 4;
    if (q.includes("villa") && haystack.includes("villa")) score += 4;
    if (q.includes("ivilla") && haystack.includes("ivilla")) score += 4;
    if (q.includes("garden") && haystack.includes("garden")) score += 3;

    return { ...unit, _score: score };
  }).filter((unit) => unit._score > 0);

  scored.sort((a, b) => b._score - a._score || Number(a.starting_price || 0) - Number(b.starting_price || 0));

  return (scored.length ? scored : units).slice(0, 6);
}

function fallbackAnswer(query, results) {
  const arabic = hasArabic(query);
  const best = results[0];

  if (!best) {
    return arabic
      ? "مش لاقي اختيار مطابق من الداتا الحالية. بتدور في أنهي منطقة؟"
      : "I could not find a close match in the current inventory. Which area are you targeting?";
  }

  if (arabic) {
    return `لقيت اختيار مناسب: ${best.project_name} ${best.unit_type} في ${best.location} بسعر يبدأ من ${formatPrice(best.starting_price)}. ميزانيتك في حدود كام؟`;
  }

  return `I found a strong match: ${best.project_name} ${best.unit_type} in ${best.location}, starting from ${formatPrice(best.starting_price)}. What budget range are you targeting?`;
}

function extractJson(text) {
  const raw = String(text || "").trim();

  try {
    return JSON.parse(raw);
  } catch (_) {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (_) {}
  }

  return null;
}

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
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const query = String(body.query || "").trim();

    if (!query) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing query" })
      };
    }

    const units = await getUnits();
    const userLanguage = hasArabic(query) ? "Egyptian Arabic" : "English";

    if (!process.env.OPENAI_API_KEY) {
      const results = localFallback(query, units);
      await logSearch(query, results.length);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: fallbackAnswer(query, results),
          results,
          mode: "fallback-no-key"
        })
      };
    }

    const prompt = `
You are the AI property search engine for Tycoons Investments.

USER_LANGUAGE: ${userLanguage}
USER_QUERY: ${query}

AVAILABLE_UNITS_JSON:
${JSON.stringify(units.slice(0, 120).map(compactUnit))}

Return valid JSON only. No markdown. No extra text.

Required JSON shape:
{
  "answer": "string",
  "result_ids": ["unit-id-1", "unit-id-2"],
  "reason": "string"
}

Hard rules:
1. Use ONLY the supplied AVAILABLE_UNITS_JSON.
2. Never invent a project, price, location, area, payment plan, delivery date, bedroom count, or availability.
3. Pick up to 6 best matching units.
4. If the user asks in English, the answer MUST be 100% English.
5. If the user asks in Arabic, answer in natural Egyptian Arabic.
6. Do not mix Arabic and English except for project names or unit type names like iVilla, Sky Villa, New Cairo.
7. Keep the answer short: maximum 2 sentences.
8. End with exactly one helpful sales question.
9. No emojis.
10. Do not suggest a call.
11. Mention price/payment only if present in the selected unit data.
12. If there is one strong match, say it clearly.
13. If the match is weak, ask one clarifying question instead of pretending certainty.

Examples:
English answer style:
"I found a strong match: Mountain View Creek View iVilla Garden in New Cairo, starting from 12,900,000 EGP with 6-year installments. What budget range are you targeting?"

Egyptian Arabic answer style:
"لقيت اختيار مناسب: Mountain View Creek View iVilla Garden في New Cairo بسعر يبدأ من 12,900,000 EGP وتقسيط 6 سنين. ميزانيتك في حدود كام؟"
`;

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt
      })
    });

    if (!openaiRes.ok) {
      const details = await openaiRes.text();
      console.error("OpenAI API error:", details);

      const fallback = localFallback(query, units);
      await logSearch(query, fallback.length);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: fallbackAnswer(query, fallback),
          results: fallback,
          mode: "fallback-openai-error"
        })
      };
    }

    const data = await openaiRes.json();

    const outputText =
      data.output_text ||
      (data.output || [])
        .flatMap((item) => item.content || [])
        .map((content) => content.text || content.output_text || "")
        .join("");

    const parsed = extractJson(outputText);
    let selected = [];

    if (parsed && Array.isArray(parsed.result_ids)) {
      const selectedIds = new Set(parsed.result_ids.map(String));
      selected = units.filter((unit) => selectedIds.has(String(unit.id)));
    }

    if (!selected.length) {
      selected = localFallback(query, units);
    }

    await logSearch(query, selected.length);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: parsed?.answer || fallbackAnswer(query, selected),
        results: selected.slice(0, 6),
        mode: "ai"
      })
    };
  } catch (error) {
    console.error("Function error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Server error" })
    };
  }
};
