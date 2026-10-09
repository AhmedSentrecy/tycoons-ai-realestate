// Supabase Edge Function: tycoons-admin
// Backend for /admin — media, units, approvals and users.
//
// Roles
// - owner:  changes apply immediately (still logged in admin_change_requests as approved).
// - editor: the owner pre-approved adding things, so new projects, new units, an import that only
//           adds, and media uploads apply at once (still logged). Editing and deleting existing
//           units stay pending until the owner approves.
//
// Security
// - Service-role key stays inside this function. Passwords: PBKDF2-SHA256 (210k), per-user salt.
// - Sessions: random token, only its SHA-256 stored, 7 days. 8 failed logins / 15 min per IP.
// - Writes to live tables go through public.admin_apply_ops (atomic, column whitelist).
import { createClient } from "npm:@supabase/supabase-js@2";
import { assessArticleReview } from "./article-review.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const BUCKET = "property-images";
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const ITERATIONS = 210000;
const SESSION_DAYS = 7;
const MAX_FAILURES_PER_15_MIN = 8;
const MAX_GALLERY = 60;
const MAX_IMPORT_ROWS = 1000;
const MAX_ARTICLE_BODY = 30000;
const RESERVED_GUIDE_SLUGS = new Set([
  "off-plan-buying-checklist", "new-capital-vs-new-cairo", "new-cairo-property-prices",
  "payment-plan-comparison", "real-estate-investment-egypt", "north-coast-chalet-guide",
  "new-cairo-prices-2026", "egypt-real-estate-investment-2026", "north-coast-buying-guide",
]);
const MB = 1024 * 1024;
const FILE_RULES: Record<string, { types: Record<string, string>; maxBytes: number; folder: string }> = {
  image: { types: { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/avif": "avif" }, maxBytes: 15 * MB, folder: "" },
  video: { types: { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }, maxBytes: 50 * MB, folder: "videos/" },
  brochure: { types: { "application/pdf": "pdf" }, maxBytes: 50 * MB, folder: "brochures/" },
};
const UNIT_TEXT_FIELDS = ["unit_type", "bedrooms_text", "down_payment_text", "installments_text", "delivery_text", "finishing", "description", "location"] as const;
const UNIT_STATUSES = ["available", "sold", "not_confirmed", "review_only", "new_launch"];
const MEDIA_FIELDS = ["image_url", "gallery_urls", "video_url", "brochure_url"] as const;
const PROJECT_COLUMNS = "id,name,slug,developer,location,image_url,gallery_urls,video_url,brochure_url";
const UNIT_COLUMNS =
  "id,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,availability_status,description,image_url,gallery_urls,video_url,brochure_url,last_updated_at";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-admin-token, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;
  constructor(status: number, code: string, details?: Record<string, unknown>) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Json = Record<string, unknown>;
interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: "owner" | "editor";
}

const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (value: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const text = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());
const fail = (error: { message?: string } | null) => {
  if (error) throw new Error(error.message || "db_error");
};

function slugify(value: unknown) {
  return text(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

async function pbkdf2(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hashPassword(password: string) {
  if (password.length < 10) throw new HttpError(400, "password_too_short");
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return { password_salt: salt, password_hash: await pbkdf2(password, salt, ITERATIONS), password_iterations: ITERATIONS };
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => alphabet[v % alphabet.length]).join("");
  return `Tycoons-${pick(6)}-${pick(6)}`;
}

// ---------- auth ----------

async function login(req: Request, body: Json) {
  const ip = text(req.headers.get("x-forwarded-for")?.split(",")[0]) || "unknown";
  const ipHash = await sha256(ip);
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await db.from("media_admin_login_failures").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= MAX_FAILURES_PER_15_MIN) throw new HttpError(429, "too_many_attempts");

  const username = text(body.username).toLowerCase();
  const { data: user } = await db.from("admin_users").select("*").eq("username", username).maybeSingle();
  // Always run PBKDF2 so response time doesn't reveal whether the username exists.
  const derived = await pbkdf2(text(body.password), user?.password_salt ?? "00000000000000000000000000000000", user?.password_iterations ?? ITERATIONS);
  const ok = Boolean(user?.active) && timingSafeEqual(derived, user!.password_hash);
  if (!ok) {
    await db.from("media_admin_login_failures").insert({ ip_hash: ipHash });
    await new Promise((resolve) => setTimeout(resolve, 700));
    throw new HttpError(401, "invalid_password");
  }

  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const now = Date.now();
  await db.from("media_admin_sessions").delete().lt("expires_at", new Date(now).toISOString());
  await db.from("media_admin_login_failures").delete().lt("created_at", new Date(now - 86400 * 1000).toISOString());
  fail((await db.from("media_admin_sessions").insert({
    token_hash: await sha256(token),
    user_id: user.id,
    expires_at: new Date(now + SESSION_DAYS * 86400 * 1000).toISOString(),
  })).error);
  await db.from("admin_users").update({ last_login_at: new Date(now).toISOString() }).eq("id", user.id);
  return { token, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } };
}

async function requireUser(req: Request): Promise<{ user: AdminUser; tokenHash: string }> {
  const token = text(req.headers.get("x-admin-token"));
  if (token.length < 32) throw new HttpError(401, "login_required");
  const tokenHash = await sha256(token);
  const { data: session } = await db.from("media_admin_sessions").select("user_id, expires_at").eq("token_hash", tokenHash).maybeSingle();
  if (!session?.user_id || new Date(session.expires_at).getTime() < Date.now()) throw new HttpError(401, "login_required");
  const { data: user } = await db.from("admin_users").select("id,username,display_name,role,active").eq("id", session.user_id).maybeSingle();
  if (!user?.active) throw new HttpError(401, "login_required");
  return { user: user as AdminUser, tokenHash };
}

const requireOwner = (user: AdminUser) => {
  if (user.role !== "owner") throw new HttpError(403, "owner_only");
};

// ---------- reads ----------

async function readAll<T>(table: string, columns: string, order: string, filter?: (q: any) => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    let query = db.from(table).select(columns).order(order).range(from, from + 999);
    if (filter) query = filter(query);
    const { data, error } = await query;
    fail(error);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function pendingSummary() {
  const rows = await readAll<{ id: number; entity: string; action: string; target_id: string | null; project_id: string | null; created_by: string }>(
    "admin_change_requests", "id,entity,action,target_id,project_id,created_by", "id", (q) => q.eq("status", "pending"));
  return rows;
}

async function listProjects() {
  const [projects, units, pending, usage] = await Promise.all([
    readAll<Json & { id: string }>("projects", PROJECT_COLUMNS, "name"),
    readAll<{ project_id: string; image_url: string | null; availability_status: string | null }>("units", "id,project_id,image_url,availability_status", "id"),
    pendingSummary(),
    db.rpc("media_admin_storage_usage"),
  ]);
  const stats = new Map<string, { units: number; available: number; with_media: number }>();
  for (const unit of units) {
    const entry = stats.get(unit.project_id) ?? { units: 0, available: 0, with_media: 0 };
    entry.units += 1;
    if (unit.availability_status === "available") entry.available += 1;
    if (text(unit.image_url)) entry.with_media += 1;
    stats.set(unit.project_id, entry);
  }
  const pendingByProject = new Map<string, number>();
  for (const row of pending) if (row.project_id) pendingByProject.set(row.project_id, (pendingByProject.get(row.project_id) ?? 0) + 1);
  return {
    projects: projects.map((project) => ({
      ...project,
      units_count: stats.get(project.id)?.units ?? 0,
      available_units: stats.get(project.id)?.available ?? 0,
      units_with_own_media: stats.get(project.id)?.with_media ?? 0,
      pending_requests: pendingByProject.get(project.id) ?? 0,
    })),
    pending_total: pending.length,
    storage: usage.data?.[0] ?? usage.data ?? null,
  };
}

async function listUnits(body: Json) {
  const projectId = text(body.project_id);
  if (!projectId) throw new HttpError(400, "project_id_required");
  const [{ data, error }, { data: pending }] = await Promise.all([
    db.from("units").select(UNIT_COLUMNS).eq("project_id", projectId).order("starting_price"),
    db.from("admin_change_requests").select("id,entity,action,target_id,ops,created_by,created_at,summary").eq("status", "pending").eq("project_id", projectId).order("id"),
  ]);
  fail(error);
  return { units: data ?? [], pending: pending ?? [] };
}

async function listArticles() {
  const { data, error } = await db
    .from("editorial_articles")
    .select("id,status,language,title,slug,excerpt,meta_title,meta_description,target_type,project_id,area_name,source_refs,reviewed_by_name,reviewed_at,published_at,created_at,updated_at,projects(name,slug)")
    .order("updated_at", { ascending: false });
  fail(error);
  return { articles: data ?? [] };
}

async function getArticle(body: Json) {
  const id = text(body.id);
  if (!id) throw new HttpError(400, "article_id_required");
  const { data, error } = await db.from("editorial_articles").select("*").eq("id", id).maybeSingle();
  fail(error);
  if (!data) throw new HttpError(404, "article_not_found");
  return { article: { ...data, review_issues: await reviewArticle(data) } };
}

// Review is derived from live public rows on every read/save/publication. It is
// intentionally not stored, and no values or review flags in source_refs are
// accepted as evidence. Only bounded IDs are used to load scoped source rows.
async function reviewArticle(article: Json) {
  const refs = Array.isArray(article.source_refs) ? article.source_refs.slice(0, 30) : [];
  const ids = (type: string) => [...new Set(refs.filter((ref) => ref && ref.type === type && typeof ref.id === "string" && ref.id.length <= 80).map((ref) => ref.id as string))];
  const projectIds = ids("project");
  if (article.target_type === "project" && typeof article.project_id === "string" && article.project_id.length <= 80 && !projectIds.includes(article.project_id)) projectIds.push(article.project_id);
  const { data: projects, error: projectsError } = projectIds.length
    ? await db.from("projects").select("id,name,slug,developer,location").in("id", projectIds)
    : { data: [], error: null };
  fail(projectsError);
  const normalizedArea = text(article.area_name).normalize("NFKC").toLocaleLowerCase();
  const scopedProjects = (projects ?? []).filter((project: Json) => article.target_type === "project"
    ? project.id === article.project_id
    : article.target_type === "area" && normalizedArea && text(project.location).normalize("NFKC").toLocaleLowerCase().includes(normalizedArea));
  const unitIds = ids("unit");
  const { data: units, error: unitsError } = unitIds.length && scopedProjects.length
    ? await db.from("units").select(UNIT_COLUMNS).in("id", unitIds).in("project_id", scopedProjects.map((project: Json) => project.id))
    : { data: [], error: null };
  fail(unitsError);
  return assessArticleReview(article, { projects: scopedProjects, units: units ?? [] });
}

async function loadProject(id: string) {
  const { data } = await db.from("projects").select("id,name,slug,developer,location").eq("id", id).maybeSingle();
  if (!data) throw new HttpError(404, "project_not_found");
  return data;
}

async function loadUnit(id: string) {
  const { data } = await db.from("units").select(UNIT_COLUMNS).eq("id", id).maybeSingle();
  if (!data) throw new HttpError(404, "unit_not_found");
  return data as Json & { id: string; project_id: string };
}

// ---------- validation ----------

function cleanUrl(value: unknown, field: string) {
  const url = text(value);
  if (!url) return null;
  if (url.length > 2000 || url.includes(",") || !/^https:\/\/[^\s]+$/i.test(url)) throw new HttpError(400, `invalid_url:${field}`);
  return url;
}

function parseNumber(value: unknown, field: string, integer: boolean) {
  if (value === null || value === undefined || text(value) === "") return null;
  const raw = text(value).replace(/[,\s\u066C]/g, "").replace(/[\u0660-\u0669]/g, (d) => String("\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d)));
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new HttpError(400, `invalid_number:${field}`);
  return integer ? Math.round(parsed) : Math.round(parsed * 100) / 100;
}

function cleanArticle(input: Json) {
  const targetType = text(input.target_type);
  const projectId = text(input.project_id) || null;
  const areaName = text(input.area_name) || null;
  const title = text(input.title);
  const slug = slugify(input.slug || title);
  const excerpt = text(input.excerpt);
  const bodyMarkdown = typeof input.body_markdown === "string" ? input.body_markdown.trim() : "";
  const metaTitle = text(input.meta_title);
  const metaDescription = text(input.meta_description);
  const language = text(input.language) || "ar";
  const refs = Array.isArray(input.source_refs) ? input.source_refs : [];
  if (title.length < 5 || title.length > 180) throw new HttpError(400, "article_title_invalid");
  if (!slug) throw new HttpError(400, "article_slug_invalid");
  if (RESERVED_GUIDE_SLUGS.has(slug)) throw new HttpError(409, "article_slug_reserved");
  if (excerpt.length > 500 || metaTitle.length > 180 || metaDescription.length > 500) throw new HttpError(400, "article_metadata_too_long");
  if (!bodyMarkdown || bodyMarkdown.length > MAX_ARTICLE_BODY) throw new HttpError(400, "article_body_invalid");
  if (!['ar', 'en'].includes(language)) throw new HttpError(400, "article_language_invalid");
  if (targetType === "project" && !projectId) throw new HttpError(400, "article_project_required");
  if (targetType === "area" && !areaName) throw new HttpError(400, "article_area_required");
  if (!['project', 'area'].includes(targetType)) throw new HttpError(400, "article_target_invalid");
  if (!refs.length || refs.length > 30 || refs.some((ref) => typeof ref !== "object" || !ref)) throw new HttpError(400, "article_sources_required");
  return {
    language,
    title,
    slug,
    excerpt,
    body_markdown: bodyMarkdown,
    meta_title: metaTitle || title,
    meta_description: metaDescription || excerpt,
    target_type: targetType,
    project_id: targetType === "project" ? projectId : null,
    area_name: targetType === "area" ? areaName : null,
    source_refs: refs,
  };
}

async function saveArticle(user: AdminUser, body: Json) {
  const values = cleanArticle((body.values ?? {}) as Json);
  const contentHash = await sha256(JSON.stringify(values));
  if (values.project_id) await loadProject(values.project_id);
  const reviewIssues = await reviewArticle(values);
  const id = text(body.id);
  if (id) {
    const expectedRevision = Number(body.expected_revision);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new HttpError(409, "article_revision_required");
    const { data: existing } = await db.from("editorial_articles").select("id,revision").eq("id", id).maybeSingle();
    if (!existing) throw new HttpError(404, "article_not_found");
    if (existing.revision !== expectedRevision) throw new HttpError(409, "article_stale");
    const { data, error } = await db.from("editorial_articles").update({
      ...values,
      revision: expectedRevision + 1,
      content_hash: contentHash,
      status: "draft",
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_by_name: null,
      reviewed_at: null,
      published_at: null,
    }).eq("id", id).eq("revision", expectedRevision).select("*").maybeSingle();
    fail(error);
    if (!data) throw new HttpError(409, "article_stale");
    return { article: { ...data, review_issues: reviewIssues } };
  }
  const { data, error } = await db.from("editorial_articles").insert({
    ...values,
    content_hash: contentHash,
    status: "draft",
    created_by: user.id,
    updated_by: user.id,
  }).select("*").single();
  fail(error);
  return { article: { ...data, review_issues: reviewIssues } };
}

async function publishArticle(user: AdminUser, body: Json) {
  requireOwner(user);
  const id = text(body.id);
  const expectedRevision = Number(body.expected_revision);
  const expectedHash = text(body.expected_content_hash);
  if (!id) throw new HttpError(400, "article_id_required");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || !/^[a-f0-9]{64}$/.test(expectedHash)) throw new HttpError(409, "article_revision_required");
  const { data: article, error: readError } = await db.from("editorial_articles").select("*").eq("id", id).maybeSingle();
  fail(readError);
  if (!article) throw new HttpError(404, "article_not_found");
  if (article.status !== "draft") throw new HttpError(409, "article_not_draft");
  if (article.revision !== expectedRevision || article.content_hash !== expectedHash) throw new HttpError(409, "article_stale");
  if (!text(article.body_markdown) || !Array.isArray(article.source_refs) || !article.source_refs.length) throw new HttpError(400, "article_not_ready");
  const reviewIssues = await reviewArticle(article);
  if (reviewIssues.some((issue) => issue.severity === "blocker")) throw new HttpError(409, "article_review_blocked", { review_issues: reviewIssues });
  // A client flag alone grants nothing: it acknowledges precisely the saved
  // revision/hash above, whose fields and current sources were just reassessed.
  if (body.review_confirmed !== true) throw new HttpError(400, "article_review_confirmation_required", { review_issues: reviewIssues });
  const now = new Date().toISOString();
  const { data, error } = await db.from("editorial_articles").update({
    status: "published",
    reviewed_by: user.id,
    reviewed_by_name: user.display_name || user.username,
    reviewed_at: now,
    published_at: now,
    updated_by: user.id,
    updated_at: now,
  }).eq("id", id).eq("status", "draft").eq("revision", expectedRevision).eq("content_hash", expectedHash).select("*").maybeSingle();
  fail(error);
  if (!data) throw new HttpError(409, "article_stale");
  return { article: { ...data, review_issues: reviewIssues } };
}

async function claimArticleGeneration(user: AdminUser, tokenHash: string, body: Json) {
  const idempotencyKey = text(body.idempotency_key);
  const fingerprint = text(body.payload_fingerprint);
  if (!/^[a-zA-Z0-9._:-]{16,120}$/.test(idempotencyKey) || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new HttpError(400, "generation_claim_invalid");
  const { data, error } = await db.rpc("admin_claim_article_generation", {
    p_user_id: user.id, p_session_hash: tokenHash, p_idempotency_key: idempotencyKey, p_payload_fingerprint: fingerprint,
  });
  fail(error);
  return data;
}

async function finishArticleGeneration(user: AdminUser, tokenHash: string, body: Json) {
  const idempotencyKey = text(body.idempotency_key);
  const fingerprint = text(body.payload_fingerprint);
  const lockToken = text(body.lock_token);
  if (!/^[a-zA-Z0-9._:-]{16,120}$/.test(idempotencyKey) || !/^[a-f0-9]{64}$/.test(fingerprint) || !/^[a-f0-9-]{36}$/.test(lockToken)) throw new HttpError(400, "generation_finish_invalid");
  const failure = text(body.error) || null;
  const { data, error } = await db.rpc("admin_finish_article_generation", {
    p_user_id: user.id, p_session_hash: tokenHash, p_idempotency_key: idempotencyKey,
    p_payload_fingerprint: fingerprint, p_lock_token: lockToken,
    p_response: failure ? null : (body.response ?? null), p_error: failure,
  });
  fail(error);
  if (!data) throw new HttpError(409, "generation_lock_lost");
  return { ok: true };
}

const EDITORIAL_JOB_TYPES = new Set(["developer", "project", "phase", "comparison", "guide"]);
const EDITORIAL_RETRYABLE = new Set(["retry_wait", "failed", "needs_review"]);

async function editorialWorkflow() {
  const [{ data: config, error: configError }, { data: jobs, error: jobsError }, { data: runs, error: runsError }] = await Promise.all([
    db.from("editorial_workflow_config").select("workflow_version,timezone,proposed_weekday,proposed_local_time,schedule_enabled,monthly_budget_cents,max_attempts_per_job,max_parallel_jobs").eq("id", true).single(),
    db.from("editorial_jobs").select("id,run_id,content_type,primary_entity_id,secondary_entity_id,area_name,topic,status,current_step,attempts,evidence,validation_results,exceptions,cost_reserved_cents,cost_used_cents,usage,last_error,next_retry_at,auto_publish_eligible,review_kind,published_article_ids,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
    db.from("editorial_runs").select("id,trigger_type,status,workflow_version,scheduled_for,started_at,completed_at,cost_reserved_cents,cost_used_cents,summary,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  fail(configError); fail(jobsError); fail(runsError);
  return { config, jobs: jobs ?? [], runs: runs ?? [], discovery_sources: ["Flat & Villa", "RealEstate.eg"], optional_imports: ["GSC own-site queries", "keyword CSV"], unavailable_sources: ["WhatsApp groups", "market-wide keyword volume"] };
}

async function createEditorialJob(user: AdminUser, body: Json) {
  const contentType = text(body.content_type).toLowerCase();
  const topic = text(body.topic).slice(0, 300);
  const primaryEntityId = text(body.primary_entity_id).slice(0, 120) || null;
  const secondaryEntityId = contentType === "comparison" ? text(body.secondary_entity_id).slice(0, 120) || null : null;
  const areaName = text(body.area_name).slice(0, 120) || null;
  const sourceInput = text(body.source_input).slice(0, 2000) || null;
  if (!EDITORIAL_JOB_TYPES.has(contentType)) throw new HttpError(400, "content_type_invalid");
  if (!topic) throw new HttpError(400, "topic_required");
  if (["developer", "project", "phase", "comparison"].includes(contentType) && !primaryEntityId) throw new HttpError(400, "primary_entity_required");
  if (contentType === "comparison" && !secondaryEntityId) throw new HttpError(400, "secondary_entity_required");
  const idempotencyKey = `editorial:${await sha256(JSON.stringify({ contentType, topic, primaryEntityId, secondaryEntityId, areaName, sourceInput }))}`;
  const { data, error } = await db.rpc("admin_create_editorial_job", {
    p_user_id: user.id, p_idempotency_key: idempotencyKey, p_content_type: contentType,
    p_primary_entity_id: primaryEntityId, p_secondary_entity_id: secondaryEntityId,
    p_area_name: areaName, p_topic: topic, p_source_input: sourceInput,
  });
  fail(error);
  if (data?.state === "duplicate") throw new HttpError(409, "editorial_job_duplicate");
  return { ...data, paid_execution_enabled: false };
}

async function retryEditorialJob(user: AdminUser, body: Json) {
  const id = text(body.id);
  const { data: existing, error: readError } = await db.from("editorial_jobs").select("id,status,attempts,revision").eq("id", id).maybeSingle();
  fail(readError);
  if (!existing) throw new HttpError(404, "editorial_job_not_found");
  if (!EDITORIAL_RETRYABLE.has(existing.status) || existing.attempts >= 3) throw new HttpError(409, "editorial_job_not_retryable");
  const { data, error } = await db.rpc("admin_retry_editorial_job", { p_job_id: id, p_user_id: user.id, p_expected_status: existing.status, p_expected_revision: existing.revision });
  fail(error);
  if (data?.state !== "queued") throw new HttpError(409, "editorial_job_stale");
  return { job: data.job };
}

async function getEditorialJob(body: Json) {
  const id = text(body.id);
  const { data, error } = await db.from("editorial_jobs").select("*").eq("id", id).maybeSingle();
  fail(error);
  if (!data) throw new HttpError(404, "editorial_job_not_found");
  const articleIds = Array.isArray(data.published_article_ids) ? data.published_article_ids : [];
  const [{ data: events, error: eventsError }, { data: versions, error: versionsError }, { data: articles, error: articlesError }] = await Promise.all([
    db.from("editorial_job_events").select("id,event_type,from_status,to_status,details,created_at").eq("job_id", id).order("id", { ascending: false }).limit(100),
    db.from("editorial_job_versions").select("id,version_number,created_at").eq("job_id", id).order("version_number", { ascending: false }).limit(50),
    articleIds.length ? db.from("editorial_articles").select("id,language,status,revision,content_hash").in("id", articleIds) : Promise.resolve({ data: [], error: null }),
  ]);
  fail(eventsError); fail(versionsError); fail(articlesError);
  return { job: data, events: events ?? [], versions: versions ?? [], articles: articles ?? [] };
}

async function controlEditorialJob(user: AdminUser, body: Json) {
  const action = text(body.control_action);
  const revision = Number(body.expected_revision);
  if (!Number.isSafeInteger(revision) || revision < 1 || !["pause","resume","resolve_exception","rollback"].includes(action)) throw new HttpError(400, "editorial_control_invalid");
  const versionId = text(body.version_id) || null;
  const resolution = (body.resolution ?? null) as Json | null;
  if (action === "resolve_exception" && resolution?.outcome === "linked_trusted_evidence" && (!/^[a-f0-9-]{36}$/.test(text(resolution.trusted_evidence_id)) || !text(resolution.claim_key))) throw new HttpError(400, "trusted_evidence_invalid");
  const articlePair = (body.expected_articles ?? {}) as Json;
  const ar = (articlePair.ar ?? {}) as Json; const en = (articlePair.en ?? {}) as Json;
  if (action === "rollback" && (![ar.revision,en.revision].every((value) => Number.isSafeInteger(Number(value))) || !text(ar.content_hash) || !text(en.content_hash) || text(ar.status) !== "draft" || text(en.status) !== "draft")) throw new HttpError(400, "editorial_rollback_precondition_required");
  const { data, error } = await db.rpc("admin_control_editorial_job", {
    p_job_id: text(body.id), p_user_id: user.id, p_action: action, p_expected_revision: revision, p_version_id: versionId, p_resolution: resolution,
    p_expected_ar_revision: action === "rollback" ? Number(ar.revision) : null, p_expected_ar_hash: action === "rollback" ? text(ar.content_hash) : null, p_expected_ar_status: action === "rollback" ? text(ar.status) : null,
    p_expected_en_revision: action === "rollback" ? Number(en.revision) : null, p_expected_en_hash: action === "rollback" ? text(en.content_hash) : null, p_expected_en_status: action === "rollback" ? text(en.status) : null,
  });
  fail(error);
  if (data?.state !== "updated") throw new HttpError(409, `editorial_control_${data?.state || "failed"}`);
  return data;
}

async function claimEditorialJob(user: AdminUser, body: Json) {
  const id = text(body.id);
  const { data, error } = await db.rpc("admin_claim_editorial_job", { p_job_id: id, p_user_id: user.id });
  fail(error);
  if (data?.state === "claimed" && data.job?.content_type === "project" && data.job?.primary_entity_id) {
    const project = await loadProject(String(data.job.primary_entity_id));
    data.job.entity = { id: project.id, name: project.name, slug: project.slug, developer: project.developer, location: project.location, description: project.description };
  }
  return data;
}

function cleanWorkflowDraft(value: unknown) {
  const draft = cleanArticle((value ?? {}) as Json);
  return { ...draft, content_hash: "" };
}

async function completeEditorialJob(user: AdminUser, body: Json) {
  const id = text(body.id);
  const lockToken = text(body.lock_token);
  const draftAr = cleanWorkflowDraft(body.draft_ar);
  const draftEn = cleanWorkflowDraft(body.draft_en);
  if (draftAr.language !== "ar" || draftEn.language !== "en") throw new HttpError(400, "editorial_languages_invalid");
  draftAr.content_hash = await sha256(JSON.stringify(draftAr));
  draftEn.content_hash = await sha256(JSON.stringify(draftEn));
  const evidence = Array.isArray(body.evidence) ? body.evidence.slice(0, 30) : [];
  if (!evidence.length) throw new HttpError(400, "editorial_evidence_required");
  const { data, error } = await db.rpc("admin_complete_editorial_job", {
    p_job_id: id, p_user_id: user.id, p_lock_token: lockToken,
    p_evidence: evidence, p_claim_evidence: Array.isArray(body.claim_evidence) ? body.claim_evidence.slice(0, 100) : [],
    p_validation: (body.validation ?? {}) as Json, p_exceptions: Array.isArray(body.exceptions) ? body.exceptions.slice(0, 30) : [],
    p_draft_ar: draftAr, p_draft_en: draftEn, p_usage: (body.usage ?? {}) as Json,
    p_cost_used_cents: Math.max(0, Math.min(5000, Number(body.cost_used_cents) || 0)),
    p_provider_response_id: text(body.provider_response_id).slice(0, 200) || null,
  });
  fail(error);
  return data;
}

async function failEditorialJob(user: AdminUser, body: Json) {
  const { data, error } = await db.rpc("admin_fail_editorial_job", {
    p_job_id: text(body.id), p_user_id: user.id, p_lock_token: text(body.lock_token), p_error: text(body.error).slice(0, 1000) || "worker_failed",
  });
  fail(error);
  if (!data) throw new HttpError(409, "editorial_job_lock_lost");
  return { ok: true };
}


/** Keep only known unit fields, normalised. `partial` = only the keys provided. */
function cleanUnitValues(input: Json, partial: boolean) {
  const out: Json = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
  for (const field of UNIT_TEXT_FIELDS) {
    if (!partial || has(field)) {
      const value = text(input[field]).slice(0, 2000);
      out[field] = value || null;
    }
  }
  if (!partial || has("area_sqm")) out.area_sqm = parseNumber(input.area_sqm, "area_sqm", false);
  if (!partial || has("starting_price")) out.starting_price = parseNumber(input.starting_price, "starting_price", true);
  if (!partial || has("availability_status")) {
    const status = text(input.availability_status) || "available";
    if (!UNIT_STATUSES.includes(status)) throw new HttpError(400, "invalid_status");
    out.availability_status = status;
  }
  if (partial && has("unit_type") && !out.unit_type) throw new HttpError(400, "unit_type_required");
  return out;
}

function cleanMedia(input: Json) {
  const gallery = Array.isArray(input.gallery_urls) ? input.gallery_urls : [];
  if (gallery.length > MAX_GALLERY) throw new HttpError(400, "gallery_too_long");
  const galleryUrls = [...new Set(gallery.map((url) => cleanUrl(url, "gallery_urls")).filter(Boolean) as string[])];
  const cover = cleanUrl(input.image_url, "image_url");
  const ordered = cover ? [cover, ...galleryUrls.filter((url) => url !== cover)] : galleryUrls;
  return {
    image_url: cover,
    gallery_urls: ordered.length ? ordered.join(", ") : null,
    video_url: cleanUrl(input.video_url, "video_url"),
    brochure_url: cleanUrl(input.brochure_url, "brochure_url"),
  };
}

// ---------- change pipeline ----------

interface ChangeInput {
  entity: "project" | "unit";
  action: "media" | "create" | "update" | "delete" | "import";
  target_id: string | null;
  project_id: string | null;
  summary: string;
  ops: Json[];
  before: unknown;
  /** Set for changes the owner has pre-approved (adding projects, units and media) so an editor's write applies without review. */
  autoApprove?: boolean;
}

/** Owner (or a pre-approved change such as adding projects, units or media): apply now and log as approved. Other editor changes queue for approval (media edits on the same target coalesce). */
async function submitChange(user: AdminUser, change: ChangeInput) {
  const { autoApprove, ...record } = change;
  if (user.role === "owner" || autoApprove) {
    const { data: result, error } = await db.rpc("admin_apply_ops", { ops: change.ops });
    if (error) throw new HttpError(409, `apply_failed:${error.message}`);
    await db.from("admin_change_requests").insert({
      ...record, created_by: user.id, status: "approved",
      reviewed_by: user.role === "owner" ? user.id : null, reviewed_at: new Date().toISOString(), result,
    });
    return { applied: true, pending: false, result };
  }

  if (change.action === "media" && change.target_id) {
    const { data: existing } = await db.from("admin_change_requests").select("id")
      .eq("status", "pending").eq("action", "media").eq("entity", change.entity).eq("target_id", change.target_id).eq("created_by", user.id).limit(1);
    const open = existing?.[0];
    if (open) {
      fail((await db.from("admin_change_requests").update({ ops: change.ops, summary: change.summary, created_at: new Date().toISOString() }).eq("id", open.id)).error);
      return { applied: false, pending: true, request_id: open.id };
    }
  }
  const { data, error } = await db.from("admin_change_requests").insert({ ...record, created_by: user.id }).select("id").single();
  fail(error);
  return { applied: false, pending: true, request_id: data!.id };
}

async function saveMedia(user: AdminUser, body: Json) {
  const target = text(body.target) === "unit" ? "unit" : "project";
  const id = text(body.id);
  const values = cleanMedia(body);
  let projectId: string;
  let label: string;
  let before: Json;
  if (target === "project") {
    const project = await loadProject(id);
    const { data } = await db.from("projects").select(PROJECT_COLUMNS).eq("id", id).single();
    before = data as Json;
    projectId = project.id;
    label = project.name;
  } else {
    const unit = await loadUnit(id);
    before = unit;
    projectId = unit.project_id;
    label = `${unit.project_name} · ${unit.unit_type}`;
  }
  const count = values.gallery_urls ? values.gallery_urls.split(",").length : 0;
  const outcome = await submitChange(user, {
    entity: target, action: "media", target_id: id, project_id: projectId,
    summary: `صور ${label} (${count} صورة)`,
    ops: [{ op: "media", entity: target, id, values }],
    before: Object.fromEntries(MEDIA_FIELDS.map((key) => [key, before[key] ?? null])),
    autoApprove: true,
  });
  return { ...outcome, values };
}

/** A project only gets a public page once it has a slug, so new projects get one right away. */
async function uniqueSlug(base: string) {
  const root = base || "project";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt ? `${root}-${attempt + 1}` : root;
    const { data } = await db.from("projects").select("id").eq("slug", candidate).limit(1);
    if (!data?.length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function projectCreate(user: AdminUser, body: Json) {
  const values = (body.values as Json) ?? {};
  const name = text(values.name).slice(0, 200);
  const developer = text(values.developer).slice(0, 200);
  const location = text(values.location).slice(0, 200);
  if (!name) throw new HttpError(400, "project_name_required");
  if (!developer) throw new HttpError(400, "developer_required");
  if (!location) throw new HttpError(400, "location_required");

  const { data: twins } = await db.from("projects").select("id").ilike("name", name).ilike("developer", developer).limit(1);
  if (twins?.length) throw new HttpError(409, "project_exists");

  const slug = await uniqueSlug(`${slugify(name)}--${slugify(developer)}`);
  const description = text(values.description).slice(0, 2000);
  const year = new Date().getFullYear();
  const row: Json = {
    name,
    developer,
    location,
    slug,
    status: "available",
    description: description || `${name} من ${developer} في ${location}. تعرض الصفحة أحدث الوحدات والأسعار المسجلة لدى Tycoons مع ضرورة تأكيد التوفر وقت الطلب.`,
    hero_text: `اعرف أسعار ومساحات ${name} وخطط السداد والوحدات المتاحة في ${location}.`,
    seo_title: `${name} | الأسعار وخطط السداد ${year}`,
    seo_description: `تعرف على أسعار ${name} في ${year}، الوحدات والمساحات المتاحة، المقدم وخطط السداد والاستلام. مشروع من ${developer} في ${location}.`,
  };
  return submitChange(user, {
    entity: "project", action: "create", target_id: null, project_id: null,
    summary: `مشروع جديد: ${name} — ${developer} (${location})`,
    ops: [{ op: "project_create", values: row }], before: null, autoApprove: true,
  });
}

async function unitCreate(user: AdminUser, body: Json) {
  const project = await loadProject(text(body.project_id));
  const values = cleanUnitValues((body.values as Json) ?? {}, false);
  if (!values.unit_type) throw new HttpError(400, "unit_type_required");
  const row = withProject(values, project);
  return submitChange(user, {
    entity: "unit", action: "create", target_id: null, project_id: project.id,
    summary: `وحدة جديدة: ${row.unit_type}${row.area_sqm ? ` ${row.area_sqm} م²` : ""} في ${project.name}`,
    ops: [{ op: "create", values: row }], before: null, autoApprove: true,
  });
}

function withProject(values: Json, project: { id: string; name: string; developer: string | null; location: string | null }) {
  const row: Json = { ...values, project_id: project.id, project_name: project.name, developer: project.developer, location: values.location || project.location || "Egypt" };
  // Don't guess missing essentials: keep the unit off the public site until confirmed.
  if ((!row.starting_price || !row.area_sqm) && row.availability_status === "available") row.availability_status = "not_confirmed";
  return row;
}

async function unitUpdate(user: AdminUser, body: Json) {
  const unit = await loadUnit(text(body.id));
  const values = cleanUnitValues((body.values as Json) ?? {}, true);
  const changed = Object.fromEntries(Object.entries(values).filter(([key, value]) => normalise(unit[key]) !== normalise(value)));
  if (!Object.keys(changed).length) return { applied: false, pending: false, unchanged: true };
  return submitChange(user, {
    entity: "unit", action: "update", target_id: unit.id, project_id: unit.project_id,
    summary: `تعديل ${unit.unit_type}${unit.area_sqm ? ` ${unit.area_sqm} م²` : ""}: ${Object.keys(changed).join("، ")}`,
    ops: [{ op: "update", id: unit.id, values: changed }],
    before: Object.fromEntries(Object.keys(changed).map((key) => [key, unit[key] ?? null])),
  });
}

async function unitDelete(user: AdminUser, body: Json) {
  const unit = await loadUnit(text(body.id));
  return submitChange(user, {
    entity: "unit", action: "delete", target_id: unit.id, project_id: unit.project_id,
    summary: `حذف ${unit.unit_type}${unit.area_sqm ? ` ${unit.area_sqm} م²` : ""} (${unit.starting_price ?? "—"} جنيه)`,
    ops: [{ op: "delete", id: unit.id }], before: unit,
  });
}

const normalise = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());

async function unitsImport(user: AdminUser, body: Json) {
  const project = await loadProject(text(body.project_id));
  const rows = Array.isArray(body.rows) ? (body.rows as Json[]) : [];
  if (!rows.length) throw new HttpError(400, "import_empty");
  if (rows.length > MAX_IMPORT_ROWS) throw new HttpError(400, "import_too_large");
  const { data: existing } = await db.from("units").select(UNIT_COLUMNS).eq("project_id", project.id);
  const byId = new Map((existing ?? []).map((unit: Json) => [String(unit.id), unit]));
  const ops: Json[] = [];
  const before: Json = {};
  let creates = 0;
  let updates = 0;
  rows.forEach((row, index) => {
    const targetId = text(row.id);
    try {
      if (targetId) {
        const unit = byId.get(targetId);
        if (!unit) throw new HttpError(400, "unit_not_in_project");
        const values = cleanUnitValues(row.values as Json, true);
        const changed = Object.fromEntries(Object.entries(values).filter(([key, value]) => normalise(unit[key]) !== normalise(value)));
        if (!Object.keys(changed).length) return;
        ops.push({ op: "update", id: targetId, values: changed });
        before[targetId] = Object.fromEntries(Object.keys(changed).map((key) => [key, unit[key] ?? null]));
        updates += 1;
      } else {
        const values = cleanUnitValues(row.values as Json, false);
        if (!values.unit_type) throw new HttpError(400, "unit_type_required");
        ops.push({ op: "create", values: withProject(values, project) });
        creates += 1;
      }
    } catch (error) {
      const code = error instanceof HttpError ? error.code : "invalid_row";
      throw new HttpError(400, `row_${index + 1}:${code}`);
    }
  });
  if (!ops.length) return { applied: false, pending: false, unchanged: true };
  return submitChange(user, {
    entity: "unit", action: "import", target_id: null, project_id: project.id,
    summary: `استيراد ${project.name}: ${creates} جديدة، ${updates} تعديل`,
    ops, before,
    // Pure additions are pre-approved; an import that also edits existing units still needs the owner.
    autoApprove: updates === 0,
  });
}

async function listRequests(user: AdminUser, body: Json) {
  const status = text(body.status) || "pending";
  let query = db.from("admin_change_requests").select("*").order("id", { ascending: false }).limit(200);
  query = status === "pending" ? query.eq("status", "pending") : query.neq("status", "pending");
  if (user.role !== "owner") query = query.eq("created_by", user.id);
  const { data, error } = await query;
  fail(error);
  const requests = data ?? [];
  const [{ data: users }, projectsList] = await Promise.all([
    db.from("admin_users").select("id,username,display_name"),
    db.from("projects").select("id,name").in("id", [...new Set(requests.map((r) => r.project_id).filter(Boolean))]),
  ]);
  const userName = new Map((users ?? []).map((u) => [u.id, u.display_name || u.username]));
  const projectName = new Map((projectsList.data ?? []).map((p) => [p.id, p.name]));

  // Conflict check: has live data moved since the request captured `before`?
  const unitIds = new Set<string>();
  for (const request of requests) {
    if (request.status !== "pending" || request.entity !== "unit") continue;
    for (const op of request.ops as Json[]) if (op.id) unitIds.add(String(op.id));
  }
  const { data: liveUnits } = unitIds.size ? await db.from("units").select(UNIT_COLUMNS).in("id", [...unitIds]) : { data: [] };
  const live = new Map((liveUnits ?? []).map((unit: Json) => [String(unit.id), unit]));
  const liveProjects = new Map<string, Json>();
  const projectMediaIds = requests.filter((r) => r.status === "pending" && r.entity === "project" && r.target_id).map((r) => r.target_id);
  if (projectMediaIds.length) {
    const { data: rows } = await db.from("projects").select(PROJECT_COLUMNS).in("id", projectMediaIds);
    for (const row of rows ?? []) liveProjects.set(row.id, row);
  }

  return {
    requests: requests.map((request) => {
      let conflict = false;
      if (request.status === "pending" && request.before) {
        if (request.action === "media") {
          const current = request.entity === "project" ? liveProjects.get(request.target_id) : live.get(request.target_id);
          conflict = !current || MEDIA_FIELDS.some((key) => normalise(current[key]) !== normalise((request.before as Json)[key]));
        } else if (request.action === "update") {
          const current = live.get(request.target_id);
          conflict = !current || Object.entries(request.before as Json).some(([key, value]) => normalise(current[key]) !== normalise(value));
        } else if (request.action === "delete") {
          conflict = !live.get(request.target_id);
        } else if (request.action === "import") {
          conflict = Object.entries(request.before as Json).some(([id, fields]) => {
            const current = live.get(id);
            return !current || Object.entries(fields as Json).some(([key, value]) => normalise(current[key]) !== normalise(value));
          });
        }
      }
      return {
        ...request,
        created_by_name: userName.get(request.created_by) ?? "—",
        reviewed_by_name: request.reviewed_by ? userName.get(request.reviewed_by) ?? "—" : null,
        project_name: request.project_id ? projectName.get(request.project_id) ?? "" : "",
        conflict,
      };
    }),
  };
}

async function decideRequest(user: AdminUser, body: Json) {
  const id = Number(body.id);
  const decision = text(body.decision);
  const { data: request } = await db.from("admin_change_requests").select("*").eq("id", id).maybeSingle();
  if (!request) throw new HttpError(404, "request_not_found");
  if (request.status !== "pending") throw new HttpError(409, "request_already_decided");

  if (decision === "cancel") {
    if (request.created_by !== user.id && user.role !== "owner") throw new HttpError(403, "not_yours");
    fail((await db.from("admin_change_requests").update({ status: "cancelled", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id)).error);
    return { ok: true };
  }
  requireOwner(user);
  const note = text(body.note).slice(0, 500) || null;
  if (decision === "reject") {
    fail((await db.from("admin_change_requests").update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: note }).eq("id", id)).error);
    return { ok: true };
  }
  if (decision !== "approve") throw new HttpError(400, "invalid_decision");
  const { data: result, error } = await db.rpc("admin_apply_ops", { ops: request.ops });
  const reviewed = { reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: note };
  if (error) {
    await db.from("admin_change_requests").update({ ...reviewed, status: "failed", result: { error: error.message } }).eq("id", id);
    throw new HttpError(409, `apply_failed:${error.message}`);
  }
  fail((await db.from("admin_change_requests").update({ ...reviewed, status: "approved", result }).eq("id", id)).error);
  return { ok: true, result };
}

// ---------- users ----------

async function listUsers(user: AdminUser) {
  requireOwner(user);
  const { data, error } = await db.from("admin_users").select("id,username,display_name,role,active,created_at,last_login_at").order("created_at");
  fail(error);
  return { users: data ?? [] };
}

async function createUser(user: AdminUser, body: Json) {
  requireOwner(user);
  const username = text(body.username).toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new HttpError(400, "invalid_username");
  const password = text(body.password) || generatePassword();
  const { error } = await db.from("admin_users").insert({
    username, display_name: text(body.display_name).slice(0, 80), role: "editor", created_by: user.id, ...(await hashPassword(password)),
  });
  if (error) throw new HttpError(409, error.code === "23505" ? "username_taken" : "create_user_failed");
  return { ok: true, username, password };
}

async function updateUser(user: AdminUser, body: Json) {
  requireOwner(user);
  const id = text(body.id);
  const { data: target } = await db.from("admin_users").select("id,role").eq("id", id).maybeSingle();
  if (!target) throw new HttpError(404, "user_not_found");
  const patch: Json = {};
  let password: string | null = null;
  if (typeof body.active === "boolean") {
    if (target.id === user.id) throw new HttpError(400, "cannot_disable_self");
    patch.active = body.active;
  }
  if (body.reset_password) {
    password = text(body.password) || generatePassword();
    Object.assign(patch, await hashPassword(password));
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "nothing_to_update");
  fail((await db.from("admin_users").update(patch).eq("id", id)).error);
  if (patch.active === false || password) await db.from("media_admin_sessions").delete().eq("user_id", id).neq("user_id", user.id);
  return { ok: true, password };
}

// ---------- storage + site rebuild ----------

async function signUpload(body: Json) {
  const kind = text(body.kind);
  const rule = FILE_RULES[kind];
  if (!rule) throw new HttpError(400, "invalid_kind");
  const ext = rule.types[text(body.content_type).toLowerCase()];
  if (!ext) throw new HttpError(400, "unsupported_file_type");
  const size = Number(body.size) || 0;
  if (size <= 0 || size > rule.maxBytes) throw new HttpError(400, "file_too_large");

  let project;
  let unitPart = "";
  if (text(body.target) === "unit") {
    const unit = await loadUnit(text(body.id));
    project = await loadProject(unit.project_id);
    unitPart = `-unit-${unit.id.slice(0, 8)}`;
  } else {
    project = await loadProject(text(body.id));
  }
  const developerFolder = slugify(project.developer) || "developer";
  const projectPart = slugify(text(project.slug).split("--")[0] || project.name) || "project";
  const stamp = `${Date.now().toString(36)}${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4)}`;
  const path = `${developerFolder}/${projectPart}/${rule.folder}${projectPart}${unitPart}${kind === "image" ? "" : `-${kind}`}-${stamp}.${ext}`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message || "sign_failed");
  return { upload_url: data.signedUrl, path, public_url: `${PUBLIC_PREFIX}${path}` };
}

async function getSetting(key: string) {
  const { data } = await db.from("media_admin_settings").select("value").eq("key", key).maybeSingle();
  return data?.value as string | undefined;
}

async function setSetting(key: string, value: string) {
  fail((await db.from("media_admin_settings").upsert({ key, value, updated_at: new Date().toISOString() })).error);
}

async function settings() {
  return { has_build_hook: Boolean(await getSetting("netlify_build_hook")), last_rebuild_at: (await getSetting("last_rebuild_at")) || null };
}

async function saveSettings(user: AdminUser, body: Json) {
  requireOwner(user);
  const hook = text(body.build_hook_url);
  if (!/^https:\/\/api\.netlify\.com\/build_hooks\/[a-zA-Z0-9]{10,}$/.test(hook)) throw new HttpError(400, "invalid_build_hook");
  await setSetting("netlify_build_hook", hook);
  return settings();
}

async function rebuild(user: AdminUser) {
  requireOwner(user);
  const hook = await getSetting("netlify_build_hook");
  if (!hook) throw new HttpError(400, "build_hook_missing");
  const last = await getSetting("last_rebuild_at");
  if (last && Date.now() - new Date(last).getTime() < 3 * 60 * 1000) throw new HttpError(429, "rebuild_too_soon");
  const response = await fetch(`${hook}?trigger_title=${encodeURIComponent("Admin update")}`, { method: "POST" });
  if (!response.ok) throw new HttpError(502, "build_hook_failed");
  await setSetting("last_rebuild_at", new Date().toISOString());
  return settings();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const action = text(body.action);
    if (action === "login") return reply(await login(req, body));

    const { user, tokenHash } = await requireUser(req);
    switch (action) {
      case "me": return reply({ user, ...(await settings()) });
      case "logout":
        await db.from("media_admin_sessions").delete().eq("token_hash", tokenHash);
        return reply({ ok: true });
      case "projects": return reply(await listProjects());
      case "units": return reply(await listUnits(body));
      case "articles": return reply(await listArticles());
      case "article": return reply(await getArticle(body));
      case "article_save": return reply(await saveArticle(user, body));
      case "article_publish": return reply(await publishArticle(user, body));
      case "article_generation_claim": return reply(await claimArticleGeneration(user, tokenHash, body));
      case "article_generation_finish": return reply(await finishArticleGeneration(user, tokenHash, body));
      case "editorial_workflow": return reply(await editorialWorkflow());
      case "editorial_job_create": return reply(await createEditorialJob(user, body));
      case "editorial_job_retry": return reply(await retryEditorialJob(user, body));
      case "editorial_job": return reply(await getEditorialJob(body));
      case "editorial_job_control": return reply(await controlEditorialJob(user, body));
      case "editorial_job_claim": return reply(await claimEditorialJob(user, body));
      case "editorial_job_complete": return reply(await completeEditorialJob(user, body));
      case "editorial_job_fail": return reply(await failEditorialJob(user, body));
      case "sign_upload": return reply(await signUpload(body));
      case "save_media": return reply(await saveMedia(user, body));
      case "project_create": return reply(await projectCreate(user, body));
      case "unit_create": return reply(await unitCreate(user, body));
      case "unit_update": return reply(await unitUpdate(user, body));
      case "unit_delete": return reply(await unitDelete(user, body));
      case "units_import": return reply(await unitsImport(user, body));
      case "requests": return reply(await listRequests(user, body));
      case "request_decide": return reply(await decideRequest(user, body));
      case "users": return reply(await listUsers(user));
      case "user_create": return reply(await createUser(user, body));
      case "user_update": return reply(await updateUser(user, body));
      case "settings": return reply(await settings());
      case "save_settings": return reply(await saveSettings(user, body));
      case "rebuild": return reply(await rebuild(user));
      default: return reply({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.code, ...error.details }, error.status);
    console.error(error);
    return reply({ error: "server_error" }, 500);
  }
});

