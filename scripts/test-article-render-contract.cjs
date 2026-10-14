"use strict";
const assert = require("node:assert/strict");
const { renderSafeMarkdown: render } = require("../netlify/functions/_article-render.cjs");
let assertions = 0;
for (const route of ["/en/projects/example-project", "/en/guides/price-guide/", "/projects/example-project", "/guides/example/", "/units/123-ab", "/en/areas/new-cairo", "/ar/developers/sodic", "/methodology", "/contact"]) {
  assert.match(render(`[Read](${route})`), /<a href="[^\"]+">Read<\/a>/);
  assertions += 1;
}
for (const route of ["javascript:alert(1)", "//evil.example", "https://developer.example", "/en/projects/a%22onclick", "/en/projects/../../admin", "/%2f%2fevil.example", "/en/projects/a?next=evil", "/en/projects/a\\b"]) {
  assert.doesNotMatch(render(`[Read](${route})`), /<a\b/);
  assertions += 1;
}
const en = render("## Compare\n\n| Project | Price |\n| --- | ---: |\n| [Alpha](/en/projects/alpha) | **8,000,000** |\n| Beta | On request |\n\nAfter table.");
assert.match(en, /<thead><tr><th scope="col">Project<\/th>/);
assert.match(en, /<td><a href="\/en\/projects\/alpha">Alpha<\/a><\/td>/);
assert.match(en, /<td><strong>8,000,000<\/strong><\/td>/);
assert.match(en, /<p>After table\.<\/p>/);
assert.equal((en.match(/<table>/g) || []).length, 1);
const ar = render("المشروع | التشطيب\n--- | ---\nألفا | كامل\nبيتا | نصف تشطيب");
assert.match(ar, /<th scope="col">المشروع<\/th>/);
assert.match(ar, /<td>نصف تشطيب<\/td>/);
const safe = render('| <script>alert(1)</script> | Details |\n| --- | --- |\n| <img src=x onerror=alert(1)> | [Bad](javascript:alert) |');
assert.doesNotMatch(safe, /<script|<img|<a href="javascript/);
assert.match(safe, /&lt;script&gt;/);
assert.match(render("A | B\n--- | ---\nX \\| Y | Z"), /<td>X \| Y<\/td>/);
assert.doesNotMatch(render("ordinary | prose\nnot a divider"), /<table>/);
assert.match(render("A | B\n--- | ---\nmalformed | row | three"), /<p>malformed \| row \| three<\/p>/);
assert.match(render("- before\n\nA | B\n--- | ---\nx | y\n\n- after"), /<\/ul>\n<div[\s\S]*<\/div>\n<ul>/);
assert.match(render('## Title\n\n- **One**\n- Two'), /<h2>Title<\/h2>\n<ul><li><strong>One<\/strong><\/li><li>Two<\/li><\/ul>/);
assertions += 14;
console.log(`Article render contract: ${assertions} checks passed.`);
