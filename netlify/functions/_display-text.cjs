"use strict";

// Display helpers shared by the server-rendered pages (_seo-utils.cjs) and the
// build-time static pages (scripts/lib/data-pages.cjs).
//
// 1) Internal data-entry notes ("shown in source PDF", "fetched PDFs", "where shown",
//    "verify ... before official use") must never reach a visitor or a crawler.
// 2) Payment / delivery fields are stored in short English ("Up to 10 years",
//    "Delivery: June 2028"); Arabic pages show them in Arabic.
// 3) Arabic counts follow Arabic grammar ("وحدة واحدة", "وحدتين", "3 وحدات", "11 وحدة").

function text(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

// A clause is internal when it talks about where the data came from rather than the offer.
const INTERNAL_CLAUSE = /\b(?:source|fetched|pdfs?|in row|where shown|when shown|where applicable|verify\b[^.;]*\bbefore\b|columns? shown|schedule shown|shown in)\b/i;

function stripInternalNotes(value) {
  const source = text(value);
  if (!source || !INTERNAL_CLAUSE.test(source)) return source;
  return source
    .split(/(?<=[;.])\s+|;\s*/)
    .map((clause) => {
      // drop provenance fragments inside an otherwise useful clause
      const kept = clause
        .replace(/\s*\b(?:as\s+)?(?:shown|available|listed)?\s*in\s+(?:the\s+)?(?:source|fetched)(?:\s+(?:pdfs?|schedule|image|file|sheet))?\b\.?/gi, "")
        .replace(/\s*\b(?:where|when)\s+(?:shown|applicable)\b\.?/gi, "")
        .replace(/\s*\bnot finalized in row\b\.?/gi, "")
        .replace(/\s*\bcolumns?\b/gi, "")
        .trim();
      // a note clause with no concrete figure left ("Detailed payment schedule") says nothing
      return INTERNAL_CLAUSE.test(clause) && !/\d/.test(kept) ? "" : kept;
    })
    .filter((clause) => clause && !INTERNAL_CLAUSE.test(clause))
    .reduce((kept, clause) => (kept ? `${kept}${/[.!?؟]$/.test(kept) ? " " : "; "}${clause}` : clause), "")
    .replace(/[;,]\s*$/, "")
    .trim();
}

const MONTHS_AR = {
  jan: "يناير", feb: "فبراير", mar: "مارس", apr: "أبريل", may: "مايو", jun: "يونيو",
  jul: "يوليو", aug: "أغسطس", sep: "سبتمبر", oct: "أكتوبر", nov: "نوفمبر", dec: "ديسمبر",
};

// Arabic count: countAr(1, "وحدة", "وحدتين", "وحدات") -> "وحدة واحدة"
function countAr(n, singular, dual, plural, oneWord = "واحدة") {
  const value = Math.round(Number(n) || 0);
  if (value === 1) return `${singular} ${oneWord}`;
  if (value === 2) return dual;
  if (value >= 3 && value <= 10) return `${value} ${plural}`;
  return `${value} ${singular}`;
}
const unitsAr = (n) => countAr(n, "وحدة", "وحدتين", "وحدات");
const projectsAr = (n) => countAr(n, "مشروع", "مشروعين", "مشاريع", "واحد");
function yearsAr(n) {
  const value = Number(n);
  if (!Number.isInteger(value)) return `${n} سنوات`;
  if (value === 1) return "سنة";
  if (value === 2) return "سنتين";
  if (value >= 3 && value <= 10) return `${value} سنوات`;
  return `${value} سنة`;
}

// Arabic rendering of a stored payment / delivery / unit-type string.
function arabicDisplay(value) {
  let out = stripInternalNotes(value);
  if (!out) return "";
  out = out
    .replace(/^\s*delivery\s*:\s*/i, "الاستلام: ")
    .replace(/\bdelivery\s+in\s+(\d+)\s*(?:years?|y)\b/gi, (_, n) => `الاستلام خلال ${yearsAr(n)}`)
    .replace(/\b(?:immediate delivery|ready to move|rtm)\b/gi, "استلام فوري")
    .replace(/\bdelivery\b\s*/gi, "استلام ")
    .replace(/\binstallments?\s+over\s+/gi, "تقسيط على ")
    .replace(/\bup\s+to\s+/gi, "حتى ")
    .replace(/(\d+(?:\.\d+)?)\s*%\s*(?:down\s*payment|dp)\b/gi, "مقدم $1%")
    .replace(/\bdown\s*payment\b/gi, "مقدم")
    .replace(/\bafter\s+(\d+)\s+months?\b/gi, (_, n) => `بعد ${Number(n) >= 3 && Number(n) <= 10 ? `${n} شهور` : `${n} شهر`}`)
    .replace(/(\d+(?:\.\d+)?)\s*-\s*(\d+)\s*(?:years?|y)\b/gi, "من $1 لـ $2 سنين")
    .replace(/(\d+)\s*(?:years?|yrs?|y)\b/gi, (_, n) => yearsAr(n))
    .replace(/\bquarterly\b/gi, "ربع سنوي")
    .replace(/\bmonthly\b/gi, "شهري")
    .replace(/\bannual(?:ly)?\b/gi, "سنوي")
    .replace(/\bcontract\s+payments?\b/gi, "عند التعاقد")
    .replace(/\bcontract\b/gi, "عند التعاقد")
    .replace(/\bfirst\s+payments?\s+(?:starts?|from)\b/gi, "أول دفعة")
    .replace(/\bQ([1-4])\s*(20\d\d)\b/gi, (_, q, y) => `الربع ${["الأول", "التاني", "التالت", "الرابع"][Number(q) - 1]} ${y}`)
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s*-\s*|\s+)(20\d\d)\b/gi, (_, m, y) => `${MONTHS_AR[m.toLowerCase()]} ${y}`)
    .replace(/\bor\b/gi, "أو")
    .replace(/\band\b/gi, "و");
  return out.replace(/\s{2,}/g, " ").trim();
}

// Arabic prose stored with a stray English word.
function arabicProse(value) {
  return String(value == null ? "" : value).replace(/\bavailability\b/gi, "التوفر");
}

// Whole buildings, offices, shops and clinics: excluded from "highest price" stats on
// area pages so a 5,000 m² building does not read as a home price.
const COMMERCIAL_UNIT = /office|clinic|retail|shop|admin|commercial|building|mall|store|kiosk|warehouse|pharmacy|مكتب|عيادة|محل|تجاري|إداري|مبنى/i;
function isCommercialUnit(unit) {
  return COMMERCIAL_UNIT.test(String(unit?.unit_type || ""));
}

module.exports = { stripInternalNotes, arabicDisplay, arabicProse, countAr, unitsAr, projectsAr, yearsAr, isCommercialUnit };
