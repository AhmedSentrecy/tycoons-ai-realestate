// Smart search: the OpenAI function (mocked, no network) and the answer box built from the expert card.
import assert from "node:assert/strict";
import searchUnderstand, { cleanResult, config, understand } from "../netlify/functions/search-understand.js";
import { detectBedrooms, detectQuestion, expertAnswer, namesProject } from "../src/lib/searchUnderstanding.ts";
import { projectExpertFull } from "../src/lib/projectExperts.ts";

const ICITY = "mountain-view-icity-new-cairo--mountain-view";

// 1) The function sends the query to OpenAI with a strict schema and returns a clean result.
let sent: { url?: string; body?: Record<string, unknown> } = {};
const fakeFetch = (async (url: string, init: RequestInit) => {
  sent = { url, body: JSON.parse(String(init.body)) };
  return new Response(JSON.stringify({ output_text: JSON.stringify({ search_query: "آي سيتي التجمع", question: "rent", bedrooms: null, furnished: null }) }), { status: 200 });
}) as unknown as typeof fetch;
const result = await understand("الايجار فى اى سيتى التجمع كام", { OPENAI_API_KEY: "test", SEARCH_OPENAI_MODEL: "gpt-5-mini" }, fakeFetch);
assert.equal(sent.url, "https://api.openai.com/v1/responses");
assert.equal(sent.body?.model, "gpt-5-mini");
assert.deepEqual(result, { search_query: "آي سيتي التجمع", question: "rent", bedrooms: null, furnished: null });

// 2) Bad AI output is cleaned: unknown question → none, empty query → original, odd bedrooms → null.
assert.deepEqual(cleanResult({ search_query: "", question: "hack", bedrooms: 40, furnished: "yes" }, "شقة في التجمع"), {
  search_query: "شقة في التجمع", question: "none", bedrooms: null, furnished: null,
});

// 3) The endpoint refuses GET and bad input, and works without a key (falls back, no error page).
assert.equal(config.path, "/api/search-understand");
assert.equal((await searchUnderstand(new Request("https://x/api/search-understand"))).status, 405);
const bad = await searchUnderstand(new Request("https://x/api/search-understand", { method: "POST", body: JSON.stringify({ query: "a" }) }));
assert.equal(bad.status, 400);
const savedKey = process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;
const noKey = await searchUnderstand(new Request("https://x/api/search-understand", { method: "POST", body: JSON.stringify({ query: "شقة في التجمع" }) }));
assert.deepEqual(await noKey.json(), { ok: false, error: "not_configured" });
if (savedKey) process.env.OPENAI_API_KEY = savedKey;

// 4) Question detection works without the AI.
assert.equal(detectQuestion("الايجار فى اى سيتى التجمع كام"), "rent");
assert.equal(detectQuestion("العائد في آي سيتي"), "yield");
assert.equal(detectQuestion("اسعار ايجار ماونتن فيو اى سيتى"), "rent");
assert.equal(detectQuestion("نظام السداد في آي سيتي"), "payment");
assert.equal(detectQuestion("شقة في التجمع تحت 10 مليون"), "none");
assert.equal(detectBedrooms("ايجار شقة 3 غرف في آي سيتي"), 3);

// 5) The answer box uses only card numbers and never the disadvantage or ask-only items.
const rent = expertAnswer(ICITY, "rent");
assert.ok(rent);
assert.match(rent.lines.join(" "), /31,900/);
assert.match(rent.lines.join(" "), /25,000 لـ 55,000/);
const rent3 = expertAnswer(ICITY, "rent", 3, false);
assert.equal(rent3?.lines.length, 1);
assert.match(expertAnswer(ICITY, "yield")?.lines[0] ?? "", /1.86 مليون/);
assert.match(expertAnswer(ICITY, "payment")?.lines.join(" ") ?? "", /Club Park/);
// Name only → project overview box (plans, delivery, typical rent, advantage), never the disadvantage.
const overview = expertAnswer(ICITY, "none");
assert.match(overview?.title ?? "", /معلومات عن ماونتن فيو آي سيتي التجمع/);
assert.match(overview?.lines.join(" ") ?? "", /Club Park/);
assert.match(overview?.lines.join(" ") ?? "", /31,900/);
assert.doesNotMatch(JSON.stringify(overview), /Mivida|هايد بارك|أقل من/);

// The box shows only when the buyer names the project, not for a general area search.
assert.equal(namesProject(ICITY, "آي سيتي التجمع"), true);
assert.equal(namesProject(ICITY, "اسعار ايجار ماونتن فيو اى سيتى"), true);
assert.equal(namesProject(ICITY, "iCity New Cairo"), true);
assert.equal(namesProject(ICITY, "شقة في التجمع تحت 10 مليون"), false);
assert.equal(namesProject(ICITY, "الايجار في التجمع"), false);

// No listing-website names reach buyers, the voice assistant or the MCP.
const publicText = JSON.stringify([projectExpertFull(ICITY), ...["none", "rent", "yield", "payment", "delivery"].map((q) => expertAnswer(ICITY, q as "rent"))]);
assert.doesNotMatch(publicText, /Property Finder|Bayut|Aqarmap|Nawy|Dubizzle/i);
assert.match(expertAnswer(ICITY, "rent")?.note ?? "", /متوسط أسعار الإيجار المطلوبة في السوق \(يوليو–أغسطس 2026\)/);
assert.equal(expertAnswer("unknown-project", "rent"), null);
const everything = JSON.stringify(["rent", "yield", "payment", "delivery"].map((q) => expertAnswer(ICITY, q as "rent")));
assert.doesNotMatch(everything, /Core|تأخير|كورونا|COVID|wa_message_log/);

// iCity October card: its own boxes, and each area word picks the right iCity.
const OCTOBER = "mountain-view-icity-october--mountain-view";
assert.equal(namesProject(OCTOBER, "آي سيتي أكتوبر"), true);
assert.equal(namesProject(OCTOBER, "آي سيتي التجمع"), false);
assert.equal(namesProject(ICITY, "اي سيتي اكتوبر"), false);
assert.match(expertAnswer(OCTOBER, "rent")?.lines[0] ?? "", /27,500 جنيه في الشهر، من 22,000 لـ 35,000/);
assert.match(expertAnswer(OCTOBER, "payment")?.lines.join(" ") ?? "", /على 14 سنة/);
assert.match(expertAnswer(OCTOBER, "yield")?.lines[0] ?? "", /2.24 مليون/);
const octoberText = JSON.stringify([projectExpertFull(OCTOBER), ...["none", "rent", "yield", "payment", "delivery"].map((q) => expertAnswer(OCTOBER, q as "rent"))]);
assert.doesNotMatch(octoberText, /Property Finder|Bayut|Aqarmap|Nawy|Dubizzle|3117|3766/i);
assert.doesNotMatch(JSON.stringify(expertAnswer(OCTOBER, "none")), /منافسة من الريسيل/);

// Madinet Masr: short names with a digit, phases share the main card, and Mostakbal City alone names no project.
if (namesProject("d2n--madinet-masr", "d2n")) {
  assert.equal(namesProject("d2n--madinet-masr", "مكاتب D2N"), true);
  assert.equal(namesProject("the-butterfly--madinet-masr", "بترفلاي مستقبل سيتي"), true);
  assert.equal(namesProject("mountain-view-aliva--mountain-view", "بترفلاي مستقبل سيتي"), false, "Aliva is not named by «مستقبل سيتي»");
  assert.equal(namesProject("taj-city-origami--madinet-masr", "تاج سيتي مدينة مصر"), true, "developer name never rules a project out");
}

console.log("Smart search understanding and expert answer checks passed");
