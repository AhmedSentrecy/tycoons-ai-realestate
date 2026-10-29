// The unit payment section is rendered twice: in the static HTML (CJS) and by React (TS).
// Both must show the same numbers, or Googlebot's rendered page disagrees with the source.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as ts from "../src/lib/unitPayment.ts";

const require = createRequire(import.meta.url);
const cjs = require("../netlify/functions/_unit-payment.cjs");

const siblings = [
  { starting_price: 9_000_000, area_sqm: 150 },
  { starting_price: 12_000_000, area_sqm: 180 },
  { starting_price: 7_500_000, area_sqm: 120 },
];
const cases = [
  { starting_price: 10_000_000, area_sqm: 160, down_payment_text: "10%", installments_text: "8 years" },
  { starting_price: 10_000_000, area_sqm: 160, down_payment_text: "5% + 5% after 3 months", installments_text: "تقسيط على 7 سنين" },
  { starting_price: 6_000_000, area_sqm: 100, down_payment_text: "600,000", installments_text: "6 Years" },
  { starting_price: 6_000_000, area_sqm: 0, down_payment_text: "", installments_text: "" },
  { starting_price: 0, area_sqm: 100, down_payment_text: "10%", installments_text: "8 years" },
  { starting_price: 6_000_000, area_sqm: 100, down_payment_text: "90%", installments_text: "40 years" },
];

for (const unit of cases) {
  const a = cjs.unitPaymentFacts(unit, siblings);
  const b = ts.unitPaymentFacts(unit, siblings);
  assert.deepEqual(a, b, `facts differ for ${JSON.stringify(unit)}`);
  assert.deepEqual(cjs.unitPaymentRows(a, "Project X"), ts.unitPaymentRows(b, "Project X"));
  assert.equal(cjs.unitPriceComparison(a, "Project X"), ts.unitPriceComparison(b, "Project X"));
}
assert.equal(cjs.UNIT_PAYMENT_NOTE, ts.UNIT_PAYMENT_NOTE);

const plain = cjs.unitPaymentFacts(cases[0], siblings);
assert.equal(plain.down, 1_000_000);
assert.equal(plain.yearly, 9_000_000 / 8);
const split = cjs.unitPaymentFacts(cases[1], siblings);
assert.equal(split.extra, 500_000);
assert.equal(split.remaining, 9_000_000);
assert.equal(split.years, 7);
assert.equal(cjs.unitPaymentFacts(cases[2], siblings).downPct, 10);
assert.deepEqual(cjs.unitPaymentRows(cjs.unitPaymentFacts(cases[3], []), "P"), [], "too little data shows no table");
assert.equal(cjs.unitPaymentFacts(cases[4], siblings), null);
const odd = cjs.unitPaymentFacts(cases[5], siblings);
assert.equal(odd.downPct, null);
assert.equal(odd.years, null);

console.log("Unit payment facts match between static and React pages.");
