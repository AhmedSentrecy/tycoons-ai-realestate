// Same logic as netlify/functions/_unit-payment.cjs (scripts/test-unit-payment.mts checks both agree):
// a unit's price per m² against its project's other available units, and the down payment and
// installment its plan implies.

type UnitLike = {
  starting_price?: number | string | null;
  area_sqm?: number | string | null;
  down_payment_text?: string | null;
  installments_text?: string | null;
};

export type UnitPaymentFacts = {
  price: number;
  area: number;
  perSqm: number | null;
  avgSqm: number | null;
  peers: number;
  downPct: number | null;
  down: number | null;
  extraPct: number;
  extra: number;
  remaining: number | null;
  years: number | null;
  yearly: number | null;
};

function text(value: unknown) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function unitPaymentFacts(unit: UnitLike | null | undefined, siblings: UnitLike[] = []): UnitPaymentFacts | null {
  const price = numberValue(unit?.starting_price);
  const area = numberValue(unit?.area_sqm);
  if (!unit || !price) return null;
  const downText = text(unit.down_payment_text);
  const percents = [...downText.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1]));
  const amountOnly = downText.replace(/,/g, "").match(/^\s*(\d{4,})(?:\s*(?:EGP|جنيه))?\s*$/i);
  let downPct: number | null = percents.length ? percents[0] : amountOnly ? (Number(amountOnly[1]) / price) * 100 : null;
  if (downPct !== null && (!(downPct >= 0) || downPct > 60)) downPct = null;
  const extraPct = percents.slice(1).filter((value) => value > 0 && value <= 30).reduce((sum, value) => sum + value, 0);
  const yearsMatch = text(unit.installments_text).match(/(\d{1,2})\s*(?:years?|yrs?|y\b|سن)/i);
  const years = yearsMatch && Number(yearsMatch[1]) >= 1 && Number(yearsMatch[1]) <= 15 ? Number(yearsMatch[1]) : null;
  const perSqm = area >= 20 ? price / area : null;
  const peers = [unit, ...siblings]
    .map((item) => ({ price: numberValue(item?.starting_price), area: numberValue(item?.area_sqm) }))
    .filter((item) => item.price > 0 && item.area >= 20);
  const avgSqm = peers.length >= 3 ? peers.reduce((sum, item) => sum + item.price / item.area, 0) / peers.length : null;
  const down = downPct !== null ? (price * downPct) / 100 : null;
  const extra = down !== null && extraPct ? (price * extraPct) / 100 : 0;
  const remaining = down !== null ? price - down - extra : null;
  const yearly = remaining !== null && years ? remaining / years : null;
  return { price, area, perSqm, avgSqm, peers: peers.length, downPct, down, extraPct, extra, remaining, years, yearly };
}

const fmt = (value: number) => new Intl.NumberFormat("en-EG").format(Math.round(value));
const yearsAr = (n: number) => (n === 1 ? "سنة" : n === 2 ? "سنتين" : n >= 3 && n <= 10 ? `${n} سنين` : `${n} سنة`);
const pct = (value: number) => `${Math.round(value * 10) / 10}%`;

export function unitPaymentRows(facts: UnitPaymentFacts | null, projectName: string): Array<[string, string]> {
  if (!facts) return [];
  const rows: Array<[string, string]> = [];
  if (facts.perSqm) rows.push(["سعر المتر", `${fmt(facts.perSqm)} جنيه`]);
  if (facts.avgSqm) rows.push([`متوسط سعر المتر في ${projectName} (${facts.peers} وحدات متاحة)`, `${fmt(facts.avgSqm)} جنيه`]);
  if (facts.down !== null && facts.downPct !== null) rows.push([`المقدم (${pct(facts.downPct)})`, `${fmt(facts.down)} جنيه`]);
  if (facts.extra) rows.push([`دفعات قبل التقسيط (${pct(facts.extraPct)})`, `${fmt(facts.extra)} جنيه`]);
  if (facts.yearly && facts.years && facts.remaining !== null) {
    rows.push([`الباقي على ${yearsAr(facts.years)}`, `${fmt(facts.remaining)} جنيه`]);
    rows.push(["القسط السنوي التقريبي", `${fmt(facts.yearly)} جنيه`]);
    rows.push(["القسط كل 3 شهور تقريبًا", `${fmt(facts.yearly / 4)} جنيه`]);
    rows.push(["القسط الشهري تقريبًا", `${fmt(facts.yearly / 12)} جنيه`]);
  }
  return rows.length >= 2 ? rows : [];
}

export function unitPriceComparison(facts: UnitPaymentFacts | null, projectName: string): string {
  if (!facts || !facts.perSqm || !facts.avgSqm) return "";
  const diff = Math.round(((facts.perSqm - facts.avgSqm) / facts.avgSqm) * 100);
  return Math.abs(diff) < 3
    ? `سعر المتر في الوحدة دي قريب من متوسط الوحدات المتاحة في ${projectName}.`
    : `سعر المتر في الوحدة دي ${diff < 0 ? "أقل" : "أعلى"} بحوالي ${Math.abs(diff)}% من متوسط الوحدات المتاحة في ${projectName}.`;
}

export const UNIT_PAYMENT_NOTE = "حسبة تقريبية بأقساط متساوية. الجدول الرسمي ممكن يكون فيه دفعة استلام أو دفعات سنوية، وبنأكده مع المطور قبل الحجز.";
