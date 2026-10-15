"use strict";

// Developer name handling for display: one group per company even when the inventory spells it
// several ways ("City Edge" / "City Edge Developments", "Waterway" / "The Waterway Developments"),
// the Arabic name for companies that have no row in Supabase `developers` yet, and initials for
// the logo tile when there is no logo file.

const FILLER = /\b(?:the|developments?|developers?|development|group|holding|properties|real ?estate|realestate|egypt|company|co)\b/g;

/** Same value for every spelling of the same company. */
function devGroupKey(name) {
  return String(name || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(FILLER, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Arabic display names by group key (used only when Supabase has no name_ar for the company).
const DEVELOPER_AR = {
  sodic: "سوديك",
  "la vista": "لافيستا",
  lavista: "لافيستا",
  "mountain view": "ماونتن فيو",
  "palm hills": "بالم هيلز",
  "hyde park": "هايد بارك",
  "city edge": "سيتي إيدج",
  "hassan allam": "حسن علام",
  upwyde: "أب وايد",
  "dubai misr": "دبي مصر",
  lmd: "إل إم دي",
  waterway: "ذا ووتر واي",
  "madinet masr": "مدينة مصر",
  marakez: "مراكز",
  "tatweer misr": "تطوير مصر",
  "al borouj misr": "البروج مصر",
  menassat: "منصات",
  "saudi egyptian": "السعودية المصرية للتعمير",
  pre: "بري جروب",
  tameer: "تعمير",
  "dar al alamia": "دار العالمية",
  ora: "أورا",
  "al qamzi": "القمزي",
  urbnlanes: "أربن لينز",
  artal: "أرتال",
  "new plan": "نيو بلان",
  mass: "ماس",
  "sky ad": "سكاي أبوظبي",
  "main marks": "مين ماركس",
  "living yards": "ليفينج ياردز",
  cred: "كريد",
  "al jazi": "الجازي",
  "arab": "عرب ديفلوبرز القابضة",
  n: "إن ديفلوبمنتس",
  horizon: "هورايزون",
  "town writers": "تاون رايترز",
  "akam alrajhi": "أكام الراجحي",
  "people and places": "بيبول آند بليسز",
  areva: "أريفا",
  "khaled sabry": "خالد صبري القابضة",
  ark: "ذا آرك",
  "al ahly sabbour": "الأهلي صبور",
  dorra: "درة",
  madaar: "مدار",
  marasem: "مراسم",
  orascom: "أوراسكوم",
  jadeer: "جدير",
  "al dawlia": "الدولية",
  amazon: "أمازون",
  inertia: "إنرشيا",
  "style home": "ستايل هوم",
  nile: "النيل",
  reportage: "ريبورتاج",
  arabco: "أرابكو",
  times: "تايمز",
  stm: "إس تي إم",
  amorada: "أمورادا",
  eons: "إيونز",
  kleek: "كليك",
  nakheel: "نخيل",
  lasirena: "لاسيرينا",
  ardic: "أرديك",
  gates: "جيتس",
  "nations of sky": "نيشنز أوف سكاي",
  "housing and hdp": "الإسكان والتعمير HDP",
  naia: "نايا",
  royal: "رويال",
  arabella: "أرابيلا",
  "founders by hyde park": "فاوندرز",
  "misr italia": "مصر إيطاليا",
  "il cazar": "الكازار",
};

function developerArabic(name) {
  const key = devGroupKey(name);
  if (DEVELOPER_AR[key]) return DEVELOPER_AR[key];
  if (/^arab developers/.test(String(name || "").toLowerCase())) return DEVELOPER_AR.arab;
  return "";
}

/** Up to two letters for the logo tile when a company has no logo file. */
function devInitials(name) {
  const words = devGroupKey(name).split(" ").filter((word) => word && !/^(al|el|of|and|by)$/.test(word));
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, words[0].length <= 4 ? 4 : 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

module.exports = { devGroupKey, developerArabic, devInitials, DEVELOPER_AR };
