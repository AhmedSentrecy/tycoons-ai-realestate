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
assert.match(html, /\/en\/guides\/new-cairo-property-prices\//);
assert.match(html, /\/methodology/);
assert.match(html, /prices and availability can change/i);
assert.doesNotMatch(html, /Arabic home|Arabic description|"@type":"FAQPage"/);
assert.ok((html.match(/<a href="/g) || []).length >= 12, "English crawlable homepage must have area/developer/guide links");
console.log("English homepage HTML, metadata, intent and internal link validation passed.");
