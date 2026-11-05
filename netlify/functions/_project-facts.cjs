"use strict";
// «في سطور»: the short facts box right under a project page's H1 (GEO/AEO, Nov 2026). AI answers and
// featured snippets quote short labelled facts; one shared builder keeps the pre-rendered page and the
// browser identical, and every value comes from one place (units for prices, types and dates).
const TYPE_MAP = {
  apartment: "شقة", studio: "ستوديو", duplex: "دوبلكس", penthouse: "بنتهاوس", chalet: "شاليه",
  "standalone villa": "فيلا مستقلة", villa: "فيلا", "twin house": "توين هاوس", twinhouse: "توين هاوس",
  townhouse: "تاون هاوس", "town house": "تاون هاوس", office: "مكتب", clinic: "عيادة", retail: "محل",
  "commercial unit": "وحدة تجارية", cabin: "كابينة", loft: "لوفت", ivilla: "آي فيلا", "i-villa": "آي فيلا",
};
const text = (value) => String(value ?? "").trim();
const { unitBaseAr, unitsCountAr } = require("./_unit-labels.cjs");
function arabicType(value) {
  const key = text(value).toLowerCase();
  if (!key) return "";
  if (TYPE_MAP[key]) return TYPE_MAP[key];
  for (const [en, ar] of Object.entries(TYPE_MAP)) if (key.includes(en)) return ar;
  return /[؀-ۿ]/.test(key) ? text(value) : "";
}
const price = (value) => { const number = Number(text(value).replace(/,/g, "")); return Number.isFinite(number) && number > 0 ? number : 0; };
// Newest price update among the units (the page's "last updated" and its schema dateModified).
function lastPriceUpdate(units, fallback = "") {
  const dates = (Array.isArray(units) ? units : []).map((unit) => text(unit?.last_updated_at)).filter((value) => Number.isFinite(Date.parse(value)));
  const best = dates.sort().at(-1) || "";
  const extra = Number.isFinite(Date.parse(text(fallback))) ? text(fallback) : "";
  return [best, extra].filter(Boolean).sort().at(-1) || "";
}
function arDate(value) {
  const time = Date.parse(text(value));
  return Number.isFinite(time) ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date(time)) : "";
}
/**
 * @param {{developer?: string, developerHref?: string, area?: string, areaHref?: string, units?: object[]}} input
 * @returns {{label: string, value: string, href?: string, datetime?: string}[]}
 */
function projectFacts(input) {
  const units = Array.isArray(input?.units) ? input.units : [];
  const facts = [];
  if (text(input?.developer)) facts.push({ label: "المطور", value: text(input.developer), ...(input.developerHref ? { href: input.developerHref } : {}) });
  if (text(input?.area)) facts.push({ label: "المنطقة", value: text(input.area), ...(input.areaHref ? { href: input.areaHref } : {}) });
  const types = [...new Set(units.map((unit) => unitBaseAr(unit?.unit_type) || arabicType(unit?.unit_type)).filter(Boolean))];
  if (types.length) facts.push({ label: "أنواع الوحدات المتاحة", value: types.slice(0, 6).join("، ") });
  const prices = units.map((unit) => price(unit?.starting_price)).filter(Boolean);
  if (prices.length) facts.push({ label: "الأسعار تبدأ من", value: `${new Intl.NumberFormat("en-US").format(Math.round(Math.min(...prices)))} جنيه` });
  if (units.length) facts.push({ label: "الوحدات المتاحة عندنا", value: unitsCountAr(units.length) });
  const updated = lastPriceUpdate(units);
  if (updated) facts.push({ label: "آخر تحديث للأسعار", value: arDate(updated), datetime: updated.slice(0, 10) });
  return facts;
}
function escapeHtml(value) {
  return text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
// Tailwind classes shared with the React box in src/components/ProjectFacts.tsx (Tailwind only scans
// src/, so the static page uses exactly the classes that component uses).
const FACT_CLASSES = {
  section: "mt-8 max-w-4xl rounded-2xl border border-white/15 bg-white/5 p-5",
  title: "text-sm font-bold text-[#d9b87c]",
  list: "mt-3 grid gap-4 sm:grid-cols-3",
  term: "text-xs text-white/55",
  value: "mt-1 font-bold text-white",
  link: "underline decoration-white/30 underline-offset-4 hover:text-[#ecd9ae]",
};
// The box as HTML (pre-rendered pages); the browser renders the same list in React.
function projectFactsHtml(facts, title) {
  if (!Array.isArray(facts) || facts.length < 2) return "";
  const c = FACT_CLASSES;
  const rows = facts.map((fact) => {
    const value = fact.datetime ? `<time datetime="${escapeHtml(fact.datetime)}">${escapeHtml(fact.value)}</time>` : escapeHtml(fact.value);
    return `<div><dt class="${c.term}">${escapeHtml(fact.label)}</dt><dd class="${c.value}">${fact.href ? `<a class="${c.link}" href="${escapeHtml(fact.href)}">${value}</a>` : value}</dd></div>`;
  }).join("");
  return `<section class="${c.section}" aria-label="${escapeHtml(title)}"><h2 class="${c.title}">${escapeHtml(title)}</h2><dl class="${c.list}">${rows}</dl></section>`;
}
module.exports = { projectFacts, projectFactsHtml, lastPriceUpdate, arabicType, FACT_CLASSES };
