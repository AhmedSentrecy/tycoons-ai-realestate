"use strict";

// Runs the article requests (built for the OpenAI Responses API by _article-generation.cjs)
// on Claude's Messages API, and returns a Responses-shaped payload so parseOpenAiOutput and
// every validation rule stay exactly the same for both providers.
//
// - JSON-schema output: output_config.format (no beta header).
// - Web research: the web_search server tool. Its citations are always on and cannot be
//   combined with output_config.format, so research asks for the JSON as plain text; if that
//   text does not parse, one short follow-up call (no tools) converts it with the schema.
// - Research sources must be pages the search actually returned; other URLs are dropped.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5-5";
// Tried in order: if Claude rejects a tool definition (400, free), the next form is sent.
// Newer versions call search "direct" (without the code-execution filter) to keep the same behaviour.
const WEB_SEARCH_VARIANTS = [
  (uses) => ({ type: "web_search_20250305", name: "web_search", max_uses: uses, user_location: { type: "approximate", country: "EG" } }),
  (uses) => ({ type: "web_search_20260318", name: "web_search", max_uses: uses, allowed_callers: ["direct"], user_location: { type: "approximate", country: "EG" } }),
  (uses) => ({ type: "web_search_20260318", name: "web_search", max_uses: uses, allowed_callers: ["direct"] }),
  (uses) => ({ type: "web_search_20260209", name: "web_search", max_uses: uses, allowed_callers: ["direct"] }),
];

const articleModel = () => process.env.ANTHROPIC_ARTICLE_MODEL || DEFAULT_MODEL;
const researchModel = () => process.env.ANTHROPIC_RESEARCH_MODEL || articleModel();

/** Keywords the structured-output grammar does not accept; counts move into the description. */
function claudeSchema(node) {
  if (Array.isArray(node)) return node.map(claudeSchema);
  if (!node || typeof node !== "object") return node;
  const out = {};
  const notes = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "maxItems") { notes.push(`at most ${value} items`); continue; }
    if (key === "minItems") { if (value > 1) notes.push(`at least ${value} items`); out.minItems = Math.min(1, Number(value) || 0); continue; }
    if (["minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "pattern"].includes(key)) {
      notes.push(`${key} ${value}`);
      continue;
    }
    out[key] = key === "properties"
      ? Object.fromEntries(Object.entries(value).map(([name, child]) => [name, claudeSchema(child)]))
      : claudeSchema(value);
  }
  if (out.type === "object" && out.additionalProperties === undefined) out.additionalProperties = false;
  if (notes.length) out.description = [out.description, notes.join(", ")].filter(Boolean).join(" — ");
  return out;
}

/** OpenAI Responses request → Claude Messages request. */
function toClaudeRequest(request, { forceSchema = true } = {}) {
  const messages = (Array.isArray(request.input) ? request.input : []);
  const system = messages.filter((item) => item.role === "system").map((item) => String(item.content)).join("\n\n");
  const user = messages.filter((item) => item.role !== "system").map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: String(item.content) }));
  const schema = request.text?.format?.schema;
  const search = Array.isArray(request.tools) && request.tools.some((tool) => tool?.type === "web_search");
  const body = {
    model: search ? researchModel() : articleModel(),
    max_tokens: Math.max(2000, Math.min(32000, Number(request.max_output_tokens) || 8000)),
    system,
    messages: user,
  };
  if (search) {
    body.tools = [WEB_SEARCH_VARIANTS[0](Number(request.max_tool_calls) || 8)];
    if (schema) {
      body.system += `\n\nWhen your research is finished, reply with one JSON object only (no prose, no Markdown fences) that matches this JSON schema:\n${JSON.stringify(schema)}`;
    }
  } else if (schema && forceSchema) {
    body.output_config = { format: { type: "json_schema", schema: claudeSchema(schema) } };
  }
  return body;
}

function claudeFailure(response, data) {
  const error = data?.error && typeof data.error === "object" ? data.error : {};
  const type = typeof error.type === "string" ? error.type : "";
  const message = typeof error.message === "string" ? error.message : "";
  const requestId = String(response.headers?.get?.("request-id") || "").trim();
  const retryAfter = Number(response.headers?.get?.("retry-after"));
  let code = "generation_provider_failed";
  let status = 502;
  if (/credit balance/i.test(message)) code = "generation_provider_credit_exhausted";
  else if (/spend limit|usage limit/i.test(message)) code = "generation_provider_spend_limit_exceeded";
  else if (response.status === 401 || type === "authentication_error") { code = "generation_provider_authentication_failed"; status = 503; }
  else if (response.status === 403 || type === "permission_error") { code = "generation_provider_permission_denied"; status = 503; }
  else if (response.status === 404 || type === "not_found_error") { code = "generation_provider_model_access_failed"; status = 503; }
  else if (response.status === 429 || type === "rate_limit_error") { code = "generation_provider_rate_limited"; status = 429; }
  else if (response.status >= 500 || type === "overloaded_error" || type === "api_error") { code = "generation_provider_unavailable"; status = 503; }
  else if (response.status === 400) code = "generation_provider_request_invalid";
  // Claude's own reason, shown in the admin so a rejected request can be fixed (never a key).
  const detail = message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, "[key]").replace(/\s+/g, " ").trim().slice(0, 240);
  return Object.assign(new Error(code), {
    status,
    ...(detail ? { providerDetail: detail } : {}),
    diagnostics: {
      ...(detail ? { provider_error_message: detail } : {}),
      stage: "provider_response",
      provider: "anthropic",
      provider_status: response.status,
      ...(type ? { provider_error_type: type.slice(0, 60) } : {}),
      ...(/^req_[a-zA-Z0-9_-]{1,150}$/.test(requestId) ? { provider_request_id: requestId } : {}),
    },
    ...(code === "generation_provider_rate_limited" && Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfterSeconds: Math.ceil(retryAfter) } : {}),
  });
}

async function callClaude(body, timeoutMs) {
  let response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw Object.assign(new Error("generation_provider_unavailable"), {
      status: 503,
      diagnostics: { stage: "provider_transport", provider: "anthropic", ...(["AbortError", "TimeoutError", "TypeError"].includes(error?.name) ? { provider_error_type: error.name } : {}) },
    });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw claudeFailure(response, data);
  return data;
}

const finalText = (content) => {
  // Text written after the last search result is the answer; earlier text is narration.
  let last = -1;
  content.forEach((block, index) => { if (block?.type === "web_search_tool_result" || block?.type === "server_tool_use") last = index; });
  return content.slice(last + 1).filter((block) => block?.type === "text").map((block) => block.text).join("").trim();
};

function searchedUrls(content) {
  const urls = new Set();
  for (const block of content) {
    if (block?.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const result of block.content) if (typeof result?.url === "string") urls.add(normalizeUrl(result.url));
  }
  return urls;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return String(value);
  }
}

function extractJson(text) {
  const cleaned = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

/** Keeps only research sources the search really returned (when the response lists them). */
function keepSearchedSources(value, urls) {
  if (!urls.size || !value || typeof value !== "object") return value;
  const listKey = Array.isArray(value.facts) ? "facts" : Array.isArray(value.faq) ? "faq" : "";
  if (!listKey) return value;
  return {
    ...value,
    [listKey]: value[listKey].map((item) => ({
      ...item,
      sources: (Array.isArray(item?.sources) ? item.sources : []).filter((source) => urls.has(normalizeUrl(source?.url))),
    })),
  };
}

function responsesPayload(message, text, extra = {}) {
  const stop = message?.stop_reason;
  const usage = message?.usage || {};
  const inputTokens = (Number(usage.input_tokens) || 0) + (Number(extra.inputTokens) || 0);
  const outputTokens = (Number(usage.output_tokens) || 0) + (Number(extra.outputTokens) || 0);
  const payload = {
    id: String(message?.id || ""),
    model: String(message?.model || ""),
    provider: "anthropic",
    status: stop === "max_tokens" ? "incomplete" : "completed",
    ...(stop === "max_tokens" ? { incomplete_details: { reason: "max_output_tokens" } } : {}),
    output: [{ type: "message", content: stop === "refusal" ? [{ type: "refusal", refusal: "refused" }] : [{ type: "output_text", text }] }],
    output_text: stop === "refusal" ? "" : text,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens, web_searches: Number(usage.server_tool_use?.web_search_requests) || 0 },
  };
  return payload;
}

/**
 * Runs one Responses-style request on Claude and returns a Responses-shaped payload.
 * Web-search turns may pause (stop_reason "pause_turn"); the paused turn is sent back to continue.
 */
async function claudeResponses(request, timeoutMs = 60000) {
  const started = Date.now();
  const left = () => Math.max(5000, timeoutMs - (Date.now() - started));
  let body = toClaudeRequest(request);
  let message;
  for (let variant = 0; ; variant += 1) {
    try {
      message = await callClaude(body, left());
      break;
    } catch (error) {
      const toolRejected = Array.isArray(body.tools) && error?.message === "generation_provider_request_invalid" && /tools|web_search/i.test(error?.providerDetail || "");
      if (!toolRejected || variant + 1 >= WEB_SEARCH_VARIANTS.length) throw error;
      console.error("[article-generate]", JSON.stringify({ web_search_variant_rejected: body.tools[0].type, detail: error.providerDetail }));
      body = { ...body, tools: [WEB_SEARCH_VARIANTS[variant + 1](body.tools[0].max_uses)] };
    }
  }
  const content = [...(message.content || [])];
  for (let turn = 0; message.stop_reason === "pause_turn" && turn < 3; turn += 1) {
    message = await callClaude({ ...body, messages: [...body.messages, { role: "assistant", content }] }, left());
    content.push(...(message.content || []));
  }
  if (message.stop_reason === "pause_turn") message = { ...message, stop_reason: "max_tokens" };

  const searched = Array.isArray(body.tools);
  let text = searched ? finalText(content) : content.filter((block) => block?.type === "text").map((block) => block.text).join("").trim();
  if (!searched || message.stop_reason !== "end_turn") return responsesPayload(message, text);

  // Research: the JSON arrives as plain text. Parse it, or convert it once with the schema.
  const urls = searchedUrls(content);
  let value = extractJson(text);
  let extra = {};
  if (!value && text && request.text?.format?.schema) {
    const fix = await callClaude({
      model: articleModel(),
      max_tokens: body.max_tokens,
      system: "Convert the research notes into the JSON schema exactly. Keep every fact, URL and title as written; never add facts or URLs.",
      messages: [{ role: "user", content: text }],
      output_config: { format: { type: "json_schema", schema: claudeSchema(request.text.format.schema) } },
    }, left());
    extra = { inputTokens: fix.usage?.input_tokens, outputTokens: fix.usage?.output_tokens };
    if (fix.stop_reason !== "end_turn") return responsesPayload(fix, "", extra);
    value = extractJson(fix.content?.filter((block) => block?.type === "text").map((block) => block.text).join(""));
  }
  if (value) text = JSON.stringify(keepSearchedSources(value, urls));
  return responsesPayload(message, text, extra);
}

module.exports = { claudeResponses, claudeSchema, toClaudeRequest, extractJson, keepSearchedSources, normalizeUrl, DEFAULT_MODEL };
