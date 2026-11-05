#!/usr/bin/env node
// «في سطور» facts box (GEO/AEO, Nov 2026): one builder for the pre-rendered page and the browser.
const assert = require("node:assert/strict");
const { projectFacts, projectFactsHtml, lastPriceUpdate } = require("../netlify/functions/_project-facts.cjs");
const units = [
  { unit_type: "Chalet", starting_price: 13942000, last_updated_at: "2026-11-04T10:00:00Z" },
  { unit_type: "Standalone Villa", starting_price: "40,000,000", last_updated_at: "2026-10-01T10:00:00Z" },
  { unit_type: "chalet", starting_price: 0, last_updated_at: "bad" },
];
const facts = projectFacts({ developer: "تطوير مصر", developerHref: "/ar/developers/tatweer-misr", area: "الساحل الشمالي", areaHref: "/ar/areas/north-coast", units });
const byLabel = Object.fromEntries(facts.map((fact) => [fact.label, fact]));
assert.equal(byLabel["المطور"].href, "/ar/developers/tatweer-misr");
assert.equal(byLabel["أنواع الوحدات المتاحة"].value, "شاليه، فيلا مستقلة", "unit types in Arabic, once each");
assert.equal(byLabel["الأسعار تبدأ من"].value, "13,942,000 جنيه", "lowest real price, Western digits");
assert.equal(byLabel["الوحدات المتاحة عندنا"].value, "3 وحدات");
assert.equal(byLabel["آخر تحديث للأسعار"].datetime, "2026-11-04", "newest valid price date");
assert.equal(lastPriceUpdate(units, "2026-07-26T00:00:00Z"), "2026-11-04T10:00:00Z", "schema date = newest of units and project");
assert.equal(lastPriceUpdate([], "2026-07-26T00:00:00Z"), "2026-07-26T00:00:00Z", "no units: the project date");
const none = projectFacts({ developer: "تطوير مصر", area: "الساحل الشمالي", units: [] });
assert.ok(!none.some((fact) => /الأسعار|تحديث|الوحدات/.test(fact.label)), "no units: no price, count or date (never “from 0”)");
const html = projectFactsHtml(facts, "فوكا باي في سطور");
assert.ok(html.includes("<dl") && html.includes('<time datetime="2026-11-04">') && html.includes('href="/ar/areas/north-coast"'), "a definition list with a machine-readable date");
assert.equal(projectFactsHtml(facts.slice(0, 1), "x"), "", "one fact is not a box");

const { renderProjectStatic } = require("./lib/data-pages.cjs");
const shell = `<!doctype html><html lang="ar" dir="rtl"><head><title>x</title><meta name="description" content="x"><link rel="canonical" href="https://tycoons-inv.com/"></head><body><div id="root"></div></body></html>`;
const page = renderProjectStatic(shell, { id: "p", name: "Fouka Bay", slug: "fouka-bay--tatweer-misr", developer: "Tatweer Misr", location: "Ras El Hekma, North Coast", status: "available", last_updated_at: "2026-07-26T00:00:00Z" },
  [{ id: "00000000-0000-4000-8000-000000000001", project_id: "p", unit_type: "Chalet", area_sqm: 120, starting_price: 13942000, last_updated_at: "2026-11-04T10:00:00Z" }], []);
assert.ok(page.indexOf("في سطور") > 0 && page.indexOf("في سطور") < page.indexOf("<article"), "facts box sits under the H1, before the article");
assert.ok(page.includes('"dateModified":"2026-11-04T10:00:00Z"'), "Article/listing dateModified follows the newest price update");
console.log("Project facts box tests passed (14 checks).");
