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
const articles = [
  { slug: "published-guide", language: "ar", status: "published", published_at: "2026-10-08T00:00:00Z", updated_at: "2026-10-08T00:00:00Z" },
  { slug: "draft-guide", language: "ar", status: "draft", published_at: null, updated_at: "2026-10-08T00:00:00Z" },
];

const originalFetch = global.fetch;
global.fetch = async (url) => ({
  ok: true,
  json: async () => String(url).includes("/projects?") ? projects : String(url).includes("/published_editorial_articles?") ? articles : units,
});

handler({}).then((response) => {
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /\/projects\/solana-east--ora/);
  assert.match(response.body, /\/projects\/one-ninety--lmd</);
  assert.match(response.body, /\/projects\/price-on-request--developer-two</);
  assert.doesNotMatch(response.body, /regents-square--al-dawlia-boutique-developments/);
  assert.doesNotMatch(response.body, /one-ninety--lmd-2/);
  assert.match(response.body, /\/guides\/published-guide\//);
  assert.doesNotMatch(response.body, /draft-guide/);
  console.log("Sitemap published-project eligibility validation passed.");
  global.fetch = async (url) => {
    if (String(url).includes("/published_editorial_articles?")) return { ok: false, status: 404, json: async () => ({ code: "PGRST205" }) };
    return { ok: true, status: 200, json: async () => String(url).includes("/projects?") ? projects : units };
  };
  return handler({});
}).then((withoutMigration) => {
  assert.equal(withoutMigration.statusCode, 200, "missing additive article storage must not break the established sitemap");
  assert.doesNotMatch(withoutMigration.body, /published-guide/);
}).finally(() => {
  global.fetch = originalFetch;
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
