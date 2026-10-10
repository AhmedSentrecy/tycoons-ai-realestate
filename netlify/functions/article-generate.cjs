"use strict";

const crypto = require("node:crypto");
const { RESEARCH_FALLBACK_MODEL, IDEMPOTENCY_RE, jsonResponse, parseRequest, safeProject, safeUnit, sourceRefs, webSourceRefs, buildOpenAiRequest, buildResearchRequest, parseOpenAiOutput, groundInputForFacts } = require("./_article-generation.cjs");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const PROVIDER_CREDIT_CODES = new Set(["credit_balance_exhausted"]);
const PROVIDER_SPEND_CODES = new Set(["organization_spend_limit_exceeded", "project_spend_limit_exceeded", "billing_hard_limit_reached"]);
const PROVIDER_USAGE_CODES = new Set(["organization_usage_limit_exceeded"]);
const PROVIDER_RATE_CODES = new Set(["rate_limit_exceeded", "slow_down"]);
const SAFE_PROVIDER_CODES = new Set([
  ...PROVIDER_CREDIT_CODES, ...PROVIDER_SPEND_CODES, ...PROVIDER_USAGE_CODES, ...PROVIDER_RATE_CODES,
  "insufficient_quota", "invalid_api_key", "model_not_found", "server_is_overloaded",
]);
const SAFE_PROVIDER_TYPES = new Set(["insufficient_quota", "rate_limit_error", "invalid_request_error", "permission_error", "service_unavailable_error"]);

function safeProviderParam(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > 80 || /(?:sk-|key|token|secret|bearer|authorization)/i.test(text)) return undefined;
  return /^[a-zA-Z][a-zA-Z0-9_.\[\]-]*$/.test(text) ? text : undefined;
}

function safeProviderRequestId(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^req[-_][a-zA-Z0-9_-]{1,150}$/.test(text) ? text : undefined;
}

function providerFailure(response, data) {
  const providerError = data?.error && typeof data.error === "object" && !Array.isArray(data.error) ? data.error : {};
  const rawCode = typeof providerError.code === "string" ? providerError.code : "";
  const rawType = typeof providerError.type === "string" ? providerError.type : "";
  const code = SAFE_PROVIDER_CODES.has(rawCode) ? rawCode : undefined;
  const type = SAFE_PROVIDER_TYPES.has(rawType) ? rawType : undefined;
  const param = safeProviderParam(providerError.param);
  const requestId = safeProviderRequestId(response.headers?.get?.("x-request-id"));
  const retryAfter = Number(response.headers?.get?.("retry-after"));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : null;
  let message = "generation_provider_failed";
  let status = 502;

  if (PROVIDER_CREDIT_CODES.has(code)) message = "generation_provider_credit_exhausted";
  else if (PROVIDER_SPEND_CODES.has(code)) message = "generation_provider_spend_limit_exceeded";
  else if (PROVIDER_USAGE_CODES.has(code)) message = "generation_provider_usage_limit_exceeded";
  else if (code === "insufficient_quota") message = "generation_provider_quota_exceeded";
  else if (response.status === 401) { message = "generation_provider_authentication_failed"; status = 503; }
  else if (code === "model_not_found") { message = "generation_provider_model_access_failed"; status = 503; }
  else if (response.status === 403) { message = "generation_provider_permission_denied"; status = 503; }
  else if (response.status === 429 && (PROVIDER_RATE_CODES.has(code) || type === "rate_limit_error")) {
    message = "generation_provider_rate_limited";
    status = 429;
  } else if (response.status === 429) {
    message = "generation_provider_limit_unknown";
    status = 503;
  } else if (response.status >= 500) {
    message = "generation_provider_unavailable";
    status = 503;
  } else if (response.status === 400) {
    message = "generation_provider_request_invalid";
  }

  const diagnostics = {
    stage: "provider_response",
    provider_status: response.status,
    ...(code ? { provider_error_code: code } : {}),
    ...(type ? { provider_error_type: type } : {}),
    ...(param ? { provider_error_param: param } : {}),
    ...(requestId ? { provider_request_id: requestId } : {}),
  };
  return Object.assign(new Error(message), {
    status,
    diagnostics,
    ...(message === "generation_provider_rate_limited" && retryAfterSeconds ? { retryAfterSeconds } : {}),
  });
}

async function fetchJson(url, options, timeoutMs = 20000, classifyProviderErrors = false) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (!classifyProviderErrors) throw error;
    throw Object.assign(new Error("generation_provider_unavailable"), {
      status: 503,
      diagnostics: { stage: "provider_transport", ...(["AbortError", "TimeoutError", "TypeError"].includes(error?.name) ? { provider_error_type: error.name } : {}) },
    });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok && classifyProviderErrors) throw providerFailure(response, data);
  if (!response.ok) throw Object.assign(new Error(data.error || `upstream_${response.status}`), { status: [400, 401, 404, 409, 429].includes(response.status) ? response.status : 502 });
  return data;
}

async function adminCall(token, action, payload = {}) {
  if (token.length < 32) throw Object.assign(new Error("login_required"), { status: 401 });
  return fetchJson(`${SUPABASE_URL}/functions/v1/tycoons-admin`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_KEY, "x-admin-token": token },
    body: JSON.stringify({ action, ...payload }),
  });
}

async function loadPublicFacts(input) {
  const select = "id,name,slug,developer,location,description,hero_text,highlights,faq";
  let url;
  if (input.targetType === "project") {
    if (!input.projectId) throw Object.assign(new Error("project_required"), { status: 400 });
    url = `${SUPABASE_URL}/rest/v1/projects?select=${select}&id=eq.${encodeURIComponent(input.projectId)}&limit=1`;
  } else {
    if (!input.areaName) throw Object.assign(new Error("area_required"), { status: 400 });
    url = `${SUPABASE_URL}/rest/v1/projects?select=${select}&location=ilike.*${encodeURIComponent(input.areaName)}*&order=name&limit=12`;
  }
  const rows = await fetchJson(url, { headers: { apikey: SUPABASE_KEY, Accept: "application/json" } });
  if (!Array.isArray(rows) || !rows.length) throw Object.assign(new Error("public_facts_not_found"), { status: 404 });
  const projects = rows.map(safeProject);
  const projectIds = projects.map((project) => project.id).filter(Boolean).slice(0, 12);
  const unitSelect = "id,project_id,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,availability_status,last_updated_at";
  const unitUrl = `${SUPABASE_URL}/rest/v1/units?select=${unitSelect}&project_id=in.(${projectIds.map(encodeURIComponent).join(',')})&availability_status=eq.available&order=last_updated_at.desc&limit=${input.targetType === "project" ? 24 : 18}`;
  const unitRows = input.action === "draft" && projectIds.length ? await fetchJson(unitUrl, { headers: { apikey: SUPABASE_KEY, Accept: "application/json" } }) : [];
  const units = Array.isArray(unitRows) ? unitRows.map(safeUnit) : [];
  return { projects, units };
}

async function research(input, safetyId) {
  const { projects } = await loadPublicFacts(input);
  const call = (modelOverride, timeoutMs) => fetchJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
      "OpenAI-Safety-Identifier": `tycoons-admin-${safetyId}`,
    },
    body: JSON.stringify(buildResearchRequest(input, projects, modelOverride)),
  }, timeoutMs, true);
  let response;
  try {
    response = await call("", 50000);
  } catch (error) {
    // A model that rejects web search fails fast with a request/model error;
    // retry once on the documented web-search model. Timeouts are not retried.
    if (!["generation_provider_request_invalid", "generation_provider_model_access_failed"].includes(error?.message)) throw error;
    response = await call(RESEARCH_FALLBACK_MODEL, 45000);
  }
  return parseOpenAiOutput(response, "research", { input, projects });
}

async function generate(input, safetyId) {
  if (input.action === "research") return research(input, safetyId);
  const { projects, units } = await loadPublicFacts(input);
  const groundedInput = groundInputForFacts(input, projects);
  // Do not buy a draft for a unit-area comparison when the source has no usable sample.
  if (input.action === "draft" && /مساح|متر|\barea|\bsize/i.test(input.topic)) {
    const requiredUnits = /مقارن|compar/i.test(input.topic) ? 2 : 1;
    if (units.filter(unit => Number.isFinite(unit.area_sqm)).length < requiredUnits) throw Object.assign(new Error("generation_source_insufficient"), { status: 422 });
  }
  const response = await fetchJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
      "OpenAI-Safety-Identifier": `tycoons-admin-${safetyId}`,
    },
    body: JSON.stringify(buildOpenAiRequest(groundedInput, projects, units)),
  }, 60000, true);
  const parsed = parseOpenAiOutput(response, groundedInput.action, { input: groundedInput, projects, units });
  const result = { ...parsed, source_refs: [...sourceRefs(projects, units), ...(input.action === "draft" ? webSourceRefs(input.researchFacts) : [])], generated_as: "draft" };
  if (input.action === "draft") {
    const { assessArticleReview } = await import("../../server/tycoons-admin/article-review.mjs");
    result.review_issues = [...(parsed.review_issues || []), ...assessArticleReview({ ...result, language: input.language, target_type: input.targetType, project_id: input.projectId, area_name: input.areaName }, { projects, units })];
  }
  return result;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,x-admin-token,x-idempotency-key", "access-control-allow-methods": "POST,OPTIONS" }, body: "" };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "method_not_allowed" });
  if (!process.env.OPENAI_API_KEY) return jsonResponse(503, { error: "generation_not_configured" });
  const token = String(event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"] || "");
  const key = String(event.headers?.["x-idempotency-key"] || event.headers?.["X-Idempotency-Key"] || "");
  if (!IDEMPOTENCY_RE.test(key)) return jsonResponse(400, { error: "idempotency_key_required" });
  let input;
  try { input = parseRequest(event); } catch (error) { return jsonResponse(Number(error?.status) || 400, { error: error?.message || "invalid_request" }); }
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
  let lockToken = "";
  try {
    const claim = await adminCall(token, "article_generation_claim", { idempotency_key: key, payload_fingerprint: fingerprint });
    if (claim.state === "replay") return jsonResponse(200, claim.response, { "x-idempotent-replay": "true" });
    if (claim.state === "conflict") return jsonResponse(409, { error: "idempotency_conflict" });
    if (claim.state === "busy") return jsonResponse(409, { error: "generation_in_progress", retry_after_seconds: claim.retry_after_seconds }, { "retry-after": String(claim.retry_after_seconds || 1) });
    if (claim.state === "rate_limited") {
      const retryAfterSeconds = Math.max(1, Number(claim.retry_after_seconds) || 600);
      return jsonResponse(429, { error: "generation_rate_limited", retry_after_seconds: retryAfterSeconds }, { "retry-after": String(retryAfterSeconds) });
    }
    if (claim.state === "exhausted") return jsonResponse(429, { error: "generation_attempts_exhausted" });
    if (claim.state !== "claimed" || !claim.lock_token) throw Object.assign(new Error("generation_claim_invalid"), { status: 502 });
    lockToken = String(claim.lock_token);
    const safetyId = crypto.createHash("sha256").update(`${token}:${key}`).digest("hex").slice(0, 24);
    const data = await generate(input, safetyId);
    await adminCall(token, "article_generation_finish", { idempotency_key: key, payload_fingerprint: fingerprint, lock_token: lockToken, response: data });
    return jsonResponse(200, data);
  } catch (error) {
    if (lockToken) {
      await adminCall(token, "article_generation_finish", { idempotency_key: key, payload_fingerprint: fingerprint, lock_token: lockToken, error: String(error?.message || "generation_failed") }).catch(() => undefined);
    }
    console.error("[article-generate]", JSON.stringify({ error: error?.message || "generation_failed", ...(error?.diagnostics || {}) }));
    return jsonResponse(Number(error?.status) || 500, { error: error?.message || "generation_failed", ...(error?.generationFailure ? { generation_failure: error.generationFailure } : {}), ...(error?.retryAfterSeconds ? { retry_after_seconds: error.retryAfterSeconds } : {}) }, error?.retryAfterSeconds ? { "retry-after": String(error.retryAfterSeconds) } : {});
  }
};

