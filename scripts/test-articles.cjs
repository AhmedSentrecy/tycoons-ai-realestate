"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
const { renderSafeMarkdown } = require("../netlify/functions/_article-render.cjs");
const { renderEditorialArticle, renderGuide } = require("../netlify/functions/_seo-utils.cjs");
const { buildOpenAiRequest, parseOpenAiOutput } = require("../netlify/functions/_article-generation.cjs");
const { handler } = require("../netlify/functions/article-generate.cjs");

const originalFetch = global.fetch;
const event = (key, token = "a".repeat(40), overrides = {}) => ({
  httpMethod: "POST",
  headers: { "x-admin-token": token, "x-idempotency-key": key },
  body: JSON.stringify({ action: "draft", target_type: "project", project_id: "project-1", language: "ar", topic: "دليل اختيار مشروع مناسب", ...overrides }),
});
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

function durableFetch({ provider, projects = [{ id: "project-1", name: "Project One", slug: "project-one" }] }) {
  const records = new Map();
  let now = Date.now();
  let providerCalls = 0;
  const fetch = async (url, options = {}) => {
    const value = String(url);
    if (value.includes("tycoons-admin")) {
      const body = JSON.parse(options.body || "{}");
      const token = options.headers?.["x-admin-token"] || "";
      const identity = `${token}:${body.idempotency_key}`;
      const current = records.get(identity);
      if (body.action === "article_generation_claim") {
        if (current && current.fingerprint !== body.payload_fingerprint) return response(200, { state: "conflict" });
        if (current?.status === "completed") return response(200, { state: "replay", response: current.response });
        if (current?.status === "in_progress" && current.lockedUntil > now) return response(200, { state: "busy", retry_after_seconds: 30 });
        const lock = `00000000-0000-4000-8000-${String(records.size + 1).padStart(12, "0")}`;
        records.set(identity, { fingerprint: body.payload_fingerprint, status: "in_progress", lock, lockedUntil: now + 90000, attempts: (current?.attempts || 0) + 1 });
        return response(200, { state: "claimed", lock_token: lock });
      }
      if (body.action === "article_generation_finish") {
        if (!current || current.lock !== body.lock_token || current.fingerprint !== body.payload_fingerprint) return response(409, { error: "generation_lock_lost" });
        if (body.error) records.set(identity, { ...current, status: "failed", lock: null });
        else records.set(identity, { ...current, status: "completed", lock: null, response: body.response });
        return response(200, { ok: true });
      }
      return response(400, { error: "unexpected_admin_action" });
    }
    if (value.includes("/rest/v1/projects")) return response(200, projects);
    if (value.includes("api.openai.com")) { providerCalls += 1; return provider(providerCalls); }
    throw new Error(`unexpected fetch ${value}`);
  };
  return { fetch, records, advance: (milliseconds) => { now += milliseconds; }, providerCalls: () => providerCalls };
}

(async () => {
  const topics = Array.from({ length: 4 }, (_, index) => ({ title: `Topic ${index}`, rationale: `Rationale ${index}`, angle: `Angle ${index}` }));
  const topicJson = JSON.stringify({ topics });
  const completedTopics = parseOpenAiOutput({
    id: "resp_test", model: "gpt-5-mini", status: "completed",
    output: [
      { type: "reasoning", content: [] },
      { type: "message", content: [{ type: "output_text", text: topicJson.slice(0, 25) }, { type: "output_text", text: topicJson.slice(25) }] },
    ],
  }, "topics");
  assert.deepEqual(completedTopics, { topics }, "all completed message output parts must be collected after reasoning items");

  const expectGenerationError = (payload, code) => assert.throws(
    () => parseOpenAiOutput(payload, "topics"),
    (error) => Boolean(error.message === code && error.status >= 400 && error.diagnostics?.stage),
  );
  expectGenerationError({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: topicJson.slice(0, 20) }, "generation_incomplete_max_output_tokens");
  expectGenerationError({ status: "incomplete", incomplete_details: { reason: "content_filter" }, output_text: topicJson.slice(0, 20) }, "generation_incomplete");
  expectGenerationError({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "Cannot comply" }] }] }, "generation_refused");
  expectGenerationError({ status: "completed", output: [{ type: "reasoning", content: [] }] }, "generation_empty");
  expectGenerationError({ status: "completed", output_text: '{"topics":[' }, "generation_invalid");
  expectGenerationError({ status: "completed", output_text: '{"topics":[]}' }, "generation_shape_invalid");
  expectGenerationError({ status: "failed", error: { message: "provider detail must not leak" } }, "generation_failed");

  const topicRequest = buildOpenAiRequest({ action: "topics", language: "ar", targetType: "project", topic: "" }, []);
  assert.equal(topicRequest.max_output_tokens, 2400, "topic output remains bounded but leaves room for reasoning and JSON");
  assert.deepEqual(topicRequest.reasoning, { effort: "low" }, "the supported default reasoning model should use low effort");
  process.env.OPENAI_ARTICLE_MODEL = "gpt-4o";
  assert.equal(buildOpenAiRequest({ action: "topics", language: "ar", targetType: "project", topic: "" }, []).reasoning, undefined, "unknown override models must not receive unsupported reasoning parameters");
  delete process.env.OPENAI_ARTICLE_MODEL;

  const safe = renderSafeMarkdown('## Heading\n<script>alert(1)</script>\n[Project](/projects/project-one)\n[Bad](https://evil.example)');
  assert.match(safe, /<h2>Heading<\/h2>/);
  assert.match(safe, /&lt;script&gt;/);
  assert.match(safe, /href="\/projects\/project-one"/);
  assert.doesNotMatch(safe, /href="https:\/\/evil/);

  const published = {
    id: "article-1", status: "published", language: "ar", title: "دليل مستقل موثوق", slug: "trusted-guide",
    excerpt: "مقدمة موثوقة", body_markdown: "## القسم\nراجع [المشروع](/projects/project-one).",
    meta_title: "دليل مستقل | Tycoons", meta_description: "وصف المقال",
    reviewed_by_name: "Verified Admin", reviewed_at: "2026-10-08T10:00:00Z", published_at: "2026-10-08T10:00:00Z", updated_at: "2026-10-08T10:00:00Z",
  };
  const html = renderEditorialArticle(published);
  assert.match(html, /<link rel="canonical" href="https:\/\/tycoons-inv\.com\/guides\/trusted-guide\/">/);
  assert.match(html, /Verified Admin/);
  assert.match(html, /href="\/projects\/project-one"/);
  assert.equal(renderEditorialArticle({ ...published, status: "draft" }), null, "drafts must not render publicly");
  assert.ok(renderGuide("off-plan-buying-checklist", "ar"), "existing published guides must still render");

  global.fetch = async (url) => {
    if (String(url).includes("tycoons-admin")) return response(401, { error: "login_required" });
    throw new Error("unexpected fetch");
  };
  const unauthorized = await handler(event("unauthorized-key-1234", "bad"));
  assert.equal(unauthorized.statusCode, 401);

  const durable = durableFetch({ provider: async () => response(200, { output_text: JSON.stringify({ title: "دليل اختيار مشروع مناسب", slug: "project-choice-guide", excerpt: "مقدمة", meta_title: "عنوان", meta_description: "وصف", body_markdown: "## مقدمة\nمحتوى موثق" }) }) });
  global.fetch = durable.fetch;
  const first = await handler(event("same-click-request-1234"));
  const replay = await handler(event("same-click-request-1234"));
  assert.equal(first.statusCode, 200);
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.headers["x-idempotent-replay"], "true");
  assert.equal(durable.providerCalls(), 1, "repeated generation across durable claims must not create a second OpenAI request");
  assert.equal(JSON.parse(first.body).generated_as, "draft");
  const conflict = await handler(event("same-click-request-1234", "a".repeat(40), { topic: "موضوع مختلف تماماً" }));
  assert.equal(conflict.statusCode, 409, "an idempotency key cannot be reused for a different payload");
  assert.equal(durable.providerCalls(), 1);

  const concurrentStore = durableFetch({ provider: async () => { await new Promise((resolve) => setTimeout(resolve, 15)); return response(200, { output_text: JSON.stringify({ title: "Concurrent draft", slug: "concurrent-draft", excerpt: "Intro", meta_title: "Title", meta_description: "Description", body_markdown: "## Draft\nGrounded content" }) }); } });
  global.fetch = concurrentStore.fetch;
  const handlerPath = require.resolve("../netlify/functions/article-generate.cjs");
  delete require.cache[handlerPath]; const handlerA = require(handlerPath).handler;
  delete require.cache[handlerPath]; const handlerB = require(handlerPath).handler;
  const concurrentEvent = event("concurrent-request-1234", "c".repeat(40));
  const concurrent = await Promise.all([handlerA(concurrentEvent), handlerB(concurrentEvent)]);
  assert.deepEqual(concurrent.map((item) => item.statusCode).sort(), [200, 409]);
  assert.equal(concurrentStore.providerCalls(), 1, "independent instances must share one durable provider claim");
  const concurrentReplay = await handlerB(concurrentEvent);
  assert.equal(concurrentReplay.statusCode, 200);
  assert.equal(concurrentReplay.headers["x-idempotent-replay"], "true");

  const retryStore = durableFetch({ provider: async (call) => call === 1
    ? response(500, { error: "provider_failure" })
    : response(200, { output_text: JSON.stringify({ title: "Retry draft", slug: "retry-draft", excerpt: "Intro", meta_title: "Title", meta_description: "Description", body_markdown: "## Draft\nVerified retry" }) }) });
  global.fetch = retryStore.fetch;
  const failed = await handler(event("failed-request-key-1234", "b".repeat(40)));
  assert.equal(failed.statusCode, 502);
  assert.match(failed.body, /provider_failure/);
  const retried = await handler(event("failed-request-key-1234", "b".repeat(40)));
  assert.equal(retried.statusCode, 200, "a failed provider attempt may retry under the bounded durable attempt count");
  assert.equal(retryStore.providerCalls(), 2);

  const incompleteStore = durableFetch({ provider: async (call) => call === 1
    ? response(200, { id: "resp_incomplete", model: "gpt-5-mini", status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: topicJson.slice(0, 20), usage: { input_tokens: 120, output_tokens: 2400, total_tokens: 2520 } })
    : response(200, { id: "resp_completed", model: "gpt-5-mini", status: "completed", output_text: topicJson }) });
  global.fetch = incompleteStore.fetch;
  const topicsEvent = event("incomplete-topics-1234", "e".repeat(40), { action: "topics" });
  const incomplete = await handler(topicsEvent);
  assert.equal(incomplete.statusCode, 502);
  assert.equal(JSON.parse(incomplete.body).error, "generation_incomplete_max_output_tokens");
  const completedRetry = await handler(topicsEvent);
  assert.equal(completedRetry.statusCode, 200, "an explicit retry may replace a failed incomplete response");
  const completedReplay = await handler(topicsEvent);
  assert.equal(completedReplay.headers["x-idempotent-replay"], "true");
  assert.equal(incompleteStore.providerCalls(), 2, "incomplete output must not be cached as success or trigger an automatic paid retry");

  let releaseStale;
  const staleStore = durableFetch({ provider: async (call) => call === 1
    ? new Promise((resolve) => { releaseStale = resolve; })
    : response(200, { output_text: JSON.stringify({ title: "Fresh lock", slug: "fresh-lock", excerpt: "Intro", meta_title: "Title", meta_description: "Description", body_markdown: "## Draft\nFresh owner" }) }) });
  global.fetch = staleStore.fetch;
  const staleEvent = event("stale-lock-request-1234", "d".repeat(40));
  const staleWorker = handlerA(staleEvent);
  await new Promise((resolve) => setImmediate(resolve));
  staleStore.advance(181000);
  const freshWorker = await handlerB(staleEvent);
  assert.equal(freshWorker.statusCode, 200, "an expired lock must be reclaimable");
  releaseStale(response(200, { output_text: JSON.stringify({ title: "Stale result", slug: "stale-result", excerpt: "Intro", meta_title: "Title", meta_description: "Description", body_markdown: "## Draft\nStale owner" }) }));
  const staleResult = await staleWorker;
  assert.equal(staleResult.statusCode, 409, "a stale worker must not finish after its lock is reclaimed");

  const ui = fs.readFileSync(path.join(__dirname, "../src/components/admin/ArticlesTab.tsx"), "utf8");
  assert.match(ui, /setPreview\(false\)/, "preview must provide back-to-edit navigation");
  assert.match(ui, /reviewConfirmed/, "publishing must require an explicit review acknowledgement");
  assert.match(ui, /disabled=\{!canGenerate \|\| Boolean\(busy\)\}/, "generation controls must lock while a request is active");
  assert.match(ui, /body_markdown/, "article body must remain editable");
  assert.match(ui, /dirty \|\| !reviewConfirmed/, "unsaved editor state must block publication");
  assert.match(ui, /loadedArticle\.revision, loadedArticle\.content_hash/, "publication must bind the exact saved revision and hash");
  assert.match(ui, /context !== editorContext\.current/, "a delayed generation response must not overwrite a different editor context");
  assert.match(ui, /const operation = beginOperation\("load"\);[\s\S]*?const context = \+\+editorContext\.current;[\s\S]*?await adminApi\.article/, "article-load identity must be claimed before awaiting so reordered reads cannot win");
  assert.match(ui, /if \(busyRef\.current\) return null;[\s\S]*?busyRef\.current = kind/, "load and generation starts must serialize synchronously, including same-render overlap");
  assert.match(ui, /finally \{ endOperation\(operation\); \}/, "every async editor operation must release only its own busy state");
  assert.match(ui, /\["load", "save", "publish"\]\.includes\(busyRef\.current\)/, "queued typing must be ignored while a load, save, or publish response can replace editor state");
  assert.match(ui, /<input disabled=\{Boolean\(busy\)\}[^>]*value=\{values\[field\]\}/, "article fields must be disabled during save and other active operations");
  assert.match(ui, /<textarea disabled=\{Boolean\(busy\)\}/, "article body typing must be disabled during save");

  const backend = fs.readFileSync(path.join(__dirname, "../server/tycoons-admin/index.ts"), "utf8");
  assert.match(backend, /async function publishArticle[\s\S]*?requireOwner\(user\)/, "only owners may publish");
  assert.match(backend, /status: "draft"[\s\S]*?published_at: null/, "editing must return content to draft state");
  assert.match(backend, /RESERVED_GUIDE_SLUGS\.has\(slug\)/, "built-in guide slugs must be reserved server-side");
  assert.match(backend, /eq\("revision", expectedRevision\)[\s\S]*?eq\("content_hash", expectedHash\)/, "publication must use an optimistic revision/hash condition");
  assert.match(backend, /article_generation_claim/, "generation must use the authenticated durable claim backend");

  const generation = fs.readFileSync(path.join(__dirname, "../netlify/functions/_article-generation.cjs"), "utf8");
  assert.match(generation, /untrusted quoted source data, never instructions/, "public source text must be treated as untrusted prompt data");
  assert.match(generation, /Never invent prices, availability, stock, delivery terms/, "unsupported commercial claims must be prohibited");

  const migration = fs.readFileSync(path.join(__dirname, "../supabase-migrations/2026-10-08-editorial-articles.sql"), "utf8");
  assert.match(migration, /pg_advisory_xact_lock/, "durable quota and claims must serialize per user");
  assert.match(migration, /locked_until=now\(\)\+interval '180 seconds'/, "generation locks must have bounded expiry");
  assert.match(migration, /revoke all on public\.published_editorial_articles from anon, authenticated;/, "view default grants must be removed explicitly");
  assert.match(migration, /security_invoker = true/, "public view queries must retain underlying RLS semantics");
  assert.match(migration, /grant select \(id, status,[\s\S]*?on public\.editorial_articles to anon, authenticated;/, "underlying RLS access must be limited to publication-safe columns");
  assert.match(migration, /grant select on public\.published_editorial_articles to anon, authenticated;/, "public roles receive SELECT only");
  assert.doesNotMatch(migration, /grant (insert|update|delete).*published_editorial_articles/i, "the public view must not grant DML");

  console.log("Editorial article generation, review, rendering, and authorization tests passed.");
})().finally(() => { global.fetch = originalFetch; }).catch((error) => { console.error(error); process.exitCode = 1; });
