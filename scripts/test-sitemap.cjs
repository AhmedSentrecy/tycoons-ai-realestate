"use strict";

const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/sitemap.cjs");

const projects = [
  { id: "active", name: "Solana East", slug: "solana-east--ora", developer: "Ora", location: "New Cairo" },
  { id: "empty", name: "Regents Square", slug: "regents-square--al-dawlia-boutique-developments", developer: "Al Dawlia Boutique Developments", location: "New Cairo" },
  { id: "canonical", name: "One Ninety", slug: "one-ninety--lmd", developer: "LMD", location: "New Cairo" },
  { id: "duplicate", name: "One Ninety", slug: "one-ninety--lmd-2", developer: "LMD", location: "New Cairo" },
  { id: "unpriced", name: "Price on Request", slug: "price-on-request--developer-two", developer: "Developer Two", location: "New Cairo" },
];
const units = [
  { id: "unit-active", project_id: "active", project_name: "Solana East", developer: "Ora", location: "New Cairo", unit_type: "Apartment", bedrooms_text: "2 bedrooms", area_sqm: 120, starting_price: 12000000, description: "A complete available unit description suitable for indexing and regression coverage." },
  { id: "unit-canonical", project_id: "canonical", project_name: "One Ninety", developer: "LMD", location: "New Cairo", unit_type: "Office", bedrooms_text: "Open plan", area_sqm: 90, starting_price: 9000000, description: "A complete available office description suitable for indexing and regression coverage." },
  { id: "unit-unpriced", project_id: "unpriced", project_name: "Price on Request", developer: "Developer Two", location: "New Cairo", unit_type: "Villa", bedrooms_text: "4 bedrooms", area_sqm: 300, starting_price: null, description: "A legitimate available unit whose current price must be requested from the developer." },
];

const originalFetch = global.fetch;
global.fetch = async (url) => ({
  ok: true,
  json: async () => String(url).includes("/projects?") ? projects : units,
});

handler({}).then((response) => {
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /\/projects\/solana-east--ora/);
  assert.match(response.body, /\/projects\/one-ninety--lmd</);
  assert.match(response.body, /\/projects\/price-on-request--developer-two</);
  assert.doesNotMatch(response.body, /regents-square--al-dawlia-boutique-developments/);
  assert.doesNotMatch(response.body, /one-ninety--lmd-2/);
  console.log("Sitemap published-project eligibility validation passed.");
}).finally(() => {
  global.fetch = originalFetch;
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
