"use strict";
// Offline tests for "اكتب المقال": DataForSEO brief (mocked) and the one-claim write flow.
const assert = require("node:assert/strict");
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks += 1; };
const reply = (body, status = 200) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body });
const dfsTask = (result) => reply({ tasks: [{ status_code: 20000, result }] });

const project = { id: "11111111-1111-4111-8111-111111111111", name: "Bloomfields", developer: "Tatweer Misr", location: "Mostakbal City", slug: "bloomfields" };
const variantsAnswer = { output_text: JSON.stringify({ ar: ["بلوم فيلدز", "كمبوند بلوم فيلدز", "اسعار بلوم فيلدز", "بلوم فيلدز 2026"], en: ["bloomfields", "bloomfields mostakbal city"] }), status: "completed", output: [] };

(async () => {
  const { seoBrief, parseVariants, pageOutline } = require("../netlify/functions/_seo-brief.cjs");
  const variants = parseVariants(variantsAnswer, project);
  eq(variants.ar, ["بلوم فيلدز", "كمبوند بلوم فيلدز"], "price and year variants dropped");
  ok(variants.en.includes("Bloomfields") || variants.en.includes("bloomfields"), "English name kept");

  const outline = pageOutline([{ items: [{ page_content: { main_topic: [{ h_title: "موقع كمبوند بلوم فيلدز", level: 2, primary_content: [{ text: "كلام كتير هنا عن الموقع" }] }, { h_title: "title", level: 1 }], secondary_topic: [{ h_title: "خدمات", level: 3, primary_content: [{ text: "حمام سباحة" }] }] } }] }][0]);
  eq(outline.headings, [{ level: 2, text: "موقع كمبوند بلوم فيلدز" }, { level: 3, text: "خدمات" }], "only h2/h3 headings kept");
  eq(outline.words, 7, "words counted");

  // Offline: the Netlify build has real DataForSEO / Firecrawl keys in its environment; the tests
  // must never use them (or call the real services), so they are removed for this file.
  delete process.env.FIRECRAWL_API_KEY;
  // Without DataForSEO credentials: the first AI variant.
  delete process.env.DATAFORSEO_LOGIN; delete process.env.DATAFORSEO_PASSWORD;
  const offline = await seoBrief(project, "ar", async () => variantsAnswer);
  eq([offline.keyword, offline.source, offline.notes], ["بلوم فيلدز", "ai", ["dataforseo_not_configured"]], "works without DataForSEO");

  // With DataForSEO: the most searched Arabic spelling, then the top pages' headings.
  process.env.DATAFORSEO_LOGIN = "login"; process.env.DATAFORSEO_PASSWORD = "secret";
  const calls = [];
  global.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    const body = JSON.parse(options.body)[0];
    calls.push({ path, body, auth: options.headers.Authorization });
    if (path.endsWith("/search_volume/live")) return dfsTask([{ keyword: "بلوم فيلدز", search_volume: 390 }, { keyword: "كمبوند بلوم فيلدز", search_volume: 720 }, { keyword: "bloomfields", search_volume: 4400 }]);
    if (path.endsWith("/organic/live/advanced")) return dfsTask([{ items: [
      { type: "organic", rank_group: 1, url: "https://tycoons-inv.com/projects/bloomfields", title: "us" },
      { type: "organic", rank_group: 2, url: "https://www.youtube.com/watch?v=1", title: "video" },
      { type: "organic", rank_group: 3, url: "https://aqarsky.com/p", title: "كمبوند بلوم فيلدز" },
      { type: "organic", rank_group: 4, url: "https://diarna.net/p", title: "بلوم فيلدز" },
      { type: "local_pack", url: "https://maps", title: "x" },
    ] }]);
    if (path.endsWith("/content_parsing/live")) return dfsTask([{ items: [{ page_content: { main_topic: [{ h_title: body.url.includes("aqarsky") ? "عيوب بلوم فيلدز" : "موقع بلوم فيلدز", level: 2, primary_content: [{ text: "كلمة ".repeat(2000) }] }] } }] }]);
    throw new Error(`unexpected ${url}`);
  };
  const brief = await seoBrief(project, "ar", async () => variantsAnswer);
  eq(brief.keyword, "كمبوند بلوم فيلدز", "highest Arabic volume wins for an Arabic article");
  eq(brief.source, "dataforseo", "keyword from Google data");
  ok(calls[0].auth === `Basic ${Buffer.from("login:secret").toString("base64")}`, "basic auth");
  eq(calls[0].body.location_code, 2818, "Egypt");
  eq(calls[1].body.keyword, "كمبوند بلوم فيلدز", "SERP for the chosen keyword");
  eq(brief.competitors.map((page) => page.domain), ["aqarsky.com", "diarna.net"], "own site and video sites skipped");
  eq(brief.competitors[0].headings[0].text, "عيوب بلوم فيلدز", "competitor headings kept");
  ok(!JSON.stringify(brief).includes("كلمة كلمة"), "competitor text never kept");
  eq(brief.target_words, 1400, "target = 1.1 × the longest competitor, capped at the Arabic guide maximum (1400)");
  ok(brief.serp_titles.includes("كمبوند بلوم فيلدز") && brief.variants.length > 0, "SERP titles and spelling variants kept for the writer");
  const en = await seoBrief(project, "en", async () => variantsAnswer);
  eq(en.keyword, "bloomfields", "English article uses the English spelling");

  // DataForSEO out of balance (40200): each step falls back to Firecrawl (Trends, Search, Scrape).
  process.env.FIRECRAWL_API_KEY = "fc-test";
  const fcCalls = [];
  global.fetch = async (url, options) => {
    const target = new URL(String(url));
    if (target.hostname === "api.dataforseo.com") return { ok: true, json: async () => ({ status_code: 20000, tasks: [{ status_code: 40200, status_message: "Payment Required." }] }) };
    const body = JSON.parse(options.body);
    fcCalls.push({ path: target.pathname, body, auth: options.headers.Authorization });
    if (target.pathname === "/v2/scrape" && body.alexandria) {
      const keywords = body.alexandria.options.keywords;
      return { ok: true, json: async () => ({ success: true, data: { alexandria: [{ data: { keywords, points: [
        { values: keywords.map((keyword) => (keyword === "كمبوند بلوم فيلدز" ? 40 : 10)) },
        { values: keywords.map((keyword) => (keyword === "كمبوند بلوم فيلدز" ? 60 : 5)) },
      ] } }] } }) };
    }
    if (target.pathname === "/v2/search") return { ok: true, json: async () => ({ success: true, data: { web: [
      { url: "https://tycoons-inv.com/projects/bloomfields", title: "us" },
      { url: "https://diarna.net/p", title: "بلوم فيلدز" },
      { url: "https://www.youtube.com/watch?v=1", title: "video" },
      { url: "https://abyatproperty.com/p", title: "عيوب" },
    ] } }) };
    if (target.pathname === "/v2/scrape") return { ok: true, json: async () => ({ success: true, data: { markdown: `# عنوان\n## ${body.url.includes("abyat") ? "عيوب بلوم فيلدز" : "موقع بلوم فيلدز"}\n${"كلمة ".repeat(1800)}\n### [خدمات](https://x.com)` } }) };
    throw new Error(`unexpected ${url}`);
  };
  const fallbackBrief = await seoBrief(project, "ar", async () => variantsAnswer);
  eq(fallbackBrief.keyword, "كمبوند بلوم فيلدز", "Google Trends picks the most searched Arabic spelling");
  eq(fallbackBrief.source, "google_trends", "source says Trends");
  ok(fallbackBrief.notes.some((note) => note.startsWith("search_volume_failed: 40200")) && fallbackBrief.notes.includes("serp_from_firecrawl"), "notes say why and what replaced it");
  ok(fcCalls.every((call) => call.auth === "Bearer fc-test"), "Firecrawl key sent");
  eq(fcCalls.find((call) => call.path === "/v2/search").body.query, "كمبوند بلوم فيلدز", "search for the chosen keyword");
  eq(fallbackBrief.competitors.map((page) => page.domain), ["diarna.net", "abyatproperty.com"], "own site and video sites skipped");
  eq(fallbackBrief.competitors[1].headings.map((heading) => heading.text), ["عيوب بلوم فيلدز", "خدمات"], "headings from Markdown, links stripped, h1 skipped");
  ok(!JSON.stringify(fallbackBrief).includes("كلمة كلمة"), "competitor text never kept");
  eq(fallbackBrief.target_words, 1400, "target capped at the Arabic guide maximum");
  delete process.env.FIRECRAWL_API_KEY; // the write-flow tests below stay offline too

  // Draft rules carry the brief.
  const { buildOpenAiRequest } = require("../netlify/functions/_article-generation.cjs");
  const request = buildOpenAiRequest({ action: "draft", language: "ar", targetType: "project", projectId: project.id, topic: brief.keyword, researchFacts: [], seoBrief: brief }, [project], []);
  const system = request.input[0].content;
  ok(system.includes('focus_keyword is exactly "كمبوند بلوم فيلدز"'), "keyword forced");
  ok(system.includes("900 to 1400 words") && system.includes("aim for about 1400"), "guide length range");
  ok(system.includes("## المطور:") && system.includes("## قبل ما تحجز") && !system.includes("قبل ما تقرر"), "guide headings, its own closing");
  ok(system.includes("عامية مصرية مهذبة") && system.includes("at most 60 characters"), "Egyptian broker register, 60-character title");
  ok(system.includes("عيوب بلوم فيلدز") && system.includes("Never copy their wording"), "competitor headings, no copying");
  ok(system.includes("live table on this page"), "prices come from the live table");
  eq(request.max_output_tokens, 24000, "room for a long guide");

  // The whole write flow: one claim → background → brief + research + draft.
  process.env.ANTHROPIC_API_KEY = "k"; delete process.env.ARTICLE_PROVIDER;
  const token = "t".repeat(40);
  const lock = "11111111-2222-3333-4444-555555555555";
  const admin = [];
  const claude = [];
  let background = null;
  const draft = { focus_keyword: "كمبوند بلوم فيلدز", title: "كمبوند بلوم فيلدز: الموقع والمطور", slug: "bloomfields-guide", excerpt: "كمبوند بلوم فيلدز من تطوير مصر في مستقبل سيتي.", meta_title: "كمبوند بلوم فيلدز | دليل المشتري", meta_description: "كمبوند بلوم فيلدز في مستقبل سيتي من تطوير مصر.", key_takeaways: ["أ", "ب", "ج"], body_markdown: `كمبوند بلوم فيلدز مشروع من [Bloomfields](/projects/bloomfields).\n\n## نبذة عن كمبوند بلوم فيلدز\n\nنص.\n\n## قبل ما تقرر\n\nكلمنا.\n\n## عينة حديثة من الوحدات المتاحة\n- [Apartment](/units/u1): 76 م² — x.`, faq: [{ question: "س", answer: "ج" }, { question: "س2", answer: "ج2" }, { question: "س3", answer: "ج3" }], comparison_project_ids: [], unit_evidence: [], claim_evidence: [] };
  global.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes("/functions/v1/tycoons-admin")) {
      const body = JSON.parse(options.body); admin.push(body);
      return reply(body.action === "article_generation_claim" ? { state: "claimed", lock_token: lock, attempt: 1 } : { ok: true });
    }
    if (target.includes("article-generate-background")) { background = JSON.parse(options.body); return reply({}, 202); }
    if (target.includes("/rest/v1/projects")) return reply([project]);
    if (target.includes("/rest/v1/units")) return reply([]);
    if (target.includes("dataforseo")) {
      const path = new URL(target).pathname;
      if (path.endsWith("/search_volume/live")) return dfsTask([{ keyword: "كمبوند بلوم فيلدز", search_volume: 720 }]);
      if (path.endsWith("/organic/live/advanced")) return dfsTask([{ items: [] }]);
    }
    if (target.includes("api.anthropic.com")) {
      const body = JSON.parse(options.body);
      claude.push(body);
      if (body.output_config?.format?.schema?.properties?.ar) return reply({ id: "m", stop_reason: "end_turn", usage: {}, content: [{ type: "text", text: JSON.stringify({ ar: ["كمبوند بلوم فيلدز"], en: ["bloomfields"] }) }] });
      if (body.tools) return reply({ id: "m", stop_reason: "end_turn", usage: {}, content: [{ type: "web_search_tool_result", content: [{ url: "https://tatweermisr.com/bloomfields", title: "Bloomfields" }] }, { type: "text", text: JSON.stringify({ facts: [{ fact: "يقع المشروع في مستقبل سيتي شرق القاهرة.", category: "location", confidence: "official", sources: [{ url: "https://tatweermisr.com/bloomfields", title: "Bloomfields - Tatweer Misr" }] }], notes: "" }) }] });
      return reply({ id: "m", stop_reason: "end_turn", usage: {}, content: [{ type: "text", text: JSON.stringify(draft) }] });
    }
    throw new Error(`unexpected ${target}`);
  };
  const { handler } = require("../netlify/functions/article-generate.cjs");
  const backgroundHandler = require("../netlify/functions/article-generate-background.cjs").handler;
  const event = { httpMethod: "POST", headers: { host: "deploy-preview-105--x.netlify.app", "x-admin-token": token, "x-idempotency-key": "write:abcdefghijklmnop" }, body: JSON.stringify({ action: "write", language: "ar", target_type: "project", project_id: project.id }) };
  const started = await handler(event);
  eq(started.statusCode, 409, "write runs in the background");
  eq(admin.filter((call) => call.action === "article_generation_claim").length, 1, "one claim for the whole article");
  const quiet = console.error; console.error = () => {};
  await backgroundHandler({ httpMethod: "POST", headers: { "x-admin-token": token }, body: JSON.stringify(background) });
  console.error = quiet;
  const finish = admin.find((call) => call.action === "article_generation_finish");
  ok(finish && finish.response, `write finished with a result (${finish && finish.error})`);
  eq(finish.response.focus_keyword, "كمبوند بلوم فيلدز", "draft keyword");
  eq(finish.response.seo_brief.keyword, "كمبوند بلوم فيلدز", "brief returned to the admin");
  eq(finish.response.research.facts.length, 1, "research facts returned");
  ok(!finish.response.body_markdown.includes("عينة حديثة"), "frozen unit sample removed (live table instead)");
  ok(claude.at(-1).system.includes("Leave unit_evidence and claim_evidence empty"), "no frozen price lists asked");
  ok(finish.response.source_refs.some((ref) => ref.type === "web" && ref.url === "https://tatweermisr.com/bloomfields"), "web source cited");
  ok(claude.some((body) => body.tools) && claude.at(-1).system.includes('focus_keyword is exactly "كمبوند بلوم فيلدز"'), "research then a draft with the brief");
  const parse = require("../netlify/functions/_article-generation.cjs").parseRequest;
  assert.throws(() => parse({ body: JSON.stringify({ action: "write", language: "ar", target_type: "area", area_name: "x" }) }), /project_required/); checks += 1;

  // The guide page shows a live price table of the project's available units.
  const { renderEditorialArticle } = require("../netlify/functions/_seo-utils.cjs");
  const published = { id: "a1", status: "published", published_at: "2026-11-04T10:00:00Z", reviewed_at: "2026-11-04T10:00:00Z", language: "ar", title: "كمبوند بلوم فيلدز", slug: "bloomfields-guide", excerpt: "دليل", body_markdown: "نص المقال.", project_id: project.id, source_refs: [] };
  const units = [
    { id: "u2", project_id: project.id, unit_type: "Apartment", bedrooms_text: "3", area_sqm: 175, starting_price: 11663000, down_payment_text: "5%", installments_text: "10 years", delivery_text: "2028", last_updated_at: "2026-11-01T00:00:00Z" },
    { id: "u1", project_id: project.id, unit_type: "Apartment", bedrooms_text: "1", area_sqm: 76, starting_price: 5846000, down_payment_text: "5%", installments_text: "8 years", delivery_text: "2027", last_updated_at: "2026-11-03T00:00:00Z" },
    { id: "u3", project_id: "other", unit_type: "Villa", starting_price: 99000000 },
  ];
  const html = renderEditorialArticle(published, null, { project, related: [], units });
  ok(html.includes('id="guide-prices"') && html.includes("أسعار Bloomfields المتاحة دلوقتي"), "live price table on the guide");
  ok(html.indexOf("5,846,000") > 0 && html.indexOf("5,846,000") < html.indexOf("11,663,000"), "cheapest first");
  ok(!html.includes("99,000,000"), "only this project's units");
  ok(!renderEditorialArticle(published, null, { project, related: [], units: [] }).includes("guide-prices"), "no table without units");

  // The real guide route: the article row carries project_id, so the page shows the project card
  // and the live table, and keeps its own URL as canonical.
  const guideCalls = [];
  global.fetch = async (url) => {
    const target = new URL(String(url));
    guideCalls.push(target);
    const table = target.pathname.split("/").pop();
    if (table === "published_editorial_articles" && target.searchParams.get("slug")) return reply([{ ...published, translation_key: null, target_type: "project" }].map((row) => {
      const select = target.searchParams.get("select").split(",");
      return Object.fromEntries(Object.entries(row).filter(([key]) => select.includes(key)));
    }));
    if (table === "published_editorial_articles") return reply([{ title: published.title, slug: published.slug, language: "ar", project_id: project.id }]);
    if (table === "projects") return reply([project]);
    if (table === "units") return reply(target.searchParams.get("offset") === "0" ? units.filter((unit) => unit.project_id === project.id).map((unit) => ({ ...unit, availability_status: "available" })) : []);
    return reply([]);
  };
  const seoPage = require("../netlify/functions/seo-page.cjs");
  const page = await seoPage.handler({ rawUrl: "https://tycoons-inv.com/guides/bloomfields-guide/", path: "/guides/bloomfields-guide/", queryStringParameters: { lang: "ar", type: "guide", slug: "bloomfields-guide" }, headers: {} });
  const articleCall = guideCalls.find((call) => call.pathname.endsWith("published_editorial_articles") && call.searchParams.get("slug"));
  ok(articleCall.searchParams.get("select").split(",").includes("project_id"), "guide query asks for project_id");
  ok(page.statusCode === 200 && page.body.includes('id="guide-prices"'), "live price table on the real guide page");
  ok(page.body.includes("المقال ده عن"), "project card shown");
  ok(page.body.includes('rel="canonical" href="https://tycoons-inv.com/guides/bloomfields-guide/"'), "guide keeps its own canonical");

  // The build-time (static) guide pages: units passed → table; canonical to the project page as before.
  const { editorialArticleView } = require("../netlify/functions/_seo-utils.cjs");
  const related = [{ title: published.title, slug: published.slug, language: "ar", project_id: project.id }];
  const staticView = editorialArticleView(published, null, { project, related, units, projectEmbedsGuide: true });
  ok(staticView.body.includes('id="guide-prices"'), "static guide page gets the live table");
  eq(staticView.canonicalPath, "/projects/bloomfields", "static newest guide keeps the project-page canonical (unchanged)");
  eq(editorialArticleView(published, null, { project, related, units }).canonicalPath, "", "function-rendered guide keeps its own canonical (unchanged)");
  const generator = require("node:fs").readFileSync(require("node:path").join(__dirname, "generate-data-pages.cjs"), "utf8");
  ok(/units: guide\.project_id \? unitsByProject\.get\(guide\.project_id\)/.test(generator) && generator.includes("projectEmbedsGuide: true"), "build passes units and the embed flag");

  console.log(`SEO brief and write-flow tests passed (${checks} checks; offline only).`);
})().catch((error) => { console.error(error); process.exit(1); });
