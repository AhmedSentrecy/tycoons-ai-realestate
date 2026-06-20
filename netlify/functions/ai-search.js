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
  const url =
    SUPABASE_URL +
    "/rest/v1/units?select=*&availability_status=eq.available&order=starting_price.asc";

  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error("Supabase units error: " + (await res.text()));
  }

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

function hasAny(normalizedText, patterns) {
  return patterns.some((pattern) =>
    normalizedText.includes(normalizeSearchText(pattern))
  );
}

function expandSearchText(text) {
  let q = normalizeSearchText(text);
  const aliases = [];

  if (
    hasAny(q, [
      "i villa",
      "ivilla",
      "i-villa",
      "اي فيلا",
      "اى فيلا",
      "آي فيلا",
      "ايڤيلا",
      "ايفيلا"
    ])
  ) {
    aliases.push(
      "i villa ivilla i-villa اي فيلا اى فيلا آي فيلا ايفيلا",
      "duplex دوبلكس garden duplex roof duplex lagoon duplex",
      "garden duplex جاردن دوبلكس roof duplex روف دوبلكس lagoon duplex لاجون دوبلكس"
    );
  }

  if (
    hasAny(q, [
      "i villa garden",
      "ivilla garden",
      "اي فيلا جاردن",
      "garden duplex",
      "جاردن دوبلكس"
    ])
  ) {
    aliases.push(
      "i villa garden ivilla garden garden duplex جاردن دوبلكس garden"
    );
  }

  if (
    hasAny(q, [
      "i villa roof",
      "ivilla roof",
      "اي فيلا روف",
      "roof duplex",
      "روف دوبلكس"
    ])
  ) {
    aliases.push("i villa roof ivilla roof roof duplex روف دوبلكس roof");
  }

  if (
    hasAny(q, [
      "lagoon",
      "لاجون",
      "lagoon duplex",
      "lagoon apartment",
      "beach house",
      "beachfront apartment"
    ])
  ) {
    aliases.push(
      "lagoon لاجون lagoon duplex lagoon apartment beach house beachfront apartment"
    );
  }

  if (hasAny(q, ["duplex", "دوبلكس"])) {
    aliases.push(
      "duplex دوبلكس i villa ivilla i-villa اي فيلا garden duplex roof duplex lagoon duplex"
    );
  }

  if (hasAny(q, ["villa", "فيلا"])) {
    aliases.push(
      "villa فيلا standalone villa twinhouse townhouse i villa ivilla duplex"
    );
  }

  if (
    hasAny(q, [
      "new cairo",
      "tagamoa",
      "tagamo3",
      "التجمع",
      "التجمع الخامس",
      "القاهرة الجديدة",
      "القاهره الجديده"
    ])
  ) {
    aliases.push(
      "new cairo التجمع التجمع الخامس tagamoa tagamo3 fifth settlement القاهرة الجديدة"
    );
  }

  if (
    hasAny(q, [
      "sheikh zayed",
      "zayed",
      "زايد",
      "الشيخ زايد",
      "new zayed",
      "نيو زايد"
    ])
  ) {
    aliases.push("sheikh zayed zayed زايد الشيخ زايد new zayed نيو زايد");
  }

  if (
    hasAny(q, [
      "north coast",
      "sahel",
      "الساحل",
      "الساحل الشمالي",
      "ras el hekma",
      "راس الحكمة",
      "سيدي عبد الرحمن"
    ])
  ) {
    aliases.push(
      "north coast الساحل الساحل الشمالي sahel ras el hekma راس الحكمة سيدي عبد الرحمن"
    );
  }

  if (hasAny(q, ["mostakbal", "مستقبل", "المستقبل", "mostakbal city"])) {
    aliases.push("mostakbal city مستقبل المستقبل");
  }

  if (aliases.length) {
    q += " " + aliases.join(" ");
  }

  return normalizeSearchText(q);
}

function detectLocationIntent(query) {
  const q = normalizeSearchText(query);

  if (
    hasAny(q, [
      "new cairo",
      "tagamoa",
      "tagamo3",
      "التجمع",
      "التجمع الخامس",
      "القاهرة الجديدة",
      "القاهره الجديده"
    ])
  ) {
    return "new_cairo";
  }

  if (
    hasAny(q, [
      "sheikh zayed",
      "zayed",
      "زايد",
      "الشيخ زايد",
      "new zayed",
      "نيو زايد"
    ])
  ) {
    return "sheikh_zayed";
  }

  if (
    hasAny(q, [
      "north coast",
      "sahel",
      "الساحل",
      "الساحل الشمالي",
      "ras el hekma",
      "راس الحكمة",
      "سيدي عبد الرحمن"
    ])
  ) {
    return "north_coast";
  }

  if (hasAny(q, ["mostakbal", "مستقبل", "المستقبل", "mostakbal city"])) {
    return "mostakbal";
  }

  return null;
}

function unitMatchesLocationIntent(unit, locationIntent) {
  if (!locationIntent) return true;

  const location = normalizeSearchText(unit.location || "");
  const project = normalizeSearchText(unit.project_name || "");
  const combined = location + " " + project;

  if (locationIntent === "new_cairo") {
    return (
      combined.includes("new cairo") ||
      combined.includes("التجمع") ||
      combined.includes("القاهره الجديده") ||
      combined.includes("القاهرة الجديدة")
    );
  }

  if (locationIntent === "sheikh_zayed") {
    return (
      combined.includes("sheikh zayed") ||
      combined.includes("zayed") ||
      combined.includes("زايد")
    );
  }

  if (locationIntent === "north_coast") {
    return (
      combined.includes("north coast") ||
      combined.includes("الساحل") ||
      combined.includes("ras el hekma") ||
      combined.includes("راس الحكمه") ||
      combined.includes("سيدي عبد الرحمن")
    );
  }

  if (locationIntent === "mostakbal") {
    return (
      combined.includes("mostakbal") ||
      combined.includes("مستقبل") ||
      combined.includes("المستقبل")
    );
  }

  return true;
}

function applyLocationFilter(query, units) {
  const locationIntent = detectLocationIntent(query);

  if (!locationIntent) return units;

  const filtered = units.filter((unit) =>
    unitMatchesLocationIntent(unit, locationIntent)
  );

  return filtered.length ? filtered : units;
}

function buildHaystack(unit) {
  return expandSearchText(
    [
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
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function scoreUnit(query, unit) {
  const q = expandSearchText(query);
  const haystack = buildHaystack(unit);
  const terms = q.split(/\s+/).filter((term) => term.length > 1);

  let score = 0;

  for (const term of terms) {
    if (haystack.includes(term)) {
      score += term.length > 3 ? 2 : 1;
    }
  }

  const rawQuery = normalizeSearchText(query);

  if (
    rawQuery.includes("i villa") ||
    rawQuery.includes("ivilla") ||
    rawQuery.includes("اي فيلا") ||
    rawQuery.includes("اى فيلا") ||
    rawQuery.includes("ايفيلا")
  ) {
    if (
      haystack.includes("ivilla") ||
      haystack.includes("i villa") ||
      haystack.includes("اي فيلا") ||
      haystack.includes("ايفيلا")
    ) {
      score += 35;
    }

    if (haystack.includes("duplex") || haystack.includes("دوبلكس")) {
      score += 25;
    }

    if (haystack.includes("standalone villa")) {
      score -= 12;
    }
  }

  if (rawQuery.includes("garden") || rawQuery.includes("جاردن")) {
    if (haystack.includes("garden duplex") || haystack.includes("جاردن دوبلكس")) {
      score += 18;
    }

    if (haystack.includes("garden apartment")) {
      score += 8;
    }
  }

  if (rawQuery.includes("roof") || rawQuery.includes("روف")) {
    if (haystack.includes("roof duplex") || haystack.includes("روف دوبلكس")) {
      score += 18;
    }
  }

  if (rawQuery.includes("lagoon") || rawQuery.includes("لاجون")) {
    if (
      haystack.includes("lagoon duplex") ||
      haystack.includes("lagoon apartment") ||
      haystack.includes("لاجون")
    ) {
      score += 18;
    }
  }

  if (rawQuery.includes("new cairo") || rawQuery.includes("التجمع")) {
    if (haystack.includes("new cairo") || haystack.includes("التجمع")) {
      score += 20;
    }
  }

  if (rawQuery.includes("sheikh zayed") || rawQuery.includes("زايد")) {
    if (haystack.includes("sheikh zayed") || haystack.includes("زايد")) {
      score += 20;
    }
  }

  if (rawQuery.includes("north coast") || rawQuery.includes("الساحل")) {
    if (haystack.includes("north coast") || haystack.includes("الساحل")) {
      score += 20;
    }
  }

  if (rawQuery.includes("apartment") || rawQuery.includes("شقه") || rawQuery.includes("شقة")) {
    if (haystack.includes("apartment")) {
      score += 12;
    }
  }

  if (rawQuery.includes("chalet") || rawQuery.includes("شاليه")) {
    if (haystack.includes("chalet")) {
      score += 12;
    }
  }

  return score;
}

function rankUnits(query, units, limit = 6) {
  const locationFilteredUnits = applyLocationFilter(query, units);

  const scored = locationFilteredUnits
    .map((unit) => ({ ...unit, _score: scoreUnit(query, unit) }))
    .filter((unit) => unit._score > 0)
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return Number(a.starting_price || 0) - Number(b.starting_price || 0);
    });

  return (scored.length ? scored : locationFilteredUnits).slice(0, limit);
}

function isAskingForPrice(query) {
  const q = normalizeSearchText(query);

  return hasAny(q, [
    "price",
    "prices",
    "budget",
    "cheapest",
    "starting price",
    "كام",
    "سعر",
    "اسعار",
    "الاسعار",
    "ميزانيه",
    "ميزانية",
    "ارخص",
    "اقل سعر"
  ]);
}

function isAskingForArea(query) {
  const q = normalizeSearchText(query);

  return hasAny(q, [
    "area",
    "sqm",
    "meter",
    "meters",
    "space",
    "مساحه",
    "مساحة",
    "متر"
  ]);
}

function isAskingForBedrooms(query) {
  const q = normalizeSearchText(query);

  return hasAny(q, [
    "bedroom",
    "bedrooms",
    "room",
    "rooms",
    "غرف",
    "غرفه",
    "غرفة",
    "نوم"
  ]);
}

function isAskingForDelivery(query) {
  const q = normalizeSearchText(query);

  return hasAny(q, [
    "delivery",
    "handover",
    "ready",
    "استلام",
    "جاهز",
    "جاهزة",
    "فوري"
  ]);
}

function isAskingForPayment(query) {
  const q = normalizeSearchText(query);

  return hasAny(q, [
    "payment",
    "installment",
    "installments",
    "down payment",
    "تقسيط",
    "اقساط",
    "أقساط",
    "مقدم"
  ]);
}

function getUniqueProjectNames(results, max = 3) {
  const names = [];

  for (const unit of results || []) {
    if (unit.project_name && !names.includes(unit.project_name)) {
      names.push(unit.project_name);
    }

    if (names.length >= max) break;
  }

  return names;
}

function fallbackAnswer(query, results) {
  const arabic = hasArabic(query);
  const best = results[0];

  if (!best) {
    return arabic
      ? "مش لاقي اختيار مطابق من الداتا الحالية. بتدور في أنهي منطقة؟"
      : "I could not find a close match in the current inventory. Which area are you targeting?";
  }

  const projects = getUniqueProjectNames(results, 3);
  const projectTextArabic = projects.join(" و");
  const projectTextEnglish = projects.join(" and ");

  if (arabic) {
    if (isAskingForPrice(query)) {
      return `فيه اختيار مناسب في ${best.project_name} بسعر يبدأ من ${formatPrice(best.starting_price)}. ميزانيتك في حدود كام؟`;
    }

    if (isAskingForArea(query)) {
      return `فيه اختيار مناسب في ${best.project_name} بمساحة تبدأ من ${best.area_sqm} متر. بتدور على مساحة في حدود كام؟`;
    }

    if (isAskingForBedrooms(query)) {
      return `فيه اختيارات مناسبة في ${projectTextArabic}. محتاج كام غرفة؟`;
    }

    if (isAskingForDelivery(query)) {
      return `فيه اختيارات مناسبة في ${projectTextArabic} باستلامات مختلفة حسب المشروع. محتاج استلام قريب؟`;
    }

    if (isAskingForPayment(query)) {
      return `فيه أنظمة دفع مختلفة حسب المشروع وموعد الاستلام. بتدور على أقل مقدم ولا أطول فترة تقسيط؟`;
    }

    return `فيه اختيارات مناسبة في ${projectTextArabic}. تفضل نوع وحدة معين؟`;
  }

  if (isAskingForPrice(query)) {
    return `I found a suitable option in ${best.project_name}, starting from ${formatPrice(best.starting_price)}. What budget range are you targeting?`;
  }

  if (isAskingForArea(query)) {
    return `I found a suitable option in ${best.project_name}, starting from ${best.area_sqm} sqm. What area range are you targeting?`;
  }

  if (isAskingForBedrooms(query)) {
    return `I found suitable options in ${projectTextEnglish}. How many bedrooms do you need?`;
  }

  if (isAskingForDelivery(query)) {
    return `I found suitable options in ${projectTextEnglish} with different delivery timelines. Do you need soon delivery?`;
  }

  if (isAskingForPayment(query)) {
    return `Payment plans vary by project and delivery date. Are you looking for the lowest down payment or longest installment plan?`;
  }

  return `I found suitable options in ${projectTextEnglish}. Which unit type do you prefer?`;
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

exports.handler = async function (event) {
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
      const results = rankUnits(query, units, 6);
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
6. Do not mix Arabic and English except for project names, locations, and unit type names like iVilla, Garden Duplex, Roof Duplex, Lagoon Duplex, New Cairo.
7. Keep the answer very short: maximum 2 short sentences.
8. End with exactly one helpful question.
9. No emojis.
10. Do not suggest a call.
11. Do NOT mention price unless the user specifically asks about price, budget, cheapest, starting price, or payment.
12. Do NOT mention area unless the user specifically asks about area, sqm, meter, المساحة, متر.
13. Do NOT mention bedrooms unless the user specifically asks about bedrooms, rooms, غرف.
14. Do NOT mention delivery unless the user specifically asks about delivery, handover, استلام, جاهز.
15. Do NOT mention installments or down payment unless the user specifically asks about payment, installments, تقسيط, مقدم.
16. If the user asks generally for a unit type and location, answer with matching projects only, then ask one filtering question.
17. If multiple projects match, mention up to 3 project names only.
18. If there is one strong match, mention the project and unit type only.
19. Do not say all details in one answer.
20. Treat iVilla, i villa, I-Villa, اي فيلا, آي فيلا, دوبلكس, Duplex, Garden Duplex, Roof Duplex, and Lagoon Duplex as related search terms.
21. If the user asks for iVilla, prefer units whose unit_type or description includes iVilla or Duplex aliases over standalone villas.
22. If the user mentions a location like التجمع / New Cairo, do not mention Sheikh Zayed or North Coast projects in the answer unless there are no matching results in that location.
23. If the user mentions Sheikh Zayed, do not mention New Cairo or North Coast projects unless there are no matching results there.
24. If the user mentions North Coast / الساحل, do not mention New Cairo or Sheikh Zayed projects unless there are no matching results there.
25. If the selected results include prices, areas, bedrooms, delivery, and payment, keep them hidden unless the user asked for that specific detail.

Examples:
English answer style:
"I found suitable iVilla / Duplex options in Mountain View iCity New Cairo and Mountain View 1.1. Do you prefer Garden or Roof?"

Egyptian Arabic answer style:
"فيه اختيارات iVilla / Duplex مناسبة في Mountain View iCity New Cairo وMountain View 1.1 في التجمع. تفضل Garden ولا Roof؟"

If user asks about price:
"فيه iVilla / Duplex في Mountain View iCity New Cairo بسعر يبدأ من 21,553,551 جنيه. ميزانيتك في حدود كام؟"

If user asks about delivery:
"فيه اختيارات iVilla / Duplex في التجمع باستلامات مختلفة حسب المشروع. محتاج استلام قريب ولا عادي خلال كام سنة؟"
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

      const fallback = rankUnits(query, units, 6);
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
      selected = rankUnits(query, units, 6);
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
