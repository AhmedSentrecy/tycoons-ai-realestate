// Offline: the React pages' Arabic field wording matches the server pages for delivery text.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { arabicField } from "../src/lib/arabicFields.ts";
import { arabicInstallments, arabicDelivery } from "../src/lib/searchDisplay.ts";
const require = createRequire(import.meta.url);
const { arabicDisplay } = require("../netlify/functions/_display-text.cjs");
let checks = 0;
for (const stored of ["Delivery in 4.5 years", "Delivery within 3 months", "Within 2 years", "Delivery in 3-4 years", "Delivery in 2027", "Varies by phase", "9 Months", "3–12 Months", "1.5 years", "4 Years", "Delivery: September 2030", "Q2 2028", "Delivery in 2 years"]) {
  const client = arabicField(stored);
  assert.ok(!/[a-z]{3,}/i.test(client), `${stored} → ${client} has no English left`);
  assert.equal(client, arabicDisplay(stored), `${stored}: React and server pages read the same`);
  checks += 2;
}
assert.equal(arabicField("3 Bedrooms"), "3 غرف نوم"); checks += 1;
// Search cards: 3–10 years are «سنوات», 11+ «سنة».
for (const [stored, shown] of [["9 years", "تقسيط 9 سنوات"], ["12 years", "تقسيط 12 سنة"], ["2 years", "تقسيط سنتين"], ["1 year", "تقسيط سنة"]]) {
  assert.equal(arabicInstallments(stored), shown); checks += 1;
}
assert.equal(arabicDelivery("Delivery in 4 years"), "استلام خلال 4 سنوات"); checks += 1;
assert.equal(arabicField("9 years"), "9 سنوات"); checks += 1;
console.log(`Arabic field tests passed (${checks} checks; offline only).`);
