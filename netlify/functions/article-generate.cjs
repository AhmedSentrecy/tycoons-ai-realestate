"use strict";

const crypto = require("node:crypto");
const { IDEMPOTENCY_RE, jsonResponse, parseRequest, safeProject, safeUnit, sourceRefs, buildOpenAiRequest, parseOpenAiOutput } = require("./_article-generation.cjs");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

async function fetchJson(url, options, timeoutMs = 20000) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  const data = await response.json().catch(() => ({}));
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

async function generate(input, safetyId) {
  const { projects, units } = await loadPublicFacts(input);
  if (input.action === "draft" && /مساح|متر|\barea|\bsize/i.test(input.topic)) {
    const requiredUnits = /مقارن|compar/i.test(input.topic) ? 2 : 1;
    if (units.filter((unit) => Number.isFinite(unit.area_sqm)).length < requiredUnits) {
      throw Object.assign(new Error("generation_source_insufficient"), { status: 422 });
    }
  }
  const response = await fetchJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
      "OpenAI-Safety-Identifier": `tycoons-admin-${safetyId}`,
    },
    body: JSON.stringify(buildOpenAiRequest(input, projects, units)),
  }, 60000);
  return { ...parseOpenAiOutput(response, input.action, { input, units }), source_refs: sourceRefs(projects, units), generated_as: "draft" };
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
    if (claim.state === "rate_limited") return jsonResponse(429, { error: "generation_rate_limited" });
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
    return jsonResponse(Number(error?.status) || 500, { error: error?.message || "generation_failed" });
  }
};
