"use strict";
// Offline only: web research step, research-fact sanitizing, web source citations,
// public display of reviewed fact lines, and the corrected writing rules.
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const gen = require("../netlify/functions/_article-generation.cjs");
const { renderEditorialArticle } = require("../netlify/functions/_seo-utils.cjs");
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };
const event = (body) => ({ body: JSON.stringify(body) });
const projects = [{ id: "project-1", name: "5A", slug: "5a--waterway", developer: "Waterway", location: "New Cairo" }];

(async () => {
  // ---- request parsing ----
  const research = gen.parseRequest(event({ action: "research", target_type: "project", project_id: "project-1", language: "ar", topic: "هل 5A مناسب للاستثمار" }));
  check(research.action === "research", "research is an accepted action");
  assert.throws(() => gen.parseRequest(event({ action: "research", target_type: "project", topic: "x" })), /topic_required/); checks += 1;
  const draft = gen.parseRequest(event({
    action: "draft", target_type: "project", project_id: "project-1", language: "ar", topic: "هل 5A مناسب للاستثمار",
    research_facts: [
      { fact: "يقع المشروع على امتداد شارع التسعين الشمالي في القاهرة الجديدة.", category: "location", confidence: "official", sources: [{ url: "https://waterway.example/5a#top", title: "Waterway" }] },
      { fact: "أسعار الوحدات تبدأ من مبلغ مرتفع حسب الموقع.", category: "other", confidence: "corroborated", sources: [{ url: "https://portal.example/5a", title: "Portal" }] },
      { fact: "معلومة من مصدر واحد عن المشروع.", category: "other", confidence: "single", sources: [{ url: "https://portal.example/x", title: "x" }] },
      { fact: "رابط غير آمن لمعلومة عن الموقع.", category: "location", confidence: "official", sources: [{ url: "http://insecure.example", title: "x" }] },
      { fact: "يقع المشروع على امتداد شارع التسعين الشمالي في القاهرة الجديدة.", category: "location", confidence: "official", sources: [{ url: "https://waterway.example/5a", title: "dup" }] },
    ],
  }));
  check(draft.researchFacts.length === 1, `only safe, corroborated, non-commercial, unique facts survive (got ${draft.researchFacts.length})`);
  check(draft.researchFacts[0].sources[0].url === "https://waterway.example/5a", "source URLs are normalized without fragments");

  // ---- research request + output ----
  const request = gen.buildResearchRequest(research, projects);
  check(request.tools?.[0]?.type === "web_search" && request.max_tool_calls <= 8, "research uses bounded web search");
  check(/Never collect prices/.test(request.input[0].content) && /untrusted data/.test(request.input[0].content), "research forbids commercial facts and treats pages as data");
  check(request.text.format.schema.properties.facts.items.properties.sources.minItems === 1, "every fact must carry a source");
  const output = { facts: [
    { fact: "المطور هو Waterway صاحب مشاريع معروفة في القاهرة الجديدة.", category: "developer", confidence: "official", sources: [{ url: "https://waterway.example/about", title: "About" }] },
    { fact: "مقدم الحجز يبدأ من نسبة بسيطة.", category: "other", confidence: "corroborated", sources: [{ url: "https://portal.example/a", title: "a" }] },
    { fact: "المشروع قريب من الجامعة الأمريكية.", category: "location", confidence: "single", sources: [{ url: "https://portal.example/b", title: "b" }] },
    { fact: "بدون مصدر", category: "other", confidence: "official", sources: [{ url: "javascript:alert(1)", title: "x" }] },
  ], notes: "تعارض في المساحة الكلية بين موقعين." };
  const parsed = gen.parseOpenAiOutput({ status: "completed", output_text: JSON.stringify(output) }, "research", { input: research, projects });
  check(parsed.generated_as === "research" && parsed.facts.length === 1, "research keeps only usable facts");
  check(parsed.excluded.some((fact) => fact.reason === "commercial") && parsed.excluded.some((fact) => fact.reason === "single_source"), "commercial and single-source facts are shown as excluded");
  check(!JSON.stringify(parsed).includes("javascript:"), "unsafe source URLs are dropped");

  // ---- draft request carries approved facts; rules fixed ----
  const draftRequest = gen.buildOpenAiRequest(draft, projects, []);
  const userPayload = draftRequest.input[1].content;
  check(/research_facts/.test(userPayload) && !/waterway\.example/.test(userPayload), "approved facts reach the model without URLs");
  const rules = draftRequest.input[0].content;
  check(/never spell them out phonetically/.test(rules), "keyword keeps project names like 5A as written");
  check(/Never transliterate Arabic words phonetically/.test(rules), "slug uses real English words");
  check(/القاهرة الجديدة/.test(rules), "Arabic drafts localize place names");
  check(/Never write takeaways about verification/.test(rules) && /Never ask about this website/.test(rules), "takeaways and FAQ must be about the project");
  check(/قبل ما تقرر/.test(rules) && !/مصادر ومراجعة/.test(rules), "closing section is reader-facing");
  const refs = gen.webSourceRefs(draft.researchFacts);
  check(refs.length === 1 && refs[0].type === "web" && refs[0].url.startsWith("https://"), "web citations become source refs");

  // ---- review accepts web refs as citations only ----
  const { assessArticleReview } = await import(pathToFileURL(path.join(root, "server/tycoons-admin/article-review.mjs")));
  const base = { language: "ar", target_type: "project", project_id: "project-1", area_name: null, title: "دليل 5A", slug: "5a-waterway-guide", excerpt: "مقدمة", meta_title: "دليل 5A", meta_description: "وصف", body_markdown: "مشروع 5A في القاهرة الجديدة.", source_refs: [{ type: "project", id: "project-1", label: "5A", url: "/projects/5a--waterway" }] };
  const blockers = (article) => assessArticleReview(article, { projects, units: [] }).filter((issue) => issue.severity === "blocker");
  check(blockers(base).length === 0, "baseline article has no blockers");
  check(blockers({ ...base, source_refs: [...base.source_refs, ...refs] }).length === 0, "valid web citations are accepted");
  check(blockers({ ...base, source_refs: [...base.source_refs, { type: "web", id: "w", label: "x", url: "http://insecure.example" }] }).some((issue) => issue.code === "source_reference_invalid"), "insecure web citations block");
  check(blockers({ ...base, source_refs: refs }).some((issue) => issue.code === "source_grounding_missing"), "web citations alone never ground an article");
  check(blockers({ ...base, title: "دليل 5A waterway", slug: "5a-waterway-new-cairo-investment", focus_keyword: "كمبوند 5A التجمع الخامس" }).length === 0, "project-name digits are allowed in keyword, title and slug");

  // ---- Arabic prefixes attached to digit-bearing project names ----
  for (const heading of ["## ازاي توصل لـ5A التجمع الخامس؟", "زيارة ل5A", "مكاتب بـ5A", "و5A مشروع تجاري", "الوصول إلى 5A"]) {
    check(!blockers({ ...base, body_markdown: `مشروع 5A.\n${heading}` }).some((issue) => issue.code === "unsupported_numeric_claim"), `attached Arabic prefix keeps 5A a name: ${heading}`);
  }
  for (const claim of ["5A فيه 3 مداخل", "لـ5A مساحة 40 فدان", "مول5A"]) {
    check(blockers({ ...base, body_markdown: `مشروع 5A.\n${claim}` }).some((issue) => issue.code === "unsupported_numeric_claim"), `real numbers next to the name still block: ${claim}`);
  }
  check(/Never attach an Arabic preposition/.test(rules) && /start with the exact focus_keyword/.test(rules) && /never call a commercial or administrative project a compound/.test(rules) && /at least 900/.test(rules), "draft rules: no attached prefixes, keyword in description, minimum length");
  const topicRules = gen.buildOpenAiRequest({ action: "topics", language: "ar", targetType: "project", topic: "" }, projects, []).input[0].content;
  check(/التجمع الخامس/.test(topicRules) && /never topics about requesting documents/.test(topicRules), "topic rules: Arabic places and buyer topics");

  // ---- public page ----
  const published = {
    status: "published", language: "ar", title: "دليل 5A", slug: "5a-waterway-guide", excerpt: "e", meta_title: "m", meta_description: "d",
    reviewed_at: "2026-10-10T00:00:00Z", published_at: "2026-10-10T00:00:00Z", reviewed_by_name: "A",
    body_markdown: "## عينة حديثة من الوحدات المتاحة\n- [Admin Office](/units/u-1): 1122 م² — الحالة في بيانات المصدر: available — تاريخ المصدر: 2026-10-01.\n\n## حقائق تجارية موثقة للمراجعة\n- السعر: 26760000 EGP — [Admin Office](/units/u-1) — تاريخ المصدر: 2026-10-01 — يجب التحقق منه قبل النشر.",
    source_refs: [...base.source_refs, ...refs],
  };
  const html = renderEditorialArticle(published);
  check(!/يجب التحقق منه قبل النشر|الحالة في بيانات المصدر|حقائق تجارية موثقة للمراجعة/.test(html), "internal review wording never reaches visitors");
  check(/26,760,000 جنيه/.test(html) && /آخر تحديث: 2026-10-01/.test(html), "prices and dates are readable");
  check(/id="guide-sources"/.test(html) && /rel="nofollow noopener"/.test(html) && /"citation"/.test(html), "web sources are listed and cited in schema");
  check(!/href="\/projects\/5a--waterway"[^>]*rel="nofollow/.test(html), "internal project refs are not listed as external sources");

  // ---- endpoint: research goes through the same claim/finish flow, no units loaded ----
  process.env.OPENAI_API_KEY = "offline-test-key";
  const calls = [];
  const reply = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body });
  global.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes("tycoons-admin")) {
      const body = JSON.parse(options.body);
      calls.push(body.action);
      if (body.action === "article_generation_claim") return reply(200, { state: "claimed", lock_token: "11111111-1111-4111-8111-111111111111" });
      return reply(200, { ok: true });
    }
    if (target.includes("/rest/v1/projects")) { calls.push("projects"); return reply(200, [{ id: "project-1", name: "5A", slug: "5a--waterway", developer: "Waterway", location: "New Cairo" }]); }
    if (target.includes("/rest/v1/units")) { calls.push("units"); return reply(200, []); }
    if (target.includes("api.openai.com")) {
      const body = JSON.parse(options.body);
      calls.push(`openai:${body.tools?.[0]?.type || "none"}`);
      return reply(200, { status: "completed", output_text: JSON.stringify(output) });
    }
    throw new Error(`unexpected fetch ${target}`);
  };
  const { handler } = require("../netlify/functions/article-generate.cjs");
  const res = await handler({ httpMethod: "POST", headers: { "x-admin-token": "t".repeat(40), "x-idempotency-key": "research:offline-key-0001" }, body: JSON.stringify({ action: "research", target_type: "project", project_id: "project-1", language: "ar", topic: "هل 5A مناسب للاستثمار" }) });
  const data = JSON.parse(res.body);
  check(res.statusCode === 200 && data.generated_as === "research" && data.facts.length === 1, `research endpoint returns facts (status ${res.statusCode})`);
  check(calls.includes("openai:web_search") && !calls.includes("units"), "research uses web search and never loads inventory");
  check(calls[0] === "article_generation_claim" && calls.at(-1) === "article_generation_finish", "research is claimed and finished like other generations");

  // ---- fallback when the configured model rejects web search ----
  calls.length = 0;
  let openaiCalls = 0;
  const previousFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    if (String(url).includes("api.openai.com")) {
      openaiCalls += 1;
      const body = JSON.parse(options.body);
      calls.push(`model:${body.model}`);
      if (openaiCalls === 1) return { ok: false, status: 400, headers: { get: () => null }, json: async () => ({ error: { type: "invalid_request_error", code: null } }) };
      check(body.reasoning === undefined && body.max_tool_calls === undefined, "fallback request has no gpt-5-only parameters");
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ status: "completed", output_text: JSON.stringify(output) }) };
    }
    return previousFetch(url, options);
  };
  const retried = await handler({ httpMethod: "POST", headers: { "x-admin-token": "t".repeat(40), "x-idempotency-key": "research:offline-key-0002" }, body: JSON.stringify({ action: "research", target_type: "project", project_id: "project-1", language: "ar", topic: "دليل موقع 5A" }) });
  check(retried.statusCode === 200 && calls.includes(`model:${gen.RESEARCH_FALLBACK_MODEL}`), "research retries once on the documented web-search model");

  console.log(`Article research tests passed (${checks} checks; offline only).`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
