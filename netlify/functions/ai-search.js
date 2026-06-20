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

function normalizeSearchText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠۰]/g, "0")
    .replace(/[١۱]/g, "1")
    .replace(/[٢۲]/g, "2")
    .replace(/[٣۳]/g, "3")
    .replace(/[٤۴]/g, "4")
    .replace(/[٥۵]/g, "5")
    .replace(/[٦۶]/g, "6")
    .replace(/[٧۷]/g, "7")
    .replace(/[٨۸]/g, "8")
    .replace(/[٩۹]/g, "9")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandSearchText(text) {
  let q = normalizeSearchText(text);
  const aliases = [];

  const hasAny = (...patterns) => patterns.some((pattern) => q.includes(normalizeSearchText(pattern)));

  if (hasAny("i villa", "ivilla", "i-villa", "اي فيلا", "اى فيلا", "آي فيلا")) {
    aliases.push(
      "i villa ivilla i-villa اي فيلا اى فيلا آي فيلا",
      "duplex دوبلكس garden duplex roof duplex lagoon duplex",
      "garden duplex جاردن دوبلكس roof duplex روف دوبلكس lagoon duplex لاجون دوبلكس"
    );
  }

  if (hasAny("i villa garden", "ivilla garden", "اي فيلا جاردن", "garden duplex", "جاردن دوبلكس")) {
    aliases.push("i villa garden ivilla garden garden duplex جاردن دوبلكس garden");
  }

  if (hasAny("i villa roof", "ivilla roof", "اي فيلا روف", "roof duplex", "روف دوبلكس")) {
    aliases.push("i villa roof ivilla roof roof duplex روف دوبلكس roof");
  }

  if (hasAny("lagoon", "لاجون", "lagoon duplex", "lagoon apartment")) {
    aliases.push("lagoon لاجون lagoon duplex lagoon apartment beach house beachfront apartment");
  }

  if (hasAny("duplex", "دوبلكس")) {
    aliases.push("duplex دوبلكس i villa ivilla i-villa اي فيلا garden duplex roof duplex lagoon duplex");
  }

  if (hasAny("villa", "فيلا")) {
    aliases.push("villa فيلا standalone villa twinhouse townhouse i villa ivilla duplex");
  }

  if (hasAny("new cairo", "tagamoa", "tagamo3", "التجمع", "التجمع الخامس")) {
    aliases.push("new cairo التجمع التجمع الخامس tagamoa tagamo3 fifth settlement");
  }

  if (hasAny("sheikh zayed", "zayed", "زايد", "الشيخ زايد")) {
    aliases.push("sheikh zayed zayed زايد الشيخ زايد new zayed");
  }

  if (hasAny("north coast", "sahel", "الساحل", "الساحل الشمالي")) {
    aliases.push("north coast الساحل الساحل الشمالي sahel");
  }

  if (hasAny("mostakbal", "مستقبل", "المستقبل")) {
    aliases.push("mostakbal city مستقبل المستقبل");
  }

  if (aliases.length) q += " " + aliases.join(" ");
  return normalizeSearchText(q);
}

function buildHaystack(unit) {
  return expandSearchText([
    unit.project_name,
    unit.developer,
    unit.location,
    unit.unit_type,
    unit.bedrooms_text,
    unit.area_sqm,
    unit.starting_price,
    unit.down_payment_text,
    unit.installments_text,
    unit.delivery_text,
    unit.finishing,
    unit.availability_status,
    unit.description,
    unit.search_text
  ].filter(Boolean).join(" "));
}

function scoreUnit(query, unit) {
  const q = expandSearchText(query);
  const haystack = buildHaystack(unit);
  const terms = q.split(/\s+/).filter((term) => term.length > 1);
  let score = 0;

  for (const term of terms) {
    if (haystack.includes(term)) score += term.length > 3 ? 2 : 1;
  }

  const rawQuery = normalizeSearchText(query);

  if (
    /\b(i\s*villa|ivilla|i\s+villa)\b/.test(rawQuery) ||
    rawQuery.includes("اي فيلا") ||
    rawQuery.includes("اى فيلا")
  ) {
    if (haystack.includes("ivilla") || haystack.includes("i villa") || haystack.includes("اي فيلا")) score += 30;
    if (haystack.includes("duplex") || haystack.includes("دوبلكس")) score += 20;
    if (haystack.includes("standalone villa")) score -= 8;
  }

  if (rawQuery.includes("garden") || rawQuery.includes("جاردن")) {
    if (haystack.includes("garden duplex") || haystack.includes("جاردن دوبلكس")) score += 15;
    if (haystack.includes("garden apartment")) score += 8;
  }

  if (rawQuery.includes("roof") || rawQuery.includes("روف")) {
    if (haystack.includes("roof duplex") || haystack.includes("روف دوبلكس")) score += 15;
  }

  if (rawQuery.includes("lagoon") || rawQuery.includes("لاجون")) {
    if (haystack.includes("lagoon duplex") || haystack.includes("lagoon apartment") || haystack.includes("لاجون")) score += 15;
  }

  if (rawQuery.includes("new cairo") || rawQuery.includes("التجمع")) {
    if (haystack.includes("new cairo") || haystack.includes("التجمع")) score += 12;
  }

  if (rawQuery.includes("sheikh zayed") || rawQuery.includes("زايد")) {
    if (haystack.includes("sheikh zayed") || haystack.includes("زايد")) score += 12;
  }

  if (rawQuery.includes("north coast") || rawQuery.includes("الساحل")) {
    if (haystack.includes("north coast") || haystack.includes("الساحل")) score += 12;
  }

  if (rawQuery.includes("apartment") || rawQuery.includes("شقه") || rawQuery.includes("شقة")) {
    if (haystack.includes("apartment")) score += 10;
  }

  if (rawQuery.includes("chalet") || rawQuery.includes("شاليه")) {
    if (haystack.includes("chalet")) score += 10;
  }

  return score;
}

function rankUnits(query, units, limit = 6) {
  const scored = units
    .map((unit) => ({ ...unit, _score: scoreUnit(query, unit) }))
    .filter((unit) => unit._score > 0)
    .sort((a, b) => b._score - a._score || Number(a.starting_price || 0) - Number(b.starting_price || 0));

  return (scored.length ? scored : units).slice(0, limit);
}

function localFallback(query, units) {
  return rankUnits(query, units, 6);
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
    const expandedQuery = expandSearchText(query);
    const candidateUnits = rankUnits(query, units, 120);

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
NORMALIZED_EXPANDED_QUERY: ${expandedQuery}

AVAILABLE_UNITS_JSON:
${JSON.stringify(candidateUnits.map(compactUnit))}

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
6. Do not mix Arabic and English except for project names or unit type names like iVilla, Garden Duplex, Roof Duplex, Lagoon Duplex, New Cairo.
7. Keep the answer short: maximum 2 sentences.
8. End with exactly one helpful sales question.
9. No emojis.
10. Do not suggest a call.
11. Mention price/payment only if present in the selected unit data.
12. If there is one strong match, say it clearly.
13. If the match is weak, ask one clarifying question instead of pretending certainty.
14. Treat iVilla, i villa, I-Villa, اي فيلا, آي فيلا, دوبلكس, Duplex, Garden Duplex, Roof Duplex, and Lagoon Duplex as related search terms.
15. If the user asks for iVilla, prefer units whose unit_type or description includes iVilla or Duplex aliases over standalone villas.

Examples:
English answer style:
"I found a strong match: Mountain View Aliva iVilla Garden / Garden Duplex in Mostakbal City, starting from 19,383,443 EGP. What budget range are you targeting?"

Egyptian Arabic answer style:
"لقيت اختيار مناسب: Mountain View Aliva iVilla Garden / Garden Duplex في Mostakbal City بسعر يبدأ من 19,383,443 EGP. ميزانيتك في حدود كام؟"
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
