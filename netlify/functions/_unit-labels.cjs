"use strict";
// Arabic labels for inventory fields on Arabic project pages (audit Nov 2026, District 5).
// Inventory stores unit types and bedrooms the way the WhatsApp sheets send them:
// "Typical Apartment", "Garden Apartment", "Typical Loft", "1.0", "3 Bedrooms + Nanny", "2BR".
// Shown raw, a card read "Typical شقة" over "1.0", and Markdown readers glued "1.0" to the
// area ("1.082 م²"). One builder serves the pre-rendered page and the browser, so both agree.

const text = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();

// Longest first, so "garden apartment" wins over "apartment".
const TYPES = [
  ["serviced apartment", "شقة فندقية"], ["hotel apartment", "شقة فندقية"],
  ["garden apartment", "شقة بجاردن"], ["garden duplex", "دوبلكس بجاردن"],
  ["roof duplex", "دوبلكس بروف"], ["roof apartment", "شقة بروف"],
  ["standalone villa", "فيلا مستقلة"], ["stand alone villa", "فيلا مستقلة"],
  ["twin house", "توين هاوس"], ["twinhouse", "توين هاوس"], ["twin villa", "توين فيلا"],
  ["town house", "تاون هاوس"], ["townhouse", "تاون هاوس"], ["i-villa", "آي فيلا"], ["ivilla", "آي فيلا"],
  ["commercial unit", "وحدة تجارية"], ["penthouse", "بنتهاوس"], ["apartment", "شقة"], ["flat", "شقة"],
  ["studio", "ستوديو"], ["duplex", "دوبلكس"], ["triplex", "تريبلكس"], ["loft", "لوفت"],
  ["chalet", "شاليه"], ["cabin", "كابينة"], ["villa", "فيلا"], ["office", "مكتب إداري"],
  ["clinic", "عيادة"], ["retail", "محل تجاري"], ["shop", "محل تجاري"],
];
// Words that only describe the listing, not the unit ("Typical" = the standard floor plan).
const NOISE = /\b(?:typical|standard|normal|unit|type)\b/gi;

/** "Typical Apartment" -> "شقة", "Garden Apartment" -> "شقة بجاردن"; Arabic input passes through. */
function unitTypeAr(value) {
  const source = text(value);
  if (!source) return "";
  if (/[؀-ۿ]/.test(source) && !/[A-Za-z]{3,}/.test(source)) return source;
  const key = source.toLowerCase().replace(NOISE, " ").replace(/\s+/g, " ").trim();
  for (const [en, ar] of TYPES) if (key === en) return ar;
  for (const [en, ar] of TYPES) if (new RegExp(`\\b${en}\\b`).test(key)) return ar;
  return key ? source : "";
}

function roomsAr(n) {
  if (n === 1) return "غرفة نوم واحدة";
  if (n === 2) return "غرفتين نوم";
  if (n >= 3 && n <= 10) return `${n} غرف نوم`;
  return `${n} غرفة نوم`;
}

/**
 * Bedrooms in Arabic: "1.0" -> "غرفة نوم واحدة", "3 Bedrooms + Nanny" -> "3 غرف نوم + غرفة مربية",
 * "Studio" -> "ستوديو". Empty for unknown values ("Not specified", "0", a unit type typed in the
 * bedrooms column), so the card hides the line instead of showing a raw number.
 */
function bedroomsAr(value) {
  const source = text(value);
  if (!source) return "";
  if (/^studio$/i.test(source)) return "ستوديو";
  if (/[؀-ۿ]/.test(source) && !/[A-Za-z]{3,}/.test(source)) return source;
  const match = source.match(/^(\d+(?:\.0+)?)\s*(?:bed\s*rooms?|bedrooms?|beds?|br|bd|rooms?|غرف(?:ة)?)?\b\s*(.*)$/i);
  if (!match) return "";
  const n = Math.round(Number(match[1]));
  if (!Number.isFinite(n) || n <= 0 || n > 20) return "";
  const extra = match[2] || "";
  const nanny = /nanny|maid|مربية/i.test(extra) ? " + غرفة مربية" : "";
  return `${roomsAr(n)}${nanny}`;
}

/**
 * Hero line from stored copy with the English names swapped for the Arabic ones
 * ("اعرف أسعار ومساحات DISTRICT 5 … في South New Cairo, New Cairo").
 */
function arabicHeroLine(value, { name = "", nameAr = "", location = "", areaAr = "", developer = "", developerAr = "" } = {}) {
  let out = text(value);
  const swap = (from, to) => {
    if (!from || !to || from === to) return;
    out = out.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), to);
  };
  swap(location, areaAr);
  swap(name, nameAr);
  swap(developer, developerAr);
  return out;
}

/** Copy that still carries Latin words a reader would see as English (brand names in it excepted). */
function hasLatinWords(value, allowed = []) {
  let out = text(value);
  for (const word of allowed) if (word) out = out.split(word).join(" ");
  return /[A-Za-z]{3,}/.test(out);
}

module.exports = { unitTypeAr, bedroomsAr, arabicHeroLine, hasLatinWords };
