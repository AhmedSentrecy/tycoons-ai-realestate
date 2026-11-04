"use strict";

// One page, one answer per fact (content audit, Nov 2026 — Bloomfields project page):
// the newest guide is embedded in full on the project page, which already has its own
// summary sections, FAQ, developer block and live unit table. Without these helpers the
// page said the same thing two or three times (3 developer sections, 2 location sections,
// 2 "before you decide" sections) and stated the land area two different ways.

// Topic of a section heading, so a section the page already covers is not repeated.
const TOPICS = [
  ["overview", /(?:^|\s)(?:نبذة|في سطور|عن المشروع)|^about\b|\bat a glance\b/i],
  ["location", /(?:^|\s)(?:ال)?موقع(?:\s|$)|إزاي توصل|\blocation\b|\baccess\b/i],
  ["developer", /(?:^|\s)(?:ال)?مطور|كمطور|\bdeveloper\b/i],
  ["units", /أنواع الوحدات|الوحدات والأسعار|الوحدات المتاحة|\bunit types\b|\bunits and prices\b/i],
  ["payment", /(?:أنظمة|نظام|خطط|خطة) (?:ال)?سداد|\bpayment plans?\b/i],
  ["before", /^قبل ما (?:تقرر|تحجز|تشتري)|^before you (?:decide|book|buy)/i],
];

function topicOf(heading) {
  const value = String(heading || "").replace(/[#*]/g, " ").replace(/\s+/g, " ").trim();
  if (!value) return "";
  // The drawbacks section ("... قبل الشراء") is its own topic, never "before".
  if (/عيوب|drawbacks/i.test(value)) return "drawbacks";
  const hit = TOPICS.find(([, pattern]) => pattern.test(value));
  return hit ? hit[0] : "";
}

// Remove every "## " section (with its "### " subsections) whose topic is already on the page.
function dropCoveredSections(markdown, coveredTopics) {
  const covered = coveredTopics instanceof Set ? coveredTopics : new Set(coveredTopics || []);
  if (!covered.size) return String(markdown || "");
  const out = [];
  let skipping = false;
  for (const line of String(markdown || "").split("\n")) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) skipping = covered.has(topicOf(h2[1]));
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// A link to the page the reader is already on reads as an unreviewed paste: keep the label only.
function unlinkSelf(html, paths) {
  let result = String(html || "");
  for (const path of paths || []) {
    if (!path) continue;
    const escaped = String(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`<a href="(?:https://tycoons-inv\\.com)?${escaped}/?"[^>]*>([\\s\\S]*?)</a>`, "g"), "$1");
  }
  return result;
}

// "خلال 3 شهور" / "within 3 months" / "in 4.5 years" / "خلال سنة" / "سنتين" -> months.
const AR_NUM = { "سنة": 1, "سنه": 1, "عام": 1, "سنتين": 2, "سنتين ونص": 2.5, "عامين": 2 };
function durationMonths(text) {
  const value = String(text || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).toLowerCase();
  if (/ready|immediate|فوري|جاهز/.test(value)) return 0;
  const months = value.match(/(\d+(?:\.\d+)?)\s*(?:months?|شهور|شهر|أشهر|اشهر)/);
  if (months) return Number(months[1]);
  const years = value.match(/(\d+(?:\.\d+)?)\s*(?:years?|سنوات|سنين|سنة|سنه|أعوام|عام)/);
  if (years) return Number(years[1]) * 12;
  if (/سنتين|عامين/.test(value)) return 24;
  if (/(?:خلال|بعد|في)\s+(?:سنة|سنه|عام)(?:\s|$)/.test(value)) return 12;
  return null;
}

function durationAr(months) {
  if (months === 0) return "استلام فوري";
  if (months < 12) return months === 1 ? "شهر" : `${months} شهور`;
  const years = months / 12;
  if (years === 1) return "سنة";
  if (years === 2) return "سنتين";
  return `${Number.isInteger(years) ? years : years.toFixed(1).replace(/\.0$/, "")} سنين`;
}

// The land area is stated in feddan (فدان) and sometimes in acres (أكر). 1 feddan = 4200.83 m²,
// 1 acre = 4046.86 m². Collects every area claim in a text, converted to feddan.
const FEDDAN_PER_ACRE = 4046.86 / 4200.83;
function landAreaClaims(text) {
  const claims = [];
  const value = String(text || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/(\d),(\d{3})/g, "$1$2");
  const pattern = /(\d+(?:\.\d+)?)\s*(فدان|فدادين|feddans?|أكر|اكر|acres?)/gi;
  let match;
  while ((match = pattern.exec(value))) {
    const amount = Number(match[1]);
    const acre = /أكر|اكر|acre/i.test(match[2]);
    claims.push({ raw: match[0], feddan: acre ? amount * FEDDAN_PER_ACRE : amount, unit: acre ? "acre" : "feddan" });
  }
  return claims;
}

// Problems a published page must never have: two different land areas (beyond rounding),
// or a starting price in the copy that is not the live minimum from the inventory.
function pageNumberConflicts({ texts = [], minPrice = 0 } = {}) {
  const all = texts.map((item) => String(item || "")).join("\n");
  const problems = [];
  const areas = landAreaClaims(all);
  // Converted acre -> feddan figures round; a stated feddan figure must match the others within 1%.
  const feddanStated = [...new Set(areas.filter((claim) => claim.unit === "feddan").map((claim) => claim.feddan))];
  const converted = areas.filter((claim) => claim.unit === "acre").map((claim) => claim.feddan);
  const values = [...feddanStated, ...converted];
  if (values.length > 1) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if ((max - min) / min > 0.01) problems.push({ kind: "land_area", values: [...new Set(areas.map((claim) => claim.raw))] });
  }
  if (minPrice > 0) {
    const flat = all.replace(/(\d),(\d{3})/g, "$1$2").replace(/(\d),(\d{3})/g, "$1$2");
    const starts = [...flat.matchAll(/(?:تبدأ|بتبدأ|يبدأ|بيبدأ|تبدا|starts?|starting)\s+(?:من|from|at)\s+(\d{6,})/gi)].map((match) => Number(match[1]));
    const wrong = [...new Set(starts.filter((price) => price !== Math.round(minPrice)))];
    if (wrong.length) problems.push({ kind: "starting_price", values: wrong, expected: Math.round(minPrice) });
  }
  return problems;
}

module.exports = { topicOf, dropCoveredSections, unlinkSelf, durationMonths, durationAr, landAreaClaims, pageNumberConflicts, FEDDAN_PER_ACRE };
