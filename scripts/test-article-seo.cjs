"use strict";
// Offline only: SEO/GEO article fields (focus keyword, key takeaways, FAQ,
// AR/EN pairing, hero image) across generation, review, admin save, public
// rendering and the editor's SEO score. No network, provider or database.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const { parseOpenAiOutput, buildOpenAiRequest } = require("../netlify/functions/_article-generation.cjs");
const { renderEditorialArticle } = require("../netlify/functions/_seo-utils.cjs");
const copy = (value) => JSON.parse(JSON.stringify(value));
const transpile = (code) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };

const projects = [{ id: "project-1", name: "Mountain View", slug: "mountain-view", location: "New Cairo" }];
const refs = [{ type: "project", id: "project-1", label: "Mountain View", url: "/projects/mountain-view" }];
const draft = {
  focus_keyword: "  كمبوند ماونتن فيو\nالتجمع  ", title: "كمبوند ماونتن فيو التجمع: دليل المشترين", slug: "mountain-view-new-cairo-guide",
  excerpt: "مقدمة", meta_title: "كمبوند ماونتن فيو التجمع", meta_description: "وصف",
  key_takeaways: ["نقطة أولى", "  ", "نقطة تانية"], body_markdown: "كمبوند ماونتن فيو التجمع إجابة مباشرة.\n\n## القسم\nنص",
  faq: [{ question: "سؤال؟", answer: "إجابة." }, { question: "", answer: "" }],
  comparison_project_ids: [], unit_evidence: [], claim_evidence: [],
};

(async () => {
  // ---- generation ----
  const request = buildOpenAiRequest({ action: "draft", language: "ar", targetType: "project", topic: "دليل ماونتن فيو" }, projects, []);
  const schema = request.text.format.schema;
  for (const field of ["focus_keyword", "key_takeaways", "faq"]) check(schema.required.includes(field), `draft schema requires ${field}`);
  check(schema.properties.faq.items.required.join() === "question,answer", "faq items are question/answer only");
  check(/focus_keyword/.test(request.input[0].content) && /key_takeaways/.test(request.input[0].content), "SEO/GEO rules are sent to the model");
  check(/FAQ answers follow the same restrictions/.test(request.input[0].content), "FAQ inherits the commercial-fact restrictions");
  check(request.max_output_tokens >= 12000, "drafts have room for a full-length article");
  check(request.reasoning?.effort === "medium", "drafts use medium reasoning");
  const topicRequest = buildOpenAiRequest({ action: "topics", language: "ar", targetType: "project", topic: "" }, projects, []);
  check(topicRequest.reasoning?.effort === "low", "topic suggestions stay low effort");

  const parsed = parseOpenAiOutput({ status: "completed", output_text: JSON.stringify(draft) }, "draft", { input: { language: "ar" }, projects, units: [] });
  check(parsed.focus_keyword === "كمبوند ماونتن فيو التجمع", "keyword is trimmed to one line");
  check(JSON.stringify(parsed.key_takeaways) === JSON.stringify(["نقطة أولى", "نقطة تانية"]), "empty takeaways are dropped");
  check(parsed.faq.length === 1 && parsed.faq[0].question === "سؤال؟", "empty FAQ rows are dropped");
  const legacy = { ...draft }; delete legacy.focus_keyword; delete legacy.key_takeaways; delete legacy.faq;
  const parsedLegacy = parseOpenAiOutput({ status: "completed", output_text: JSON.stringify(legacy) }, "draft", { input: { language: "ar" }, projects, units: [] });
  check(parsedLegacy.focus_keyword === "" && parsedLegacy.key_takeaways.length === 0 && parsedLegacy.faq.length === 0, "older drafts without SEO fields default safely");
  assert.throws(() => parseOpenAiOutput({ status: "completed", output_text: JSON.stringify({ ...draft, faq: "nope" }) }, "draft", { projects, units: [] }), /generation_shape_invalid/); checks += 1;

  // ---- review: same numeric policy for the new fields ----
  const { assessArticleReview } = await import(pathToFileURL(path.join(root, "server/tycoons-admin/article-review.mjs")));
  const base = { language: "ar", target_type: "project", project_id: "project-1", area_name: null, title: "دليل Mountain View", slug: "mountain-view-guide", excerpt: "مقدمة", meta_title: "دليل", meta_description: "وصف", body_markdown: "Mountain View دليل.", source_refs: refs };
  const blocker = (issues, field) => issues.some((issue) => issue.severity === "blocker" && issue.code === "unsupported_numeric_claim" && issue.field === field);
  check(blocker(assessArticleReview({ ...base, faq: [{ question: "السعر كام؟", answer: "يبدأ من 5 مليون جنيه" }] }, { projects, units: [] }), "faq"), "numbers in FAQ answers block publication");
  check(blocker(assessArticleReview({ ...base, key_takeaways: ["مقدم 10%"] }, { projects, units: [] }), "key_takeaways"), "numbers in takeaways block publication");
  check(blocker(assessArticleReview({ ...base, focus_keyword: "شقق 3 غرف" }, { projects, units: [] }), "focus_keyword"), "numbers in the keyword are reviewed too");
  check(!assessArticleReview({ ...base, key_takeaways: ["مشروع هادي"], faq: [{ question: "فين؟", answer: "في التجمع." }] }, { projects, units: [] }).some((issue) => issue.severity === "blocker"), "clean SEO fields do not block");

  // ---- admin backend: save + translation pairing ----
  const serverSource = fs.readFileSync(path.join(root, "server/tycoons-admin/index.ts"), "utf8").replace(/^import .*;\s*$/gm, "");
  const executable = `${transpile(serverSource)}\nglobalThis.api = { saveArticle, listArticles };`;
  const tables = { projects: copy(projects), units: [], editorial_articles: [] };
  let nextId = 1;
  const db = { from(table) {
    const filters = []; let operation = "read"; let payload;
    const query = {
      select() { return query; }, order() { return query; },
      eq(field, value) { filters.push((row) => row[field] === value); return query; },
      neq(field, value) { filters.push((row) => row[field] !== value); return query; },
      is(field, value) { filters.push((row) => (row[field] ?? null) === value); return query; },
      in(field, values) { filters.push((row) => values.includes(row[field])); return query; },
      insert(values) { operation = "insert"; payload = values; return query; },
      update(values) { operation = "update"; payload = values; return query; },
      maybeSingle() { return run(true); }, single() { return run(true); }, then(resolve, reject) { return run(false).then(resolve, reject); },
    };
    async function run(single) {
      let rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
      if (operation === "insert") { const row = { id: `article-${nextId++}`, revision: 1, translation_key: null, ...copy(payload) }; tables[table].push(row); rows = [row]; }
      if (operation === "update") {
        if (table === "editorial_articles" && payload.translation_key) {
          for (const row of rows) {
            if (tables[table].some((other) => other.id !== row.id && other.translation_key === payload.translation_key && other.language === row.language)) return { data: null, error: { message: "duplicate key value violates unique constraint" } };
          }
        }
        for (const row of rows) Object.assign(row, copy(payload));
      }
      return { data: copy(single ? rows[0] ?? null : rows), error: null };
    }
    return query;
  } };
  const context = { createClient: () => db, assessArticleReview, Deno: { env: { get: () => "offline-fixture" }, serve() {} }, crypto: webcrypto, TextEncoder, Response, console, setTimeout, fetch: () => { throw Error("network forbidden"); } };
  vm.runInNewContext(executable, context, { filename: "tycoons-admin-seo-offline.js" });
  const { api } = context;
  const owner = { id: "owner-1", username: "owner", display_name: "Owner", role: "owner" };
  const values = { ...base, focus_keyword: "دليل Mountain View", key_takeaways: ["مشروع هادي", ""], faq: [{ question: "فين؟", answer: "في التجمع." }, { question: "", answer: "" }], hero_image_url: "https://example.com/hero.webp" };
  const ar = (await api.saveArticle(owner, { values })).article;
  check(ar.focus_keyword === "دليل Mountain View" && ar.key_takeaways.length === 1 && ar.faq.length === 1, "SEO fields are cleaned and stored");
  check(ar.hero_image_url === "https://example.com/hero.webp", "hero image is stored");
  await assert.rejects(api.saveArticle(owner, { values: { ...values, hero_image_url: "http://insecure.example/x.png" } }), (error) => /invalid_url/.test(error.code)); checks += 1;
  await assert.rejects(api.saveArticle(owner, { values: { ...values, faq: [{ question: "سؤال بدون إجابة", answer: "" }] } }), (error) => error.code === "article_faq_invalid"); checks += 1;
  await assert.rejects(api.saveArticle(owner, { values: { ...values, key_takeaways: Array(7).fill("نقطة") } }), (error) => error.code === "article_takeaways_invalid"); checks += 1;
  const hashBefore = ar.content_hash;
  const en = (await api.saveArticle(owner, { values: { ...values, language: "en", slug: "mountain-view-guide-en", title: "Mountain View guide" }, translation_article_id: ar.id })).article;
  const arRow = tables.editorial_articles.find((row) => row.id === ar.id);
  check(en.translation_key && en.translation_key === arRow.translation_key, "linking pairs both language versions");
  check(arRow.content_hash === hashBefore && arRow.revision === 1, "pairing never changes the counterpart's content revision");
  await assert.rejects(api.saveArticle(owner, { values: { ...values, slug: "second-arabic" }, translation_article_id: ar.id }), (error) => error.code === "article_translation_same_language"); checks += 1;
  const other = (await api.saveArticle(owner, { values: { ...values, language: "en", slug: "another-english", title: "Another English guide" } })).article;
  await assert.rejects(api.saveArticle(owner, { id: other.id, expected_revision: other.revision, values: { ...values, language: "en", slug: "another-english", title: "Another English guide" }, translation_article_id: ar.id }), (error) => error.code === "article_translation_taken"); checks += 1;
  const unlinked = (await api.saveArticle(owner, { id: en.id, expected_revision: en.revision, values: { ...values, language: "en", slug: "mountain-view-guide-en", title: "Mountain View guide" }, translation_article_id: "" })).article;
  check(unlinked.translation_key === null, "an empty selection unlinks");
  const kept = (await api.saveArticle(owner, { id: ar.id, expected_revision: 1, values })).article;
  check(kept.translation_key === arRow.translation_key, "omitting the field keeps the existing pairing");

  // ---- public page ----
  const published = {
    id: "a", status: "published", language: "ar", title: "دليل ماونتن فيو", slug: "mountain-view-guide", excerpt: "مقدمة",
    body_markdown: "## القسم\nنص", meta_title: "دليل", meta_description: "وصف", focus_keyword: "ماونتن فيو التجمع",
    key_takeaways: ["نقطة <b>أولى</b>"], faq: [{ question: "فين المشروع؟", answer: "في التجمع." }], translation_key: "11111111-1111-4111-8111-111111111111",
    hero_image_url: "https://example.com/hero.webp", reviewed_by_name: "Owner", reviewed_at: "2026-10-10T10:00:00Z", published_at: "2026-10-10T10:00:00Z", updated_at: "2026-10-10T10:00:00Z",
  };
  const pair = { ...published, id: "b", language: "en", slug: "mountain-view-guide" };
  const html = renderEditorialArticle(published, pair);
  check(/id="key-takeaways"/.test(html) && /نقطة &lt;b&gt;أولى&lt;\/b&gt;/.test(html), "takeaways render escaped at the top");
  check(/"@type":"FAQPage"/.test(html) && /فين المشروع؟/.test(html), "FAQ renders visibly and as FAQPage schema");
  check(/hreflang="en" href="https:\/\/tycoons-inv\.com\/en\/guides\/mountain-view-guide\/"/.test(html), "paired article emits hreflang");
  check(/og:image" content="https:\/\/example\.com\/hero\.webp"/.test(html) && /"keywords":"ماونتن فيو التجمع"/.test(html), "hero image and keyword reach metadata");
  check(!/hreflang="en"/.test(renderEditorialArticle(published, { ...pair, translation_key: "22222222-2222-4222-8222-222222222222" })), "a mismatched pair key emits no hreflang");
  check(!/hreflang="en"/.test(renderEditorialArticle(published, { ...pair, status: "draft" })), "an unpublished counterpart emits no hreflang");
  const plainHtml = renderEditorialArticle({ ...published, key_takeaways: undefined, faq: undefined, hero_image_url: null, translation_key: null });
  check(plainHtml && !/FAQPage/.test(plainHtml) && !/key-takeaways/.test(plainHtml), "rows without SEO fields still render");

  // ---- editor SEO score ----
  const editor = fs.readFileSync(path.join(root, "src/components/admin/ArticlesTab.tsx"), "utf8");
  const helpers = editor.slice(0, editor.indexOf("function Preview(")).replace(/^import .*\n/gm, "");
  const sandbox = {};
  vm.runInNewContext(`${transpile(helpers)}\nglobalThis.seo = { seoChecks, seoScore };`, sandbox);
  const strong = {
    language: "ar", focus_keyword: "كمبوند ماونتن فيو", title: "كمبوند ماونتن فيو: دليل كامل", slug: "mountain-view-new-cairo-guide",
    meta_title: "كمبوند ماونتن فيو في التجمع الخامس: دليل المشتري الكامل", meta_description: `كمبوند ماونتن فيو ${"وصف مفيد ".repeat(12)}`.slice(0, 140),
    excerpt: "مقدمة", key_takeaways: ["أ", "ب", "ج"], faq: [{ question: "س1", answer: "ج1" }, { question: "س2", answer: "ج2" }, { question: "س3", answer: "ج3" }],
    body_markdown: `كمبوند ماونتن فيو إجابة مباشرة.\n\n## كمبوند ماونتن فيو فين؟\n${"كلام مفيد ".repeat(460)}\n## ب\n[المشروع](/projects/mountain-view)\n## ج\n[وحدة](/units/u-1)\n## د\nنص`,
    target_type: "project", project_id: "project-1", area_name: null, source_refs: [],
  };
  const strongChecks = sandbox.seo.seoChecks(strong);
  check(sandbox.seo.seoScore(strongChecks) === 100, `a complete article scores 100 (got ${sandbox.seo.seoScore(strongChecks)}: ${strongChecks.filter((c) => c.earned < c.weight).map((c) => c.id).join(",")})`);
  check(strongChecks.reduce((sum, item) => sum + item.weight, 0) === 100, "weights add up to 100");
  check(sandbox.seo.seoScore(sandbox.seo.seoChecks({ ...strong, focus_keyword: "كمبوند ماونتن فيو".replace("ة", "ه") })) === 100, "Arabic letter variants still match");
  const empty = sandbox.seo.seoChecks({ ...strong, focus_keyword: "", title: "", slug: "", meta_title: "", meta_description: "", excerpt: "", body_markdown: "", key_takeaways: [], faq: [] });
  check(sandbox.seo.seoScore(empty) === 0, "an empty article scores 0");

  console.log(`Article SEO/GEO field tests passed (${checks} checks; offline only).`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
