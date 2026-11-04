"use strict";
// Offline tests for running article generation on Claude (no network: fetch is mocked).
const assert = require("node:assert/strict");
const { claudeResponses, claudeSchema, extractJson } = require("../netlify/functions/_anthropic-provider.cjs");
const { buildOpenAiRequest, buildResearchRequest, parseOpenAiOutput } = require("../netlify/functions/_article-generation.cjs");

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks += 1; };
const headers = (map = {}) => ({ get: (name) => map[name.toLowerCase()] ?? null });
const reply = (body, status = 200, head = {}) => ({ ok: status < 400, status, headers: headers(head), json: async () => body });

const project = { id: "p1", name: "Telal East", developer: "Roya", location: "New Cairo", slug: "telal-east" };
const draftInput = { action: "draft", language: "ar", targetType: "project", projectId: "p1", topic: "Telal East", researchFacts: [] };
const researchInput = { action: "research", language: "ar", targetType: "project", projectId: "p1", topic: "Telal East" };

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (!node || typeof node !== "object") return;
  visit(node);
  Object.values(node).forEach((value) => walk(value, visit));
}

(async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.ARTICLE_PROVIDER;
  delete process.env.ANTHROPIC_ARTICLE_MODEL;
  delete process.env.ANTHROPIC_RESEARCH_MODEL;

  // 1. Schema: unsupported keywords removed, counts kept as text.
  const schema = claudeSchema({ type: "object", additionalProperties: false, properties: { a: { type: "array", minItems: 4, maxItems: 6, items: { type: "string", maxLength: 9 } } }, required: ["a"] });
  walk(schema, (node) => { ok(!("maxItems" in node) && !("maxLength" in node), "unsupported keyword removed"); if ("minItems" in node) ok(node.minItems <= 1, "minItems capped at 1"); });
  ok(/at least 4 items/.test(schema.properties.a.description) && /at most 6 items/.test(schema.properties.a.description), "counts kept in description");

  // 2. Draft: structured output, model, headers; payload parses with the same validator path.
  let calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return reply({ id: "msg_1", model: "claude-sonnet-5-5", stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: "text", text: '{"hello":"world"}' }] });
  };
  const draftPayload = await claudeResponses(buildOpenAiRequest(draftInput, [project], []), 60000);
  eq(calls.length, 1, "one draft call");
  eq(calls[0].url, "https://api.anthropic.com/v1/messages", "Messages API");
  eq(calls[0].options.headers["x-api-key"], "test-key", "api key header");
  eq(calls[0].options.headers["anthropic-version"], "2023-06-01", "version header");
  eq(calls[0].body.model, "claude-sonnet-5-5", "default model Sonnet 5.5");
  eq(calls[0].body.output_config.format.type, "json_schema", "json schema output");
  ok(!calls[0].body.tools, "no tools on drafts");
  ok(calls[0].body.system.includes("Use only the supplied public facts"), "system rules kept");
  ok(calls[0].body.messages[0].content.includes("BEGIN_UNTRUSTED_PUBLIC_FACTS"), "facts sent as user content");
  walk(calls[0].body.output_config.format.schema, (node) => ok(!("maxItems" in node), "draft schema sanitized"));
  eq(draftPayload.status, "completed", "completed");
  eq(draftPayload.output_text, '{"hello":"world"}', "text passed through");
  eq(draftPayload.usage.total_tokens, 150, "usage summed");

  process.env.ANTHROPIC_ARTICLE_MODEL = "claude-opus-5-5";
  calls = [];
  await claudeResponses(buildOpenAiRequest(draftInput, [project], []), 60000);
  eq(calls[0].body.model, "claude-opus-5-5", "model from env");
  delete process.env.ANTHROPIC_ARTICLE_MODEL;

  // 3. Research: web search tool, JSON as text, pause_turn continued, unsearched URLs dropped.
  const facts = { facts: [
    { fact: "يقع المشروع في التجمع الخامس.", category: "location", confidence: "corroborated", sources: [{ url: "https://roya.com/telal-east/", title: "Roya" }, { url: "https://news.eg/a", title: "News" }, { url: "https://invented.example/x", title: "Fake" }] },
  ], notes: "" };
  let turn = 0;
  calls = [];
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ body });
    turn += 1;
    if (turn === 1) return reply({ id: "msg_r1", model: "claude-sonnet-5-5", stop_reason: "pause_turn", usage: { input_tokens: 10, output_tokens: 5, server_tool_use: { web_search_requests: 2 } }, content: [
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "Telal East" } },
      { type: "web_search_tool_result", tool_use_id: "s1", content: [{ type: "web_search_result", url: "https://www.roya.com/telal-east", title: "Roya" }, { type: "web_search_result", url: "https://news.eg/a", title: "News" }] },
    ] });
    return reply({ id: "msg_r2", model: "claude-sonnet-5-5", stop_reason: "end_turn", usage: { input_tokens: 20, output_tokens: 30 }, content: [{ type: "text", text: "```json\n" + JSON.stringify(facts) + "\n```", citations: [] }] });
  };
  const researchPayload = await claudeResponses(buildResearchRequest(researchInput, [project]), 50000);
  eq(calls.length, 2, "pause_turn continued once");
  eq(calls[0].body.tools[0].type, "web_search_20250305", "web search tool");
  eq(calls[0].body.tools[0].max_uses, 8, "max searches kept");
  eq(calls[0].body.tools[0].user_location, { type: "approximate", country: "EG" }, "Egypt location");
  ok(!calls[0].body.output_config, "no structured output with web search (citations)");
  ok(calls[0].body.system.includes("reply with one JSON object only"), "JSON asked in text");
  eq(calls[1].body.messages.at(-1).role, "assistant", "paused turn sent back");
  const parsedFacts = JSON.parse(researchPayload.output_text);
  eq(parsedFacts.facts[0].sources.map((source) => source.url), ["https://roya.com/telal-east/", "https://news.eg/a"], "only searched URLs kept (www/trailing slash tolerant)");
  const validated = parseOpenAiOutput(researchPayload, "research", { input: researchInput, projects: [project] });
  eq(validated.facts.length, 1, "research validator accepts the payload");

  // 4. Research text that is not JSON → one conversion call with the schema.
  turn = 0;
  calls = [];
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ body });
    turn += 1;
    if (turn === 1) return reply({ id: "m", stop_reason: "end_turn", usage: {}, content: [
      { type: "web_search_tool_result", content: [{ url: "https://roya.com/telal-east", title: "Roya" }] },
      { type: "text", text: "Here are the facts: the project is in New Cairo (roya.com/telal-east)." },
    ] });
    return reply({ id: "m2", stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 }, content: [{ type: "text", text: JSON.stringify({ facts: [{ fact: "x", category: "location", confidence: "official", sources: [{ url: "https://roya.com/telal-east", title: "Roya" }] }], notes: "" }) }] });
  };
  const fixed = await claudeResponses(buildResearchRequest(researchInput, [project]), 50000);
  eq(calls.length, 2, "conversion call made");
  ok(!calls[1].body.tools && calls[1].body.output_config, "conversion uses schema, no tools");
  eq(JSON.parse(fixed.output_text).facts.length, 1, "converted facts returned");

  // 5. Stops: max_tokens → incomplete, refusal → refusal.
  global.fetch = async () => reply({ id: "m", stop_reason: "max_tokens", usage: {}, content: [{ type: "text", text: '{"a":' }] });
  const cut = await claudeResponses(buildOpenAiRequest(draftInput, [project], []), 60000);
  eq([cut.status, cut.incomplete_details.reason], ["incomplete", "max_output_tokens"], "max tokens maps to incomplete");
  assert.throws(() => parseOpenAiOutput(cut, "draft", {}), /generation_incomplete_max_output_tokens/); checks += 1;
  global.fetch = async () => reply({ id: "m", stop_reason: "refusal", usage: {}, content: [] });
  const refused = await claudeResponses(buildOpenAiRequest(draftInput, [project], []), 60000);
  assert.throws(() => parseOpenAiOutput(refused, "draft", {}), /generation_refused/); checks += 1;

  // 6. Provider errors map to the existing error codes.
  const fails = [
    [reply({ type: "error", error: { type: "rate_limit_error", message: "slow" } }, 429, { "retry-after": "30" }), "generation_provider_rate_limited", 30],
    [reply({ type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } }, 400), "generation_provider_credit_exhausted"],
    [reply({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }, 401), "generation_provider_authentication_failed"],
    [reply({ type: "error", error: { type: "not_found_error", message: "model" } }, 404), "generation_provider_model_access_failed"],
    [reply({ type: "error", error: { type: "overloaded_error", message: "busy" } }, 529), "generation_provider_unavailable"],
  ];
  for (const [response, code, retry] of fails) {
    global.fetch = async () => response;
    await assert.rejects(claudeResponses(buildOpenAiRequest(draftInput, [project], []), 60000), (error) => error.message === code && (!retry || error.retryAfterSeconds === retry));
    checks += 1;
  }
  global.fetch = async () => reply({ type: "error", error: { type: "invalid_request_error", message: "tools.0: bad field   sk-ant-api03-SECRET" } }, 400);
  await assert.rejects(claudeResponses(buildOpenAiRequest(draftInput, [project], []), 60000), (error) => error.message === "generation_provider_request_invalid" && error.providerDetail === "tools.0: bad field [key]");
  checks += 1;
  global.fetch = async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); };
  await assert.rejects(claudeResponses(buildOpenAiRequest(draftInput, [project], []), 60000), /generation_provider_unavailable/); checks += 1;
  eq(extractJson('noise {"a":1} tail'), { a: 1 }, "JSON found inside text");

  // 7. Provider choice and OpenAI fallback (handler module).
  const { __test } = require("../netlify/functions/article-generate.cjs");
  process.env.OPENAI_API_KEY = "openai-key";
  delete process.env.ARTICLE_PROVIDER;
  eq(__test.articleProvider(), "anthropic", "Claude when its key is set");
  process.env.ARTICLE_PROVIDER = "openai";
  eq(__test.articleProvider(), "openai", "ARTICLE_PROVIDER=openai switches back");
  delete process.env.ARTICLE_PROVIDER;
  const used = [];
  global.fetch = async (url) => {
    used.push(String(url));
    if (String(url).includes("anthropic")) return reply({ type: "error", error: { type: "authentication_error", message: "bad" } }, 401);
    return reply({ status: "completed", output_text: "{}", output: [] });
  };
  const originalError = console.error; console.error = () => {};
  const fallback = await __test.providerCall(buildOpenAiRequest(draftInput, [project], []), 60000, "sid");
  console.error = originalError;
  eq(used.map((url) => new URL(url).hostname), ["api.anthropic.com", "api.openai.com"], "account failure falls back to OpenAI");
  eq(fallback.output_text, "{}", "fallback result returned");
  used.length = 0;
  global.fetch = async (url) => { used.push(String(url)); return reply({ type: "error", error: { type: "rate_limit_error", message: "x" } }, 429); };
  await assert.rejects(__test.providerCall(buildOpenAiRequest(draftInput, [project], []), 60000, "sid"), /generation_provider_rate_limited/); checks += 1;
  eq(used.length, 1, "rate limit does not switch provider");
  used.length = 0;
  global.fetch = async (url) => { used.push(String(url)); throw Object.assign(new Error("t"), { name: "TimeoutError" }); };
  await assert.rejects(__test.providerCall(buildOpenAiRequest(draftInput, [project], []), 60000, "sid"), /generation_provider_unavailable/); checks += 1;
  eq(used.length, 1, "timeout does not buy a second draft from OpenAI");
  delete process.env.ANTHROPIC_API_KEY;
  eq(__test.articleProvider(), "openai", "OpenAI when only its key is set");

  console.log(`Claude article provider tests passed (${checks} checks; offline only).`);
})().catch((error) => { console.error(error); process.exit(1); });
