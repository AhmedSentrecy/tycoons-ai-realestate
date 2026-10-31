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
// A space inside the link brackets still makes a real link (audit SEO-06), never raw "]( /".
const spaced = render("شوف [بلوتري]( /projects/bluetree--sky-ad ) و[وحدة]( /units/2ac73e78-2dfd-412f-b889-80b3db8ca1d0)");
assert.match(spaced, /<a href="\/projects\/bluetree--sky-ad">بلوتري<\/a>/);
assert.match(spaced, /<a href="\/units\/2ac73e78-2dfd-412f-b889-80b3db8ca1d0">وحدة<\/a>/);
assert.doesNotMatch(spaced, /\]\(/);
assert.doesNotMatch(render("[Bad]( https://evil.example )"), /<a /);
assertions += 4;
// Links to units that no longer have a page become plain text when live ids are given (SEO-05).
const liveId = "11111111-1111-4111-8111-111111111111";
const goneId = "22222222-2222-4222-8222-222222222222";
const withUnits = render(`[حية](/units/${liveId}) و[اتباعت]( /units/${goneId} ) و[مشروع](/projects/a-b)`, { liveUnitIds: new Set([liveId]) });
assert.match(withUnits, new RegExp(`<a href="/units/${liveId}">حية</a>`));
assert.doesNotMatch(withUnits, new RegExp(goneId));
assert.match(withUnits, /اتباعت/);
assert.match(withUnits, /<a href="\/projects\/a-b">مشروع<\/a>/);
assert.match(render(`[x](/units/${goneId})`), new RegExp(`<a href="/units/${goneId}">`), "no live list: links kept");
assertions += 5;
console.log(`Article render contract: ${assertions} checks passed.`);
