"use strict";

// Numbers only one unit has: its price per m² against the project's other available units,
// and the down payment and installment its plan implies. Every unit page gets its own facts
// (fewer near-duplicate pages) and the first answers a buyer asks.
// Same logic as src/lib/unitPayment.ts (scripts/test-unit-payment.mts checks both agree).

function text(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function numberValue(value) {
  const parsed = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function unitPaymentFacts(unit, siblings = []) {
  const price = numberValue(unit && unit.starting_price);
  const area = numberValue(unit && unit.area_sqm);
  if (!price) return null;
  const downText = text(unit.down_payment_text);
  const percents = [...downText.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1]));
  const amountOnly = downText.replace(/,/g, "").match(/^\s*(\d{4,})(?:\s*(?:EGP|جنيه))?\s*$/i);
  let downPct = percents.length ? percents[0] : amountOnly ? (Number(amountOnly[1]) / price) * 100 : null;
  if (downPct !== null && (!(downPct >= 0) || downPct > 60)) downPct = null;
  // "5% on contract + 5% later": the second payment comes before the installments too
  const extraPct = percents.slice(1).filter((value) => value > 0 && value <= 30).reduce((sum, value) => sum + value, 0);
  const yearsMatch = text(unit.installments_text).match(/(\d{1,2})\s*(?:years?|yrs?|y\b|سن)/i);
  const years = yearsMatch && Number(yearsMatch[1]) >= 1 && Number(yearsMatch[1]) <= 15 ? Number(yearsMatch[1]) : null;
  const perSqm = area >= 20 ? price / area : null;
  const peers = [unit, ...siblings]
    .map((item) => ({ price: numberValue(item && item.starting_price), area: numberValue(item && item.area_sqm) }))
    .filter((item) => item.price > 0 && item.area >= 20);
  const avgSqm = peers.length >= 3 ? peers.reduce((sum, item) => sum + item.price / item.area, 0) / peers.length : null;
  const down = downPct !== null ? (price * downPct) / 100 : null;
  const extra = down !== null && extraPct ? (price * extraPct) / 100 : 0;
  const remaining = down !== null ? price - down - extra : null;
  const yearly = remaining !== null && years ? remaining / years : null;
  return { price, area, perSqm, avgSqm, peers: peers.length, downPct, down, extraPct, extra, remaining, years, yearly };
}

const fmt = (value) => new Intl.NumberFormat("en-EG").format(Math.round(value));
const yearsAr = (n) => (n === 1 ? "سنة" : n === 2 ? "سنتين" : n >= 3 && n <= 10 ? `${n} سنين` : `${n} سنة`);
const pct = (value) => `${Math.round(value * 10) / 10}%`;

// [label, value] rows for the table; empty when there is too little to show.
function unitPaymentRows(facts, projectName) {
  if (!facts) return [];
  const rows = [];
  if (facts.perSqm) rows.push(["سعر المتر", `${fmt(facts.perSqm)} جنيه`]);
  if (facts.avgSqm) rows.push([`متوسط سعر المتر في ${projectName} (${facts.peers} وحدات متاحة)`, `${fmt(facts.avgSqm)} جنيه`]);
  if (facts.down !== null) rows.push([`المقدم (${pct(facts.downPct)})`, `${fmt(facts.down)} جنيه`]);
  if (facts.extra) rows.push([`دفعات قبل التقسيط (${pct(facts.extraPct)})`, `${fmt(facts.extra)} جنيه`]);
  if (facts.yearly) {
    rows.push([`الباقي على ${yearsAr(facts.years)}`, `${fmt(facts.remaining)} جنيه`]);
    rows.push(["القسط السنوي التقريبي", `${fmt(facts.yearly)} جنيه`]);
    rows.push(["القسط كل 3 شهور تقريبًا", `${fmt(facts.yearly / 4)} جنيه`]);
    rows.push(["القسط الشهري تقريبًا", `${fmt(facts.yearly / 12)} جنيه`]);
  }
  return rows.length >= 2 ? rows : [];
}

function unitPriceComparison(facts, projectName) {
  if (!facts || !facts.perSqm || !facts.avgSqm) return "";
  const diff = Math.round(((facts.perSqm - facts.avgSqm) / facts.avgSqm) * 100);
  return Math.abs(diff) < 3
    ? `سعر المتر في الوحدة دي قريب من متوسط الوحدات المتاحة في ${projectName}.`
    : `سعر المتر في الوحدة دي ${diff < 0 ? "أقل" : "أعلى"} بحوالي ${Math.abs(diff)}% من متوسط الوحدات المتاحة في ${projectName}.`;
}

const UNIT_PAYMENT_NOTE = "حسبة تقريبية بأقساط متساوية. الجدول الرسمي ممكن يكون فيه دفعة استلام أو دفعات سنوية، وبنأكده مع المطور قبل الحجز.";

module.exports = { unitPaymentFacts, unitPaymentRows, unitPriceComparison, UNIT_PAYMENT_NOTE };
