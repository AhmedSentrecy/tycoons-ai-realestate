"use strict";

const assert = require("node:assert/strict");
const englishHome = require("./lib/english-home.cjs");

const shell = `<!doctype html><html lang="ar" dir="rtl"><head><title>Arabic homepage</title><meta name="description" content="Arabic description"><link rel="canonical" href="https://tycoons-inv.com/"><meta property="og:url" content="https://tycoons-inv.com/"><meta property="og:locale" content="ar_EG"><script type="application/ld+json">{"@type":"FAQPage"}</script></head><body><div id="root"><main><h1>Arabic home</h1></main></div></body></html>`;
const html = englishHome(shell);
assert.match(html, /<html lang="en" dir="ltr">/);
assert.match(html, /<link rel="canonical" href="https:\/\/tycoons-inv\.com\/en\/">/);
assert.match(html, /<h1[^>]*>Tell us what you have in mind/);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.match(html, /\/en\/areas\/mostakbal-city/);
assert.match(html, /\/en\/areas\/new-cairo/);
assert.match(html, /\/en\/developers\/mountain-view/);
assert.match(html, /\/en\/guides\/payment-plan-comparison\//);
assert.match(html, /\/methodology/);
assert.match(html, /prices and availability can change/i);
assert.doesNotMatch(html, /Arabic home|Arabic description|"@type":"FAQPage"/);
assert.ok((html.match(/<a href="/g) || []).length >= 12, "English crawlable homepage must have area/developer/guide links");
// One source for the crawlable HTML and the React page, so the sections survive JavaScript (SEO-01).
const fs = require("node:fs");
const sections = require("../src/content/english-home-sections.json").html;
for (const marker of ["Price per square metre by area", "Project guides in English", "Payment plans you will see", "Ahmed Mahmoud"]) {
  assert.ok(sections.includes(marker), `shared sections missing: ${marker}`);
}
assert.ok(html.includes(sections), "the /en/ HTML must embed the shared sections verbatim");
assert.equal((sections.match(/href="\/en\/projects\//g) || []).length, 13, "13 English project guide links");
assert.doesNotMatch(sections, /<h1\b/, "shared sections must not add a second H1");
const homeTsx = fs.readFileSync(require("node:path").join(__dirname, "../src/pages/Home.tsx"), "utf8");
assert.match(homeTsx, /english-home-sections\.json/, "Home.tsx must render the same shared sections");
assert.match(homeTsx, /englishHomeSections\.html/);
console.log("English homepage HTML, metadata, intent and internal link validation passed.");
