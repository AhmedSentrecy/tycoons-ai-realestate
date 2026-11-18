"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderStaticPage } = require("../netlify/functions/_seo-utils.cjs");

// The Organization schema is embedded in every rendered page.
const html = renderStaticPage("about");
const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const org = blocks.flat().find((item) => item && item["@id"] === "https://tycoons-inv.com/#organization" && item.sameAs);
assert.ok(org, "Organization schema with sameAs is on the page");
assert.ok(org.sameAs.includes("https://www.brownbook.net/business/56122776/tycoons-investments"), "verified Brownbook listing is in sameAs");
assert.ok(org.sameAs.includes("https://infoeg.com/cairo/page/894606"), "verified Egypt Directory listing is in sameAs");
for (const url of org.sameAs) assert.match(url, /^https:\/\//, `sameAs must be https: ${url}`);

// llms.txt: dated, and points agents at the guides and the price report.
const llms = fs.readFileSync(path.join(__dirname, "..", "public", "llms.txt"), "utf8");
assert.match(llms, /^Last updated: \d{4}-\d{2}-\d{2}$/m, "llms.txt has an update date");
assert.ok(llms.includes("https://tycoons-inv.com/ar/reports/new-cairo-prices-2026"), "llms.txt links the price report");
assert.ok(llms.includes("https://tycoons-inv.com/en/directory/"), "llms.txt links the English directory");
const links = llms.match(/\]\(https:\/\/tycoons-inv\.com[^)]*\)/g) || [];
assert.ok(links.length >= 16, `llms.txt keeps at least 16 site links (found ${links.length})`);

console.log("Entity signal checks passed");
