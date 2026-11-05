"use strict";
// Arabic labels for inventory fields on Arabic project pages (audit Nov 2026).
// Inventory stores unit types and bedrooms the way the WhatsApp sheets send them:
// "Typical Apartment", "First Row Garden Chalet", "iCity October - Lake House", "1.0", "3 Bedrooms + Nanny".
// Shown raw, a card read "Typical شقة" over "1.0". One builder serves the pre-rendered page and the
// browser, so both agree. Every word that has an Arabic equivalent is written in Arabic
// ("first row" -> صف أول, "garden" -> بحديقة, "typical" -> في دور متكرر; never فيرست رو / جاردن / تيبيكال).
// Developer product names with no Arabic word (آي فيلا، ليك هاوس، ميلينيال) are written in Arabic letters.

const text = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isArabicOnly = (value) => /[؀-ۿ]/.test(value) && !/[A-Za-z]{3,}/.test(value);

// Base unit types, longest phrase first.
const BASES = [
  ["serviced apartments", "شقة فندقية"], ["serviced apartment", "شقة فندقية"], ["service apartment", "شقة فندقية"],
  ["hotel apartment", "شقة فندقية"], ["branded residences", "شقة فندقية"], ["hotel unit", "وحدة فندقية"],
  ["standalone villa", "فيلا مستقلة"], ["stand alone villa", "فيلا مستقلة"], ["stand alone", "فيلا مستقلة"],
  ["standalone", "فيلا مستقلة"], ["one storey house", "فيلا دور واحد"], ["one storey", "فيلا دور واحد"],
  ["one story", "فيلا دور واحد"], ["single storey", "فيلا دور واحد"],
  ["twin villas", "توين فيلا"], ["twin villa", "توين فيلا"], ["twin houses", "توين هاوس"], ["twin house", "توين هاوس"],
  ["twinhouse", "توين هاوس"], ["twinhome", "توين هاوس"], ["twin casa", "توين هاوس"],
  ["town houses", "تاون هاوس"], ["town house", "تاون هاوس"], ["townhouse", "تاون هاوس"], ["townhome", "تاون هاوس"],
  ["town casa", "تاون هاوس"], ["ths", "تاون هاوس"],
  ["office villa", "فيلا إدارية"], ["quad villa", "فيلا رباعية"], ["quadro", "فيلا رباعية"], ["fourplex", "فيلا رباعية"],
  ["i-villa", "آي فيلا"], ["i villa", "آي فيلا"], ["ivilla", "آي فيلا"], ["park villa", "بارك فيلا"],
  ["sky villa", "سكاي فيلا"], ["sky loft", "سكاي لوفت"], ["lake house", "ليك هاوس"], ["beach house", "بيتش هاوس"],
  ["mv palace", "بالاس"], ["palace", "بالاس"], ["millennial", "ميلينيال"],
  ["i-apartment", "آي أبارتمنت"], ["i apartment", "آي أبارتمنت"], ["family house", "فاميلي هاوس"],
  ["family apartment", "شقة عائلية"], ["ecohouse", "إيكو هاوس"], ["mansion", "قصر"],
  ["administrative office", "مكتب إداري"], ["admin office", "مكتب إداري"], ["admin unit", "مكتب إداري"],
  ["administrative", "مكتب إداري"], ["admin", "مكتب إداري"], ["offices", "مكتب إداري"], ["office", "مكتب إداري"],
  ["medical clinic", "عيادة"], ["dental clinic", "عيادة"], ["clinic", "عيادة"], ["medical", "عيادة"],
  ["ob-gyn", "عيادة"], ["pediatricians", "عيادة"], ["laboratory", "معمل"], ["pharmacy", "صيدلية"],
  ["commercial unit", "وحدة تجارية"], ["retail shop", "محل تجاري"], ["concept store", "محل تجاري"], ["retail", "محل تجاري"],
  ["shop", "محل تجاري"], ["f&b", "مطعم أو كافيه"], ["showroom", "معرض"], ["bank", "فرع بنك"],
  ["health & beauty", "محل تجاري"],
  ["penthouse", "بنتهاوس"], ["maisonette", "ميزونيت"], ["triplex", "تريبلكس"], ["duplex", "دوبلكس"],
  ["loft", "لوفت"], ["studio", "ستوديو"], ["suite", "جناح فندقي"], ["chalets", "شاليه"], ["chalet", "شاليه"],
  ["cabana", "كابينة"], ["cabins", "كابينة"], ["cabin", "كابينة"], ["condos", "شقة"], ["condo", "شقة"],
  ["villa", "فيلا"], ["apartment", "شقة"], ["flat", "شقة"], ["house", "بيت"],
].map(([en, ar]) => [new RegExp(`(?:^|[^a-z])${escapeRe(en)}(?:$|[^a-z])`), ar]);

// Words that describe the unit inside its type; one per group.
const MODIFIERS = [
  [/\bfirst\s+row\b/, "صف أول", "row"],
  [/\b(?:ground\s+floor|ground|gf)\b/, "أرضي", "floor"],
  [/\bfirst\s+floor\b/, "دور أول", "floor"],
  [/\b(?:typical|upper)\b/, "في دور متكرر", "floor"],
  [/\bsky\s+garden\b/, "بحديقة علوية", "garden"],
  [/\b(?:garden|yard)\b/, "بحديقة", "garden"],
  [/\broof\b/, "بروف", "roof"],
  [/\bsea\s*view\b/, "بإطلالة على البحر", "view"],
  [/\bpool\s+view\b/, "بإطلالة على حمام السباحة", "view"],
  [/\bpark\s+view\b/, "بإطلالة على الحديقة", "view"],
  [/\blagoon\b/, "على البحيرة", "view"],
  [/(?:\bmiddle\b|\(m\)|\bm$|\bm\b(?=\s*$))/, "وسط", "position"],
  [/\bcorner\b/, "طرفي", "position"],
  [/(?:\+\s*n(?:anny)?\b|\bnanny\b)/, "+ غرفة مربية", "nanny"],
];

function splitType(value) {
  let key = text(value).toLowerCase().replace(/\s*\/\s*.*$/, "");
  // "iCity October - Lake House", "Ras El Hekma - Garden Chalet": the part before " - " is the project or
  // phase; "Chalet - Penthouse", "Townhouse - Middle": both parts describe the unit.
  const parts = key.split(/\s+[-–]\s+/);
  if (parts.length > 1) key = BASES.some(([re]) => re.test(parts[0])) ? parts.join(" ") : parts.slice(1).join(" ");
  return key.replace(/\s+/g, " ").trim();
}

/** Base type in Arabic ("First Row Garden Chalet" -> شاليه), for short lists such as the facts box. */
function unitBaseAr(value) {
  const source = text(value);
  if (!source) return "";
  if (isArabicOnly(source)) return source;
  const key = splitType(source);
  for (const [re, ar] of BASES) if (re.test(key)) return ar;
  // A bedroom count typed as the type ("2 Bedrooms", "3B Ground", "2BD + Garden") is a flat.
  if (/\b\d\s*(?:b|bd|br|beds?|bedrooms?)\b/.test(key)) return "شقة";
  return "";
}

/**
 * Full Arabic unit type: "First Row Garden Chalet" -> "شاليه صف أول بحديقة",
 * "Townhouse Middle" -> "تاون هاوس وسط", "iCity October - Lake House" -> "ليك هاوس".
 * Unknown English types become "وحدة", so no English reaches an Arabic page.
 */
function unitTypeAr(value) {
  const source = text(value);
  if (!source) return "";
  if (isArabicOnly(source)) return source;
  const key = splitType(source);
  let base = unitBaseAr(source) || "وحدة";
  if (/\bpenthouse\b/.test(key) && base === "شاليه") base = "شاليه بنتهاوس";
  const rowHouse = /تاون هاوس|توين|فيلا/.test(base);
  const groups = new Set();
  const mods = [];
  for (const [pattern, ar, group] of MODIFIERS) {
    if (groups.has(group) || !pattern.test(key)) continue;
    if (group === "position" && !rowHouse) continue;
    // "Penthouse Open Roof", "Roof Chalet": the roof is part of a penthouse already.
    if (group === "roof" && base === "بنتهاوس" && /open\s+roof/.test(key)) { groups.add(group); mods.push("بروف مفتوح"); continue; }
    groups.add(group);
    mods.push(ar);
  }
  return [base, ...mods].join(" ");
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
  if (isArabicOnly(source)) return source;
  const match = source.match(/^(\d+(?:\.0+)?)\s*(?:bed\s*rooms?|bedrooms?|beds?|br|bd|rooms?|غرف(?:ة)?)?\b\s*(.*)$/i);
  if (!match) return "";
  const n = Math.round(Number(match[1]));
  if (!Number.isFinite(n) || n <= 0 || n > 20) return "";
  const extra = match[2] || "";
  const nanny = /nanny|maid|مربية|\+\s*n\b/i.test(extra) ? " + غرفة مربية" : "";
  return `${roomsAr(n)}${nanny}`;
}

// The area is already in the Arabic name ("قرية فوكا باي الساحل الشمالي", "ديستريكت 5 التجمع").
function nameHasArea(nameAr, areaAr) {
  const name = text(nameAr);
  return text(areaAr).split(/\s+/).map((word) => word.replace(/^و(?=ال)/, "")).filter((word) => word.length >= 4 && word !== "الجديدة").some((word) => name.includes(word));
}

/** The plain hero sentence, without repeating the area when the name already holds it. */
function defaultHeroLine(nameAr, areaAr) {
  return `اعرف أسعار ومساحات ${text(nameAr)} وخطط السداد والوحدات المتاحة${areaAr && !nameHasArea(nameAr, areaAr) ? ` في ${text(areaAr)}` : ""}.`;
}

/**
 * Hero line from stored copy with the English names swapped for the Arabic ones
 * ("اعرف أسعار ومساحات DISTRICT 5 … في South New Cairo, New Cairo").
 */
function arabicHeroLine(value, { name = "", nameAr = "", location = "", areaAr = "", developer = "", developerAr = "" } = {}) {
  let out = text(value);
  const swap = (from, to) => {
    if (!from || !to || from === to) return;
    out = out.replace(new RegExp(escapeRe(from), "gi"), to);
  };
  swap(location, areaAr);
  swap(name, nameAr);
  swap(developer, developerAr);
  // The stored template sentence repeats the area after a name that holds it; rebuild it.
  if (/^اعرف أسعار ومساحات /.test(out) && nameAr) return defaultHeroLine(nameAr, areaAr);
  return out;
}

/** Copy that still carries Latin words a reader would see as English (brand names in it excepted). */
function hasLatinWords(value, allowed = []) {
  let out = text(value);
  for (const word of allowed) if (word) out = out.split(word).join(" ");
  return /[A-Za-z]{3,}/.test(out);
}

// The same area said twice in a searched name ("… آي سيتي أكتوبر السادس من أكتوبر",
// "… التجمع الخامس القاهرة الجديدة"): keep the first. Different places ("الساحل الشمالي رأس الحكمة") stay.
const AREA_GROUPS = [
  ["السادس من أكتوبر", "6 أكتوبر", "أكتوبر"],
  ["التجمع الخامس", "القاهرة الجديدة", "التجمع"],
];
/** Arabic project name without the area repeated. */
function tidyArabicName(value) {
  let out = text(value);
  for (const group of AREA_GROUPS) {
    const hits = group.map((phrase) => ({ phrase, at: out.indexOf(phrase) })).filter((hit) => hit.at >= 0).sort((a, b) => a.at - b.at);
    if (hits.length < 2) continue;
    // Drop every later phrase of the group that does not overlap the first one.
    const first = hits[0];
    for (const hit of hits.slice(1)) {
      if (hit.at >= first.at && hit.at < first.at + first.phrase.length) continue;
      out = out.slice(0, hit.at) + out.slice(hit.at + hit.phrase.length);
    }
    out = out.replace(/\s+/g, " ").trim();
  }
  return out;
}

/** Keywords stored with an English place ("شقق للبيع في Sheikh Zayed"): Arabic area in Arabic phrases. */
function arabicKeywords(list, { areaAr = "", developer = "", developerAr = "", name = "" } = {}) {
  return (Array.isArray(list) ? list : []).map((value) => {
    let out = text(value);
    if (!/[؀-ۿ]/.test(out)) return out;
    // Only a place: "وحدات للبيع في <project name>" keeps the name.
    if (areaAr) out = out.replace(/(للبيع في )([A-Za-z][A-Za-z0-9 ,.'-]*)$/, (all, lead, tail) => (name && tail.trim().toLowerCase() === text(name).toLowerCase() ? all : `${lead}${areaAr}`));
    if (developer && developerAr && out === `مشروعات ${developer}`) out = `مشروعات ${developerAr}`;
    return out;
  }).filter(Boolean);
}

/** Arabic count of units: 1 -> "وحدة واحدة", 2 -> "وحدتين", 3..10 -> "3 وحدات", 11+ -> "11 وحدة". */
function unitsCountAr(n) {
  const value = Math.round(Number(n) || 0);
  if (value === 1) return "وحدة واحدة";
  if (value === 2) return "وحدتين";
  if (value >= 3 && value <= 10) return `${value} وحدات`;
  return `${value} وحدة`;
}

module.exports = { tidyArabicName, arabicKeywords, unitTypeAr, unitBaseAr, bedroomsAr, arabicHeroLine, defaultHeroLine, hasLatinWords, unitsCountAr };
