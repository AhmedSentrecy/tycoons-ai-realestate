"use strict";

const { unitPath } = require("./_unit-url.cjs");

const regentAlias = "regents-square--al-dawlia-boutique-developments";
const regentSlug = "regent-s-square--al-dawlia-developments";
function canonicalProjectSlug(slug) {
  return slug === regentAlias ? regentSlug : slug;
}

// Keep the source row for inventory staff. A value in the wrong column cannot
// confirm a date or a payment plan, even when a second term appears on the row.
function publicUnit(row) {
  const unit = { ...row };
  if (/installments?|payment plan|down payment|مقدم|تقسيط|أقساط/i.test(unit.delivery_text || "")) {
    unit.delivery_text = "";
    // The approved inbox record for this exact offer confirms its original 8-year term.
    if (!(row.id === "409bf4aa-4c17-4a45-8303-8c3c1ba656e9" && row.installments_text === "8 years" && row.delivery_text === "Installments over 10 years")) {
      unit.installments_text = "";
      unit.down_payment_text = "";
    }
  }
  if (/^(?:within\s+)?\d+(?:\.\d+)?\s*(?:years?|months?|سنوات|سنين|شهور)$|^[A-Z]{2,4}-[A-Z]{2,4}$/i.test(String(unit.finishing || "").trim())) unit.finishing = "";
  const term = String(unit.installments_text || "").trim().match(/^(\d{1,2})\s*y$/i);
  if (term) unit.installments_text = term[1] + " years";
  return unit;
}

function uniqueUnits(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row.id) return true;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

// Compare recorded installment offers on a common basis; a cash-only quote
// or a listing with no explicit payment term cannot establish that basis.
function hasInstallmentPrice(unit) {
  const term = String(unit.installments_text || "").trim();
  return Number(unit.starting_price) > 0 && !/cash|كاش|نقد/i.test(term)
    && /\d+(?:\.\d+)?\s*(?:years?|yrs?|y\b|months?|سنوات|سنين|سنة|عام|شهر)/i.test(term);
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function unitInquiry(unit, slug, lang = "ar") {
  const en = lang === "en";
  const price = Number(unit.starting_price);
  const lines = [
    en ? "Please confirm this unit" : "عايز أتأكد من تفاصيل الوحدة دي",
    unit.project_name, unit.unit_type, unit.id,
    Number(unit.area_sqm) > 0 && (unit.area_sqm + (en ? " m²" : " م²")),
    price > 0 && (price.toLocaleString("en-US") + (en ? " EGP" : " جنيه")),
    unit.down_payment_text && ((en ? "Down payment: " : "المقدم: ") + unit.down_payment_text),
    "https://tycoons-inv.com" + unitPath({ ...unit, project_slug: slug }),
  ];
  return "https://wa.me/201110100025?text=" + encodeURIComponent(lines.filter(Boolean).join("\n"));
}

module.exports = { publicUnit, hasInstallmentPrice, mean, uniqueUnits, unitInquiry, canonicalProjectSlug };
