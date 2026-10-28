import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fitTitle, priceShortAr } from "../src/lib/fitTitle.ts";
import { unitTitle } from "../src/lib/unitTitle.ts";

const require = createRequire(import.meta.url);
const cjs = require("../netlify/functions/_display-text.cjs");
const pages = require("./lib/data-pages.cjs");

const samples = [
  "Mountain View iCity New Cairo Prices 2026 — Units, Payment Plans & Delivery | Tycoons",
  "مشاريع القاهرة الجديدة 2026 — الأسعار والمطورين (101 مشروع) من 2,805,000 جنيه | Tycoons",
  "ماونتن فيو اي سيتي التجمع الخامس 2026 — الأسعار والمساحات وخطط السداد | Tycoons",
  "Caesar | الأسعار وخطط السداد 2026",
  "A".repeat(90),
];
let checks = 0;
for (const sample of samples) {
  const fitted = fitTitle(sample);
  assert.equal(fitted, cjs.fitTitle(sample), "app and server titles match");
  assert.ok(fitted.length <= 60, `fits 60: ${fitted}`);
  assert.ok(!/[(—|:,،]\s*$/.test(fitted), `no dangling separator: ${fitted}`);
  checks += 3;
}
assert.equal(fitTitle("Caesar | الأسعار وخطط السداد 2026"), "Caesar | الأسعار وخطط السداد 2026", "short titles untouched"); checks += 1;
assert.equal(priceShortAr(50263000), "50.26 مليون"); assert.notEqual(priceShortAr(11869155), priceShortAr(11920155)); assert.equal(priceShortAr(9400000), "9.4 مليون"); assert.equal(priceShortAr(980000), "980 ألف"); assert.equal(priceShortAr(0), ""); checks += 5;

// Same type and size, different price: different titles, identical in app and static page.
const a = unitTitle("فيلا", "3 bedrooms", 221, "Caesar", 50263000);
const b = unitTitle("فيلا", "3 bedrooms", 221, "Caesar", 59241000);
assert.notEqual(a, b, "price separates same-size units");
assert.equal(a, pages.unitTitle("فيلا", "3 bedrooms", 221, "Caesar", 50263000), "app and static unit titles match");
checks += 2;
console.log(`Title fitting tests passed (${checks} checks).`);
