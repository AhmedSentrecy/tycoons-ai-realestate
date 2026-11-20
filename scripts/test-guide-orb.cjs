"use strict";
// Page guide orb: facts from a real project page, the number guard on AI lines, the cache,
// the budget, the Claude → OpenAI fallback and the cost log. No network: every call is faked.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderProject, renderCollection, groupProjects } = require("../netlify/functions/_seo-utils.cjs");
const { parsePath, extractFacts, fallbackLines, checkLine, developerFacts, numbersIn } = require("../netlify/functions/_orb-facts.cjs");
const { getLines, mergeLines, costUsd, cairoStarts, providerOrder } = require("../netlify/functions/orb-lines.cjs");

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks += 1; };

// ---------- paths ----------
eq(parsePath("/projects/mountain-view-aliva--mountain-view").type, "projects", "project path");
eq(parsePath("/ar/developers/mountain-view").slug, "mountain-view", "developer path");
ok(parsePath("/en/areas/new-cairo").en, "English path");
for (const bad of ["/", "/en/", "/admin", "/sales-war-room/a/x", "/projects/../admin", "https://evil.com/x", "/projects/<script>"]) {
  eq(parsePath(bad), null, `rejected path ${bad}`);
}

// ---------- facts from a rendered project page ----------
const slug = "mountain-view-aliva--mountain-view";
const units = [1, 2, 3].map((i) => ({ id: `u${i}`, project_id: "p1", project_name: "Aliva", developer: "Mountain View", location: "Mostakbal City", unit_type: i === 3 ? "iVilla" : "Apartment", bedrooms_text: `${i + 1} bedrooms`, area_sqm: 120 + i * 40, starting_price: 9000000 + i * 2500000, availability_status: "available", delivery_text: "2029", description: "x", last_updated_at: "2026-11-10T00:00:00Z" }));
const project = { id: "p1", name: "Aliva", slug, developer: "Mountain View", location: "Mostakbal City", article_sections: [], faq: [], last_updated_at: "2026-11-10" };
const html = renderProject(groupProjects(units, [project]), slug, "ar");
const NOW = Date.parse("2026-11-20T12:00:00+02:00");
const { name, facts } = extractFacts(html, parsePath(`/projects/${slug}`), { now: NOW });
const all = facts.map((f) => f.text).join("\n");
ok(name.includes("أليفا"), "page name from the H1");
ok(/14 سنة/.test(all), "offer: instalments up to 14 years");
ok(/قسط شهري من 20 ألف/.test(all), "offer: monthly instalment from 20 thousand");
ok(/2%/.test(all), "offer: 2% first payment");
ok(/11,500,000/.test(all), "price: starting price from the page");
ok(/2029/.test(all), "delivery year from the table");
ok(facts.some((f) => f.topic === "developer" && /iVilla/.test(f.text)), "developer signature: iVilla");
ok(facts[0].topic === "offer", "the offer comes first");
ok(facts.every((f) => f.text.length <= 230), "facts fit the bubble");
ok(!/واتساب|whatsapp|اطلب أحدث/i.test(all), "no page furniture in the facts");

// The offer stops after its last day.
const later = extractFacts(html, parsePath(`/projects/${slug}`), { now: Date.parse("2027-01-05T12:00:00+02:00") }).facts;
ok(!later.some((f) => f.source === "offer" && /14 سنة/.test(f.text)), "expired offer is not said");

// Developer page facts.
const dev = developerFacts("mountain-view", false);
ok(dev.length >= 3 && /iVilla/.test(dev[0].text), "developer page leads with what the developer is known for");
ok(developerFacts("sodic", false).some((f) => /Nobu/.test(f.text)), "SODIC: first Nobu Residences in Egypt");
const devPage = renderCollection(groupProjects(units, [project]), "developer", "mountain-view", "ar");
const devFacts = extractFacts(devPage, parsePath("/ar/developers/mountain-view"), { now: NOW }).facts;
ok(/iVilla/.test(devFacts[0].text), "developer page: the first thing the orb says is what the developer is known for");
ok(devFacts.every((f) => f.text.length <= 230), "developer facts fit the bubble");

// ---------- free lines ----------
const free = fallbackLines(facts, false);
eq(free.length, facts.length, "one free line per fact");
ok(free.every((l) => !l.ai && l.facts.length === 1), "free lines point to their fact");

// ---------- number guard ----------
const texts = facts.map((f) => f.text);
ok(checkLine("تعرف إن أليفا فيها تقسيط لحد 14 سنة؟", texts), "AI line with a real number passes");
ok(checkLine("قسط شهري يبدأ من ٢٠ ألف جنيه بس", texts), "Arabic digits are checked the same way");
ok(!checkLine("تقسيط لحد 15 سنة", texts), "15 years is not in the facts (15% is a discount, not years)");
ok(!checkLine("الأسعار بتبدأ من 9 مليون", texts), "invented price is refused");
ok(!checkLine("شوف https://x.com", texts), "links are refused");
eq(numbersIn("١١٬٥٠٠٬٠٠٠ جنيه و 2.5%"), ["11500000", "2.5"], "numbers normalised");

const merged = mergeLines({ lines: [
  { fact_ids: [facts[0].id], topic: "offer", text: "تعرف إن فيه عرض جديد بتقسيط لحد 14 سنة؟" },
  { fact_ids: [facts[0].id], topic: "offer", text: "تقسيط لحد 20 سنة!" },
  { fact_ids: ["nope"], topic: "offer", text: "خصم 90%" },
] }, facts, free);
eq(merged.kept, 1, "one AI line kept");
eq(merged.dropped, 2, "invented numbers and unknown facts dropped");
ok(merged.lines[0].ai && merged.lines.slice(1).every((l) => !l.facts.includes(facts[0].id)), "free lines fill the facts the AI did not use");

// ---------- cost ----------
eq(costUsd("anthropic", 2000, 800, {}), 0.0006, "Haiku 5.5: 2,000 in + 800 out = $0.0006");
eq(costUsd("openai", 2000, 800, {}), 0.0021, "gpt-5-mini: 2,000 in + 800 out = $0.0021");
eq(costUsd("anthropic", 1e6, 0, { ORB_ANTHROPIC_INPUT_USD_PER_MILLION: "0.2" }), 0.2, "price override");
eq(cairoStarts(Date.parse("2026-11-20T23:30:00Z")).day, "2026-11-20T22:00:00.000Z", "Cairo day starts at local midnight");
eq(providerOrder({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" }), ["anthropic", "openai"], "Claude first by default");
eq(providerOrder({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", ORB_PROVIDER: "openai" }), ["openai", "anthropic"], "OpenAI first when chosen");

// ---------- the function, end to end (fake site, fake AI, fake database) ----------
function fakeDb({ rows = {}, spent = 0 } = {}) {
  const usage = [];
  const saved = {};
  return {
    usage, saved, rows,
    get: async (p, h) => rows[`${p}|${h}`] || null,
    claim: async (row) => { const k = `${row.path}|${row.facts_hash}`; if (rows[k]) return false; rows[k] = { ...row, updated_at: new Date().toISOString() }; return true; },
    reclaim: async () => true,
    save: async (p, h, patch) => { saved[`${p}|${h}`] = patch; rows[`${p}|${h}`] = { ...(rows[`${p}|${h}`] || {}), ...patch }; },
    logUsage: async (row) => { usage.push(row); },
    spentSince: async () => spent,
  };
}

function fakeFetch({ anthropic, openai, calls }) {
  return async (url, init = {}) => {
    calls.push(String(url));
    const json = (status, body) => ({ ok: status < 400, status, headers: { get: (h) => (h === "content-type" ? "application/json" : null) }, json: async () => body, text: async () => JSON.stringify(body) });
    if (String(url).startsWith("https://tycoons-inv.com/")) return { ok: true, status: 200, headers: { get: () => "text/html; charset=utf-8" }, text: async () => html };
    if (String(url).includes("api.anthropic.com")) {
      const body = JSON.parse(init.body);
      assert.equal(body.model, "claude-haiku-5-5");
      ok(body.system.includes("ممنوع تضيف أي رقم"), "prompt forbids new numbers");
      return anthropic();
    }
    if (String(url).includes("api.openai.com")) return openai();
    throw new Error(`unexpected ${url}`);
  };
}

const aiReply = (text) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ content: [{ type: "text", text: JSON.stringify({ lines: [{ fact_ids: [facts[0].id], topic: "offer", text }] }) }], usage: { input_tokens: 2100, output_tokens: 700 } }) });
const env = { ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", URL: "https://tycoons-inv.com" };

(async () => {
  // First visitor: Claude writes the lines once, the cost is logged.
  let calls = [];
  const db = fakeDb();
  let result = await getLines(`/projects/${slug}`, { env, now: NOW, db, fetchImpl: fakeFetch({ calls, anthropic: () => aiReply("تعرف إن أليفا فيها عرض بتقسيط لحد 14 سنة؟"), openai: () => { throw new Error("not needed"); } }) });
  eq(result.body.source, "ai", "first visit: AI lines");
  ok(result.body.lines[0].ai && /14 سنة/.test(result.body.lines[0].text), "AI line first");
  eq(db.usage.length, 1, "one AI call logged");
  eq(db.usage[0].provider, "anthropic", "logged provider");
  eq(db.usage[0].cost_usd, costUsd("anthropic", 2100, 700, {}), "logged cost");
  ok(Object.values(db.saved)[0].status === "ready", "lines saved to the cache");

  // Next visitor: from the cache, no AI call.
  calls = [];
  result = await getLines(`/projects/${slug}`, { env, now: NOW, db, fetchImpl: fakeFetch({ calls, anthropic: () => { throw new Error("must not call"); }, openai: () => { throw new Error("must not call"); } }) });
  eq(result.body.source, "cache", "second visit: from the cache");
  ok(!calls.some((u) => /anthropic|openai/.test(u)), "no AI call for a cached page");
  eq(db.usage.length, 1, "still one AI call");

  // Claude fails → OpenAI writes the lines; both calls are logged.
  calls = [];
  const db2 = fakeDb();
  const openaiReply = () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ output_text: JSON.stringify({ lines: [{ fact_ids: [facts[1].id], topic: "offer", text: "احجز بأول دفعة 2% بس." }] }), usage: { input_tokens: 2000, output_tokens: 500 } }) });
  result = await getLines(`/projects/${slug}`, { env, now: NOW, db: db2, fetchImpl: fakeFetch({ calls, anthropic: () => ({ ok: false, status: 529, headers: { get: () => null }, json: async () => ({ error: { message: "overloaded" } }) }), openai: openaiReply }) });
  eq(result.body.source, "ai", "OpenAI fallback wrote the lines");
  eq(db2.usage.map((u) => [u.provider, u.ok]), [["anthropic", false], ["openai", true]], "both attempts logged");
  eq(db2.usage[1].cost_usd, costUsd("openai", 2000, 500, {}), "OpenAI cost logged");

  // Over the daily budget: free lines, no AI call.
  calls = [];
  const db3 = fakeDb({ spent: 1.5 });
  result = await getLines(`/projects/${slug}`, { env, now: NOW, db: db3, fetchImpl: fakeFetch({ calls, anthropic: () => { throw new Error("must not call"); }, openai: () => { throw new Error("must not call"); } }) });
  eq(result.body.source, "free", "over budget: free lines");
  ok(result.body.lines.length === facts.length, "all free lines returned");
  eq(db3.usage.length, 0, "nothing spent over budget");

  // No database key: free lines only (no AI without a cost log).
  calls = [];
  result = await getLines(`/projects/${slug}`, { env, now: NOW, db: null, fetchImpl: fakeFetch({ calls, anthropic: () => { throw new Error("must not call"); }, openai: () => { throw new Error("must not call"); } }) });
  eq(result.body.source, "free", "no cost log: no AI");

  // ORB_AI=off.
  result = await getLines(`/projects/${slug}`, { env: { ...env, ORB_AI: "off" }, now: NOW, db: fakeDb(), fetchImpl: fakeFetch({ calls: [], anthropic: () => { throw new Error("off"); }, openai: () => { throw new Error("off"); } }) });
  eq(result.body.source, "free", "AI switched off");

  // Unsupported path.
  result = await getLines("/admin", { env, db: fakeDb(), fetchImpl: async () => { throw new Error("must not fetch"); } });
  eq(result.status, 400, "admin path refused");

  // ---------- the browser script ships and is loaded everywhere ----------
  const root = path.join(__dirname, "..");
  const script = fs.readFileSync(path.join(root, "public/guide-orb.js"), "utf8");
  new Function(script); // parses
  ok(/HIDDEN = .*admin.*sales-war-room/.test(script), "orb hidden on internal pages");
  ok(/sessionStorage/.test(script) && /SEEN_KEY/.test(script), "lines are not repeated in a visit");
  ok(/energy > 0\.02/.test(script), "orb stops drawing when idle");
  ok(fs.readFileSync(path.join(root, "index.html"), "utf8").includes('<script src="/guide-orb.js" defer></script>'), "SPA shell loads the orb");
  ok(fs.readFileSync(path.join(root, "netlify/functions/_seo-utils.cjs"), "utf8").includes('<script src="/guide-orb.js" defer></script>'), "server pages load the orb");
  ok(/guide-orb/.test(fs.readFileSync(path.join(root, "scripts/lib/page-shell.cjs"), "utf8")), "static pages keep the orb script");
  ok(html.includes("/guide-orb.js"), "rendered project page loads the orb");

  // ---------- new theme and sky on server pages ----------
  ok(/<html lang="ar" dir="rtl" data-sky="on">/.test(html), "server pages ask for the sky");
  ok(html.includes('<script src="/site-sky.js" defer></script>'), "server pages load the sky script");
  ok(!/#14352a|#f7f2ea|#c49b5f/i.test(html.replace(/<script\b[\s\S]*?<\/script>/gi, "")), "old green/cream palette is gone from server pages");
  ok(/#0b1b30/.test(html), "navy ink is used");
  const sky = fs.readFileSync(path.join(root, "public/site-sky.js"), "utf8");
  new Function(sky);
  ok(!/getContext\(|createElement\("canvas"\)/.test(sky), "server-page sky uses no canvas");
  ok(/data-sky/.test(sky), "sky only where the page asks for it");
  console.log(`Guide orb tests passed (${checks} checks).`);
})().catch((error) => { console.error(error); process.exit(1); });
