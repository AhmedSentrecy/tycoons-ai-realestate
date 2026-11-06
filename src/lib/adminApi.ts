const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const API = `${SUPABASE_URL}/functions/v1/tycoons-admin`;
/** Homepage "بتتطرح دلوقتي" carousel (own small function, same admin login). */
const LAUNCHES_API = `${SUPABASE_URL}/functions/v1/homepage-launches`;
/** Units from WhatsApp developer groups waiting for approval (own small function, same admin login). */
const WA_INBOX_API = `${SUPABASE_URL}/functions/v1/wa-inbox`;
export const ADMIN_TOKEN_KEY = "tycoons_admin_token";

export type MediaTarget = "project" | "unit";
export type MediaKind = "image" | "video" | "brochure";
export type AdminRole = "owner" | "editor";
export type UnitStatus = "available" | "sold" | "not_confirmed" | "review_only" | "new_launch";

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: AdminRole;
}

export interface MediaFields {
  id: string;
  image_url: string | null;
  gallery_urls: string | null;
  video_url: string | null;
  brochure_url: string | null;
}

export interface AdminProject extends MediaFields {
  name: string;
  slug: string | null;
  developer: string | null;
  location: string | null;
  /** One of AREA_GROUPS. */
  area_group?: string | null;
  sub_area?: string | null;
  units_count: number;
  available_units: number;
  units_with_own_media: number;
  pending_requests: number;
  new_units_week?: number;
  description?: string | null;
  hero_text?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  down_payment_text?: string | null;
  installments_text?: string | null;
  delivery_text?: string | null;
  /** Default finishing of the project / phase (units without one take it). */
  finishing?: string | null;
  /** WhatsApp requests from the site for this project: all-time, last 30 days, and rank (1 = most requested). */
  wa_requests?: number;
  wa_requests_30d?: number;
  wa_rank?: number | null;
  created_at?: string | null;
  last_updated_at?: string | null;
}

export type ProjectEditValues = Partial<Record<"name" | "developer" | "location" | "area_group" | "sub_area" | "description" | "hero_text" | "seo_title" | "seo_description" | "down_payment_text" | "installments_text" | "delivery_text" | "finishing", string>>;

export interface AdminDeveloper {
  slug: string;
  name: string;
  projects: number;
  has_row: boolean;
  name_ar?: string | null;
  about_ar?: string | null;
  about_en?: string | null;
  seo_title_ar?: string | null;
  seo_description_ar?: string | null;
  seo_title_en?: string | null;
  seo_description_en?: string | null;
  logo_path?: string | null;
  logo_on_dark?: boolean | null;
}
export type DeveloperEditValues = Partial<Record<"name_ar" | "about_ar" | "about_en" | "seo_title_ar" | "seo_description_ar" | "seo_title_en" | "seo_description_en" | "logo_path", string>> & { logo_on_dark?: boolean };

export interface ArticleSourceRef {
  type: "project" | "unit" | "web";
  id: string;
  label: string;
  url: string;
  source_last_updated_at?: string | null;
}

export interface ArticleReviewIssue {
  code: string;
  field: string;
  severity: "blocker" | "review";
  message: string;
}

export interface ArticleValues {
  language: "ar" | "en";
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  meta_title: string;
  meta_description: string;
  target_type: "project" | "area";
  project_id: string | null;
  area_name: string | null;
  source_refs: ArticleSourceRef[];
  focus_keyword?: string;
  key_takeaways?: string[];
  faq?: ArticleFaqItem[];
  hero_image_url?: string | null;
  translation_key?: string | null;
  review_issues?: ArticleReviewIssue[];
}

export interface ArticleFaqItem {
  question: string;
  answer: string;
}

export interface AdminArticle extends ArticleValues {
  id: string;
  status: "draft" | "published";
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  content_hash: string;
  projects?: { name: string; slug: string | null } | null;
}

export interface EditorialJob {
  id: string; run_id: string | null; content_type: "developer" | "project" | "phase" | "comparison" | "guide";
  primary_entity_id: string | null; secondary_entity_id: string | null; area_name: string | null; topic: string;
  status: string; current_step: string; attempts: number; evidence: unknown[]; validation_results: unknown[]; exceptions: Array<{ code?: string; message?: string }>;
  cost_reserved_cents: number; cost_used_cents: number; usage: Record<string, unknown>; last_error: string | null;
  next_retry_at: string | null; auto_publish_eligible: boolean; review_kind: "human" | "automated_validation" | null;
  published_article_ids: string[]; created_at: string; updated_at: string;
  draft_ar?: ArticleValues | null; draft_en?: ArticleValues | null; claim_evidence?: unknown[]; revision?: number;
}

export interface EditorialWorkflow {
  config: { workflow_version: string; timezone: string; proposed_weekday: string; proposed_local_time: string; schedule_enabled: boolean; monthly_budget_cents: number; max_attempts_per_job: number; max_parallel_jobs: number };
  jobs: EditorialJob[]; runs: Array<Record<string, unknown>>; discovery_sources: string[]; optional_imports: string[]; unavailable_sources: string[];
}

export interface TopicIdea { title: string; rationale: string; angle: string }

export interface ResearchSource { url: string; title: string }
export interface ResearchFact {
  fact: string;
  category: "location" | "developer" | "concept" | "amenities" | "master_plan" | "access" | "design" | "other";
  confidence: "official" | "corroborated" | "single";
  sources: ResearchSource[];
  reason?: "commercial" | "single_source";
}
export interface ResearchResult { facts: ResearchFact[]; excluded: ResearchFact[]; notes: string; generated_as: "research" }

/** Google data behind "اكتب المقال": the chosen keyword, search volumes and the pages ranking first. */
export interface SeoBrief {
  keyword: string;
  language: "ar" | "en";
  source: "dataforseo" | "ai";
  volumes: { keyword: string; volume: number }[];
  competitors: { rank: number; url: string; domain: string; title: string; words: number; headings: { level: number; text: string }[] }[];
  target_words: number;
  notes: string[];
}
export type ArticleDraftResult = Pick<ArticleValues, "title" | "slug" | "excerpt" | "body_markdown" | "meta_title" | "meta_description" | "focus_keyword" | "key_takeaways" | "faq" | "source_refs" | "review_issues"> & { generated_as: "draft" };
export type ArticleWriteResult = ArticleDraftResult & { research: Omit<ResearchResult, "generated_as">; seo_brief: SeoBrief };

export const UNIT_FIELDS = [
  "unit_type",
  "bedrooms_text",
  "area_sqm",
  "starting_price",
  "down_payment_text",
  "installments_text",
  "delivery_text",
  "finishing",
  "availability_status",
  "description",
] as const;
export type UnitField = (typeof UNIT_FIELDS)[number];
export type UnitValues = Partial<Record<UnitField, string | number | null>>;

export interface AdminUnit extends MediaFields {
  project_id: string;
  project_name: string;
  developer: string | null;
  location: string | null;
  unit_type: string | null;
  bedrooms_text: string | null;
  area_sqm: number | null;
  starting_price: number | null;
  down_payment_text: string | null;
  installments_text: string | null;
  delivery_text: string | null;
  finishing: string | null;
  availability_status: string | null;
  description: string | null;
  created_at?: string | null;
  last_updated_at: string | null;
}

export interface ChangeOp {
  op: "media" | "create" | "update" | "delete";
  id?: string;
  entity?: MediaTarget;
  values?: Record<string, unknown>;
}

export interface ChangeRequest {
  id: number;
  created_at: string;
  created_by: string;
  created_by_name: string;
  entity: MediaTarget | "developer";
  action: "media" | "create" | "update" | "delete" | "import";
  target_id: string | null;
  project_id: string | null;
  project_name: string;
  summary: string;
  ops: ChangeOp[];
  before: Record<string, unknown> | null;
  status: "pending" | "approved" | "rejected" | "cancelled" | "failed";
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  conflict: boolean;
}

export interface ManagedUser extends AdminUser {
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface StorageUsage {
  objects: number;
  bytes: number;
}

export interface AdminSettings {
  has_build_hook: boolean;
  last_rebuild_at: string | null;
}

export interface SubmitResult {
  applied: boolean;
  pending: boolean;
  unchanged?: boolean;
  request_id?: number;
}

export class AdminApiError extends Error {
  code: string;
  status: number;
  retryAfterSeconds: number | null;
  generationFailure: GenerationFailure | null;
  reviewIssues: ArticleReviewIssue[] | null;
  /** The AI provider's own reason for a rejected generation request (no secrets). */
  providerDetail: string | null;

  constructor(code: string, status: number, retryAfterSeconds: number | null = null, generationFailure: GenerationFailure | null = null, reviewIssues: ArticleReviewIssue[] | null = null, providerDetail: string | null = null) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.generationFailure = generationFailure;
    this.reviewIssues = reviewIssues;
    this.providerDetail = providerDetail;
  }
}

function safeReviewIssues(value: unknown): ArticleReviewIssue[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((issue: unknown): ArticleReviewIssue[] => {
    if (!issue || typeof issue !== "object" || Array.isArray(issue)) return [];
    const item = issue as Record<string, unknown>;
    if (typeof item.code !== "string" || typeof item.field !== "string" || typeof item.message !== "string" || (item.severity !== "blocker" && item.severity !== "review")) return [];
    return [{ code: item.code, field: item.field, severity: item.severity, message: item.message }];
  });
}

type GenerationFailureReason = "numeric_prose" | "commercial_prose" | "availability_prose" | "title_commercial" | "title_availability" | "claim_evidence";
type GenerationFailureField = "title" | "slug" | "excerpt" | "meta_title" | "meta_description" | "body_markdown" | "claim_evidence";
type GenerationIntent = "introduction" | "comparison" | "availability" | "area" | "other";
export interface GenerationFailure { reason: GenerationFailureReason; fields: GenerationFailureField[]; recovery_eligible: boolean; intent: GenerationIntent }

function safeGenerationFailure(value: unknown): GenerationFailure | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const reasons = new Set<GenerationFailureReason>(["numeric_prose", "commercial_prose", "availability_prose", "title_commercial", "title_availability", "claim_evidence"]);
  const allowedFields = new Set<GenerationFailureField>(["title", "slug", "excerpt", "meta_title", "meta_description", "body_markdown", "claim_evidence"]);
  const intents = new Set<GenerationIntent>(["introduction", "comparison", "availability", "area", "other"]);
  if (!reasons.has(item.reason as GenerationFailureReason) || !intents.has(item.intent as GenerationIntent) || !Array.isArray(item.fields)) return null;
  const fields = [...new Set(item.fields.filter((field): field is GenerationFailureField => typeof field === "string" && allowedFields.has(field as GenerationFailureField)))];
  return { reason: item.reason as GenerationFailureReason, fields, recovery_eligible: item.recovery_eligible === true, intent: item.intent as GenerationIntent };
}

async function call<T>(action: string, payload: Record<string, unknown> = {}, token = "", endpoint = API): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      ...(token ? { "x-admin-token": token } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AdminApiError(String(data.error || `http_${response.status}`), response.status, Number(data.retry_after_seconds) || null, safeGenerationFailure(data.generation_failure), safeReviewIssues(data.review_issues));
  return data as T;
}

// Long drafts can outlive the hosting gateway's request timeout (HTTP 504) while
// the function keeps running and stores its result under the idempotency key.
// Re-sending the same key returns that stored result (or "in progress" until it
// is ready), so polling never pays for a second generation.
// Claude drafts run in a background function (up to 15 minutes); the admin waits up to 10.
export const GENERATION_POLL = { delayMs: 5000, maxWaitMs: 600000 };

async function generate<T>(token: string, idempotencyKey: string, payload: Record<string, unknown>): Promise<T> {
  const started = Date.now();
  for (let poll = 0; ; poll += 1) {
    const response = await fetch("/.netlify/functions/article-generate", {
      method: "POST",
      // Polls are marked so the server never starts a new paid attempt while waiting.
      headers: { "Content-Type": "application/json", "x-admin-token": token, "x-idempotency-key": idempotencyKey, ...(poll ? { "x-generation-poll": "1" } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data as T;
    const pending = response.status === 504 || (response.status === 409 && data.error === "generation_in_progress");
    if (pending && Date.now() - started < GENERATION_POLL.maxWaitMs) {
      const hinted = Number(data.retry_after_seconds) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(hinted) && hinted > 0 ? Math.min(hinted, 15000) : GENERATION_POLL.delayMs));
      continue;
    }
    throw new AdminApiError(String(data.error || `http_${response.status}`), response.status, Number(data.retry_after_seconds) || null, safeGenerationFailure(data.generation_failure), safeReviewIssues(data.review_issues), typeof data.provider_detail === "string" ? data.provider_detail.slice(0, 240) : null);
  }
}

export interface ResearchFaqItem { question: string; answer: string; sources: { url: string; title: string }[] }
export interface ProjectFaqProposal extends ResearchFaqItem { topic: string; confidence: "official" | "corroborated" | "single" }
export interface ProjectFaqResearchResult { faq: ProjectFaqProposal[]; excluded: (ProjectFaqProposal & { reason: string })[]; notes: string; generated_as: "project_faq" }

export interface AgentUsageCall {
  created_at: string;
  channel: "mcp" | "webmcp";
  tool: string;
  ok: boolean;
  query: string | null;
  result_count: number | null;
}

export interface AgentUsageReport {
  days: number;
  total: number;
  truncated: boolean;
  mcp: number;
  webmcp: number;
  failed: number;
  whatsapp_inquiries: number;
  by_tool: Array<{ tool: string; calls: number }>;
  by_day: Array<{ day: string; mcp: number; webmcp: number }>;
  recent: AgentUsageCall[];
}

export interface WhatsAppClickCount { name: string; clicks: number }

export interface WhatsAppClicksReport {
  days: number;
  total: number;
  truncated: boolean;
  by_day: Array<{ day: string; clicks: number }>;
  by_traffic_source: WhatsAppClickCount[];
  by_project: WhatsAppClickCount[];
  by_page: WhatsAppClickCount[];
  by_button: WhatsAppClickCount[];
  by_device: WhatsAppClickCount[];
  by_campaign: WhatsAppClickCount[];
  recent: Array<{
    created_at: string;
    code: string | null;
    page_path: string | null;
    project: string | null;
    button: string | null;
    traffic_source: string | null;
    device: string | null;
  }>;
}

// The WhatsApp clicks report is a database function (admin_whatsapp_clicks_report) that
// checks the admin session token itself and answers only the owner.
async function whatsappClicksReport(token: string, days: 7 | 30 | 90): Promise<WhatsAppClicksReport> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_whatsapp_clicks_report`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token, p_days: days }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String((data as { message?: unknown } | null)?.message || "");
    const code = ["login_required", "owner_only"].includes(message) ? message : `http_${response.status}`;
    throw new AdminApiError(code, code === "login_required" ? 401 : code === "owner_only" ? 403 : response.status);
  }
  return data as WhatsAppClicksReport;
}

export const adminApi = {
  login: (username: string, password: string) => call<{ token: string; user: AdminUser }>("login", { username, password }),
  me: (token: string) => call<{ user: AdminUser } & AdminSettings>("me", {}, token),
  logout: (token: string) => call<{ ok: boolean }>("logout", {}, token),
  projects: (token: string) =>
    call<{ projects: AdminProject[]; storage: StorageUsage | null; pending_total: number }>("projects", {}, token),
  units: (token: string, projectId: string) =>
    call<{ units: AdminUnit[]; pending: Pick<ChangeRequest, "id" | "action" | "target_id" | "ops" | "summary" | "created_at">[] }>(
      "units",
      { project_id: projectId },
      token,
    ),
  articles: (token: string) => call<{ articles: AdminArticle[] }>("articles", {}, token),
  agentUsage: (token: string, days: 7 | 30 | 90) => call<AgentUsageReport>("agent_usage", { days }, token),
  whatsappClicks: (token: string, days: 7 | 30 | 90) => whatsappClicksReport(token, days),
  article: (token: string, id: string) => call<{ article: AdminArticle }>("article", { id }, token),
  // translationArticleId: undefined = keep the current AR/EN pairing, "" = unlink, id = link.
  articleSave: (token: string, id: string | null, values: ArticleValues, expectedRevision: number | null, translationArticleId?: string) =>
    call<{ article: AdminArticle }>("article_save", { id, values, expected_revision: expectedRevision, ...(translationArticleId === undefined ? {} : { translation_article_id: translationArticleId }) }, token),
  articlePublish: (token: string, id: string, expectedRevision: number, expectedContentHash: string) =>
    call<{ article: AdminArticle }>("article_publish", { id, expected_revision: expectedRevision, expected_content_hash: expectedContentHash, review_confirmed: true }, token),
  editorialWorkflow: (token: string) => call<EditorialWorkflow>("editorial_workflow", {}, token),
  editorialJobCreate: (token: string, input: Record<string, unknown>) => call<{ job: EditorialJob; paid_execution_enabled: false }>("editorial_job_create", input, token),
  editorialJobRetry: (token: string, id: string) => call<{ job: EditorialJob }>("editorial_job_retry", { id }, token),
  editorialJob: (token: string, id: string) => call<{ job: EditorialJob; events: Array<{ id: number; event_type: string; from_status: string | null; to_status: string | null; details: Record<string, unknown>; created_at: string }>; versions: Array<{ id: string; version_number: number; created_at: string }>; articles: Array<{ id: string; language: "ar" | "en"; status: "draft" | "published"; revision: number; content_hash: string }> }>("editorial_job", { id }, token),
  editorialJobControl: (token: string, id: string, controlAction: string, expectedRevision: number, extra: Record<string, unknown> = {}) => call<Record<string, unknown>>("editorial_job_control", { id, control_action: controlAction, expected_revision: expectedRevision, ...extra }, token),
  articleTopics: (token: string, idempotencyKey: string, target: Pick<ArticleValues, "language" | "target_type" | "project_id" | "area_name">) =>
    generate<{ topics: TopicIdea[]; source_refs: ArticleSourceRef[]; generated_as: "draft" }>(token, idempotencyKey, { action: "topics", ...target }),
  articleResearch: (token: string, idempotencyKey: string, target: Pick<ArticleValues, "language" | "target_type" | "project_id" | "area_name">, topic: string) =>
    generate<ResearchResult>(token, idempotencyKey, { action: "research", topic, ...target }),
  articleRewrite: (token: string, idempotencyKey: string, target: Pick<ArticleValues, "language" | "target_type" | "project_id" | "area_name">, lines: string[]) =>
    generate<{ lines: string[]; generated_as: "rewrite" }>(token, idempotencyKey, { action: "rewrite", lines, ...target }),
  // One button: Google data (keyword + what ranks) → web research → draft. Runs in the background.
  articleWrite: (token: string, idempotencyKey: string, target: Pick<ArticleValues, "language" | "target_type" | "project_id" | "area_name">) =>
    generate<ArticleWriteResult>(token, idempotencyKey, { action: "write", ...target }),
  articleDraft: (token: string, idempotencyKey: string, target: Pick<ArticleValues, "language" | "target_type" | "project_id" | "area_name">, topic: string, researchFacts: ResearchFact[] = []) =>
    generate<Pick<ArticleValues, "title" | "slug" | "excerpt" | "body_markdown" | "meta_title" | "meta_description" | "focus_keyword" | "key_takeaways" | "faq" | "source_refs" | "review_issues"> & { generated_as: "draft" }>(token, idempotencyKey, { action: "draft", topic, ...target, ...(researchFacts.length ? { research_facts: researchFacts } : {}) }),
  signUpload: (token: string, body: { target: MediaTarget; id: string; kind: MediaKind; content_type: string; size: number }) =>
    call<{ upload_url: string; path: string; public_url: string }>("sign_upload", body, token),
  saveMedia: (
    token: string,
    body: { target: MediaTarget; id: string; image_url: string; gallery_urls: string[]; video_url: string; brochure_url: string },
  ) => call<SubmitResult & { values: Omit<MediaFields, "id"> }>("save_media", body, token),
  projectCreate: (token: string, values: NewProjectValues) =>
    call<SubmitResult>("project_create", { values }, token),
  unitCreate: (token: string, projectId: string, values: UnitValues) =>
    call<SubmitResult>("unit_create", { project_id: projectId, values }, token),
  unitUpdate: (token: string, id: string, values: UnitValues) => call<SubmitResult>("unit_update", { id, values }, token),
  unitDelete: (token: string, id: string) => call<SubmitResult>("unit_delete", { id }, token),
  projectUpdate: (token: string, id: string, values: ProjectEditValues, newDeveloper = false) =>
    call<SubmitResult>("project_update", { id, values: newDeveloper ? { ...values, new_developer: true } : values }, token),
  projectDelete: (token: string, id: string, confirmName: string) => call<SubmitResult>("project_delete", { id, confirm_name: confirmName }, token),
  developers: (token: string) => call<{ developers: AdminDeveloper[]; logo_prefix: string }>("developers", {}, token),
  developerSave: (token: string, slug: string, name: string, values: DeveloperEditValues) =>
    call<{ ok: boolean; unchanged?: boolean }>("developer_save", { slug, name, values }, token),
  developerLogoSign: (token: string, slug: string, contentType: string, size: number) =>
    call<{ upload_url: string; path: string; public_url: string }>("developer_logo_sign", { slug, content_type: contentType, size }, token),
  unitsImport: (token: string, projectId: string, rows: { id?: string; values: UnitValues }[]) =>
    call<SubmitResult>("units_import", { project_id: projectId, rows }, token),
  requests: (token: string, status: "pending" | "history") => call<{ requests: ChangeRequest[] }>("requests", { status }, token),
  decide: (token: string, id: number, decision: "approve" | "reject" | "cancel", note = "") =>
    call<{ ok: boolean }>("request_decide", { id, decision, note }, token),
  users: (token: string) => call<{ users: ManagedUser[] }>("users", {}, token),
  userCreate: (token: string, body: { username: string; display_name: string; password?: string }) =>
    call<{ ok: boolean; username: string; password: string }>("user_create", body, token),
  userUpdate: (token: string, body: { id: string; active?: boolean; reset_password?: boolean }) =>
    call<{ ok: boolean; password: string | null }>("user_update", body, token),
  settings: (token: string) => call<AdminSettings>("settings", {}, token),
  saveSettings: (token: string, buildHookUrl: string) => call<AdminSettings>("save_settings", { build_hook_url: buildHookUrl }, token),
  rebuild: (token: string) => call<AdminSettings>("rebuild", {}, token),
  projectFaqResearch: (token: string, idempotencyKey: string, projectId: string) =>
    generate<ProjectFaqResearchResult>(token, idempotencyKey, { action: "project_faq", target_type: "project", language: "ar", project_id: projectId }),
  projectResearchFaq: (token: string, projectId: string) =>
    call<{ items: ResearchFaqItem[]; updated_at: string | null }>("project_research_faq", { project_id: projectId }, token),
  projectResearchFaqSave: (token: string, projectId: string, items: ResearchFaqItem[]) =>
    call<{ items: ResearchFaqItem[]; updated_at: string; rebuilt: boolean }>("project_research_faq_save", { project_id: projectId, items }, token),
  homepageLaunches: (token: string) => call<HomepageLaunchList>("homepage_launches", {}, token, LAUNCHES_API),
  saveHomepageLaunches: (token: string, items: HomepageLaunchItem[]) =>
    call<HomepageLaunchList>("homepage_launches_save", { items }, token, LAUNCHES_API),
  waInbox: (token: string, status: WaInboxStatus) =>
    call<{ items: WaInboxItem[]; matches: AdminUnit[]; counts: Record<WaInboxStatus, number>; duplicates?: Record<string, number[]>; auto_filled?: Record<string, Record<string, WaFillSource>>; previously_rejected?: Record<string, string>; suggestions?: Record<string, WaProjectSuggestion>; finishing_suggestions?: Record<string, string>; doubts?: Record<string, WaDoubt[]>; drafts?: Record<string, WaDraft>; no_photos?: Record<string, true>; photo_gaps?: WaPhotoGap[]; photo_checks?: Record<string, WaPhotoCheck>; auto_approve?: WaAutoApprove }>("list", { status }, token, WA_INBOX_API),
  waInboxSave: (token: string, id: number, values: WaInboxValues) =>
    call<{ item: WaInboxItem }>("save", { id, values }, token, WA_INBOX_API),
  waInboxApprove: (
    token: string,
    id: number,
    values: WaInboxValues,
    replaceUnitId: string,
    availabilityStatus: "available" | "new_launch",
    images: string[] = [],
  ) =>
    call<{ ok: boolean; unit_id: string; action: "create" | "update" }>(
      "approve",
      { id, values, replace_unit_id: replaceUnitId, availability_status: availabilityStatus, image_url: images[0] ?? "", gallery_urls: images },
      token,
      WA_INBOX_API,
    ),
  /** Links the unit (and every pending unit with the same WhatsApp name) to the project and remembers the name. */
  waInboxLink: (token: string, id: number, projectId: string) =>
    call<{ ok: boolean; linked: number; remembered: boolean }>("link_project", { id, project_id: projectId }, token, WA_INBOX_API),
  /** Approves the units that are still ready when the server checks again; the others are skipped with the reason. */
  waInboxApproveReady: (token: string, ids: number[]) =>
    call<{ ok: boolean; approved: number; approved_ids: number[]; skipped: { id: number; reason: string }[] }>("approve_ready", { ids }, token, WA_INBOX_API),
  /** Saves the admin's edits on a new project (every field sent counts as confirmed). */
  waDraftSave: (token: string, id: string, values: Partial<Record<WaDraftField, string>>, confirm: WaDraftField[] = []) =>
    call<{ draft: WaDraft }>("draft_save", { id, values, confirm }, token, WA_INBOX_API),
  waDraftResearch: (token: string, id: string) => call<{ draft: WaDraft }>("draft_research", { id }, token, WA_INBOX_API),
  waDraftReject: (token: string, id: string) => call<{ ok: boolean }>("draft_reject", { id }, token, WA_INBOX_API),
  waResearchSettings: (token: string) => call<WaResearchSettings>("research_settings", {}, token, WA_INBOX_API),
  waResearchSettingsSave: (token: string, mode: WaResearchMode, dailyCap: number | null, intensiveUntil: string) =>
    call<WaResearchSettings>("research_settings_save", { mode, daily_cap: dailyCap, intensive_until: intensiveUntil }, token, WA_INBOX_API),
  /** Turns the automatic approval of ready WhatsApp units on or off. */
  /** The two switches: «النزول التلقائي» (on) and «تشييك الصور» (photo_check). */
  waAutoApproveSave: (token: string, values: { on?: boolean; photo_check?: boolean }) => call<WaAutoApprove>("auto_approve_save", values, token, WA_INBOX_API),
  /** «الصور صح»: the project's current photos are fine even though Claude flagged them. */
  waPhotoConfirm: (token: string, projectId: string) => call<{ ok: boolean }>("photo_confirm", { project_id: projectId }, token, WA_INBOX_API),
  /** Creates the project on the site, links its WhatsApp units and approves the ready ones. */
  waPublishDraft: (token: string, id: string) =>
    call<{ ok: boolean; project_id: string; slug: string; created: boolean; linked: number; approved: number; left_for_review: number }>("publish_draft", { id }, token, WA_INBOX_API),
  waGroupDeveloper: (token: string, groupId: string, developer: string) =>
    call<{ groups: WaGroup[] }>("group_developer", { group_id: groupId, developer }, token, WA_INBOX_API),
  waInboxReject: (token: string, ids: number[]) => call<{ ok: boolean; rejected: number }>("reject", { ids }, token, WA_INBOX_API),
  waGroups: (token: string) => call<{ groups: WaGroup[] }>("groups", {}, token, WA_INBOX_API),
  waGroupToggle: (token: string, groupId: string, track: boolean) =>
    call<{ groups: WaGroup[] }>("group_toggle", { group_id: groupId, track }, token, WA_INBOX_API),
};

export type WaInboxStatus = "pending" | "approved" | "rejected";
/** Ready WhatsApp units go on the site by themselves every 15 minutes (except units that would have no photo). */
export interface WaAutoApprove {
  on: boolean;
  last_run: string | null;
  last_approved: number;
  /** «تشييك الصور»: off = nothing goes on the site by itself, only what the admin approves by hand. */
  photo_check: boolean;
  /** What the photo checks cost (Sonnet 5.5 list price). */
  photo_usage: { today: WaPhotoUsage; total: WaPhotoUsage };
}
export interface WaPhotoUsage {
  checks: number;
  input_tokens: number;
  output_tokens: number;
  usd: number;
}
/**
 * Claude's check of a project's current photos before its units go on the site by themselves:
 * ok / confirmed (the admin) pass; mismatch (not this project), phone (another phone number) and error wait.
 */
export interface WaPhotoCheck {
  status: "ok" | "mismatch" | "phone" | "confirmed" | "error";
  reason: string | null;
  bad_urls: string[];
  checked_at: string;
}
/** A site project with no photos, and how many ready WhatsApp units wait for its photos. */
export interface WaPhotoGap {
  project_id: string;
  name: string;
  developer: string;
  waiting: number;
}
/** How much Claude researches new projects: «مكثف» (every 15 min, 40/day), «عادي» (every 6 h, 8/day), «متوقف». */
export type WaResearchMode = "intensive" | "normal" | "off";
export interface WaResearchSettings {
  /** In effect now («مكثف» becomes «عادي» by itself after `until`). */
  mode: WaResearchMode;
  chosen: WaResearchMode;
  until: string | null;
  cap: number;
  used_today: number;
  last_run: string | null;
}
/** Why a WhatsApp unit waits in "محتاج مراجعة" instead of "جاهز للموافقة". */
export type WaDoubt =
  | "no_project" | "no_name" | "dev_unknown" | "dev_conflict" | "suggested_project" | "missing_type" | "missing_area" | "missing_price"
  | "missing_payment" | "missing_delivery" | "missing_finishing" | "no_area" | "duplicate" | "rejected_before" | "price_jump"
  | "draft_review" | "draft_researching";
export const WA_DOUBT_LABELS: Record<WaDoubt, string> = {
  no_project: "المشروع مش على الموقع",
  no_name: "اسم المشروع مش واضح",
  dev_unknown: "المطور مش معروف",
  dev_conflict: "نفس المشروع جه بأكتر من مطور",
  suggested_project: "مشروع مقترح محتاج تأكيد",
  missing_type: "النوع ناقص",
  missing_area: "المساحة ناقصة",
  missing_price: "السعر ناقص",
  missing_payment: "طريقة الدفع ناقصة",
  missing_delivery: "الاستلام ناقص",
  missing_finishing: "التشطيب ناقص",
  no_area: "المنطقة ناقصة",
  duplicate: "مكررة",
  rejected_before: "اترفضت قبل كده",
  price_jump: "السعر مختلف جدًا عن الموقع",
  draft_review: "بيانات المشروع الجديد محتاجة مراجعة",
  draft_researching: "بندوّر على المشروع على النت",
};
/** Where a detail the WhatsApp message left out was filled from. */
export type WaFillSource = "unit" | "project" | "units" | "web";
/** The project an unmatched WhatsApp name most likely means (confirmed by the admin). */
export interface WaProjectSuggestion { project_id: string; name: string; kind: "phase" | "master" | "similar" | "ai" }
export const WA_SUGGEST_LABELS: Record<WaProjectSuggestion["kind"], string> = { phase: "نفس المرحلة", master: "المشروع الأم", similar: "اسم قريب", ai: "Claude شايفه نفس المشروع" };

/** A project from the WhatsApp groups that is not on the site yet (researched on the web, waiting for «انشر»). */
export interface WaDraft {
  id: string;
  status: "researching" | "ready" | "needs_review" | "published" | "rejected";
  name: string;
  name_ar: string | null;
  developer: string | null;
  area_group: string | null;
  sub_area: string | null;
  location: string | null;
  description: string | null;
  down_payment_text: string | null;
  installments_text: string | null;
  delivery_text: string | null;
  finishing: string | null;
  wa_keys: string[];
  /** field -> source URLs (2+ different sites = trusted) */
  sources: Record<string, string[]>;
  doubts: string[];
  /** fields the admin typed or confirmed */
  confirmed: string[];
  research_error: string | null;
  researched_at: string | null;
  project_id: string | null;
  published_at: string | null;
}
export type WaDraftField =
  | "name" | "name_ar" | "developer" | "area_group" | "sub_area" | "location" | "description"
  | "down_payment_text" | "installments_text" | "delivery_text" | "finishing";
export const WA_DRAFT_FIELD_LABELS: Record<WaDraftField, string> = {
  name: "الاسم", name_ar: "الاسم بالعربي", developer: "المطور", area_group: "المنطقة", sub_area: "المنطقة الفرعية", location: "العنوان",
  description: "وصف قصير", down_payment_text: "المقدم", installments_text: "التقسيط", delivery_text: "الاستلام", finishing: "التشطيب",
};
/** What keeps a new project from «انشر» (codes from wa-inbox research.ts). */
export function waDraftDoubtLabel(code: string): string {
  if (code === "not_found") return "مالقيناش المشروع على النت";
  if (code === "grouping_unsure") return "مش متأكدين إن الأسماء دي مشروع واحد";
  if (code === "developer_mismatch") return "المطور على النت غير اللي في الجروب";
  const [kind, ...rest] = code.split("_");
  const label = WA_DRAFT_FIELD_LABELS[rest.join("_") as WaDraftField] ?? rest.join("_");
  if (kind === "missing") return `${label}: مالقيناهوش في مصدرين`;
  if (kind === "weak") return `${label}: مصدر واحد بس`;
  if (kind === "conflict") return `${label}: المصادر مختلفة`;
  return code;
}

/** Usual finishing types (the field still accepts any text). */
export const FINISHING_OPTIONS = [
  "Core & Shell", "Semi Finished", "Flexi Finished", "Fully Finished", "Fully Finished with ACs", "Furnished",
] as const;
export const FINISHING_LABELS: Record<string, string> = {
  "Core & Shell": "طوب أحمر", "Semi Finished": "نص تشطيب", "Flexi Finished": "٣/٤ تشطيب",
  "Fully Finished": "تشطيب كامل", "Fully Finished with ACs": "تشطيب كامل + تكييفات", Furnished: "مفروش",
};

export const WA_FILL_LABELS: Record<WaFillSource, string> = { unit: "من الوحدة الحالية", project: "من بيانات المشروع", units: "من وحدات المشروع", web: "من النت (مصدرين)" };

/** The 9 main areas: projects.area_group, the WhatsApp intake and the area dropdowns all use this list. */
export const AREA_GROUPS = ["New Cairo", "Mostakbal City", "New Capital", "Sheikh Zayed", "October", "North Coast", "New Alamein", "Ain Sokhna", "Other"] as const;

export interface NewProjectValues {
  name: string;
  developer: string;
  /** true = the developer is not in the developers list yet and should be added. */
  new_developer?: boolean;
  area_group: string;
  sub_area: string;
  description: string;
  finishing?: string;
}

/** What the site shows as the project's area: "Golden Square, New Cairo" or just "New Cairo". */
export const areaLabel = (group: string, sub: string) => (sub ? `${sub}, ${group}` : group);

/** Sub areas already used by projects of one main area, most used first. */
export function subAreaOptions(projects: Pick<AdminProject, "area_group" | "sub_area">[], group: string): string[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const sub = String(project.sub_area || "").trim();
    if (project.area_group === group && sub) counts.set(sub, (counts.get(sub) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([sub]) => sub);
}
export const WA_INBOX_FIELDS = [
  "project_id",
  "location",
  "unit_type",
  "bedrooms_text",
  "area_sqm",
  "starting_price",
  "down_payment_text",
  "installments_text",
  "delivery_text",
  "finishing",
  "description",
] as const;
export type WaInboxValues = Partial<Record<(typeof WA_INBOX_FIELDS)[number], string | number | null>>;

/** One unit Claude read from a WhatsApp developer group, waiting for the admin's decision. */
export interface WaInboxItem {
  id: number;
  created_at: string;
  updated_at: string;
  status: WaInboxStatus;
  project_id: string | null;
  project_name: string | null;
  developer: string | null;
  location: string | null;
  unit_type: string | null;
  bedrooms_text: string | null;
  area_sqm: number | string | null;
  starting_price: number | string | null;
  down_payment_text: string | null;
  installments_text: string | null;
  delivery_text: string | null;
  finishing: string | null;
  description: string | null;
  image_url: string | null;
  source_group: string | null;
  sender: string | null;
  message_id: string | null;
  match_unit_id: string | null;
  /** Main area Claude gave the unit (one of AREA_GROUPS). */
  area_group?: string | null;
  /** New project (not on the site yet) this unit belongs to. */
  draft_id?: string | null;
  decided_at: string | null;
  result_unit_id: string | null;
  note: string | null;
}

export interface WaGroup {
  group_id: string;
  name: string | null;
  track: boolean;
  /** The group's usual developer (used when a message names none). */
  developer?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  messages: number;
}

/** One project in the homepage "بتتطرح دلوقتي" carousel (order = position in the list). */
export interface HomepageLaunchItem {
  project_id: string;
  badge: string;
  image_url: string;
  name?: string;
  rank?: number;
}
export interface HomepageLaunchList {
  items: HomepageLaunchItem[];
  badges: string[];
}

const projectKey = (value: string | null | undefined) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Older imports left duplicate project rows: no slug (no public page), no units,
 * and a twin with a page under the same name (or a longer name, e.g. Mindset ->
 * Mindset Residences). They are hidden from the admin lists so nobody edits or
 * links the wrong row. Rows without a twin stay visible.
 */
export function hideLegacyDuplicates<T extends Pick<AdminProject, "slug" | "name" | "units_count">>(projects: T[]): T[] {
  const live = projects.filter((project) => project.slug);
  const names = new Set(live.map((project) => projectKey(project.name)));
  const bases = live.map((project) => String(project.slug).split("--")[0]);
  return projects.filter((project) => {
    if (project.slug || project.units_count > 0) return true;
    const key = projectKey(project.name);
    return !(names.has(key) || (key.length >= 4 && bases.some((base) => base === key || base.startsWith(`${key}-`))));
  });
}

export function splitUrls(value: string | null | undefined): string[] {
  return [...new Set(String(value || "").split(",").map((url) => url.trim()).filter(Boolean))];
}

/** Ordered image list as the site shows it: cover first, then the gallery. */
export function mediaImages(item: Pick<MediaFields, "image_url" | "gallery_urls">): string[] {
  return [...new Set([String(item.image_url || "").trim(), ...splitUrls(item.gallery_urls)].filter(Boolean))];
}

/** PUT a file to a one-time signed Storage URL, reporting progress (0..1). */
export function uploadToSignedUrl(url: string, file: Blob, onProgress: (ratio: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new AdminApiError(`upload_${xhr.status}`, xhr.status)));
    xhr.onerror = () => reject(new AdminApiError("upload_network", 0));
    xhr.send(file);
  });
}

const MAX_IMAGE_EDGE = 2400;

/**
 * Re-encode photos to WebP (max 2400px) in the browser before upload: keeps pages fast
 * (Core Web Vitals) and the 1 GB free Storage quota healthy. Falls back to the original
 * file when the browser can't decode/encode it or when WebP wouldn't be smaller.
 */
export async function optimizeImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (webp && webp.type === "image/webp" && (webp.size < file.size || !isUploadableImage(file.type))) return webp;
    if (isUploadableImage(file.type)) return file;
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return jpeg ?? file;
  } catch {
    return file;
  }
}

/** og:image / Article.image must be an image file, never a page URL. */
export const isImageUrl = (value: string) => /^https:\/\/[^\s"'<>?#]+\.(?:jpe?g|png|webp|avif|gif)(?:\?[^\s"'<>]*)?$/i.test(value);

export function isUploadableImage(type: string) {
  return ["image/webp", "image/jpeg", "image/png", "image/avif"].includes(type);
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_password: "اسم المستخدم أو كلمة السر غلط",
  too_many_attempts: "محاولات كتير غلط. استنى ربع ساعة وجرّب تاني",
  login_required: "انتهت الجلسة، ادخل تاني",
  project_required: "اختار المشروع الأول",
  area_required: "اكتب المساحة الأول",
  price_required: "اكتب السعر الأول",
  already_decided: "الوحدة دي اتوافق عليها أو اترفضت قبل كده",
  inbox_item_not_found: "الوحدة دي مش موجودة — حدّث الصفحة",
  group_not_found: "الجروب ده مش موجود — حدّث الصفحة",
  session_check_failed: "في مشكلة مؤقتة في السيرفر، جرّب تاني بعد ثواني",
  owner_only: "الصلاحية دي للمالك بس",
  project_has_articles: "المشروع ده عليه مقالات — امسح المقالات بتاعته أو انقلها لمشروع تاني الأول",
  confirm_name_mismatch: "اكتب اسم المشروع بالظبط زي ما هو عشان تأكد المسح",
  invalid_logo_path: "ملف اللوجو مش صالح",
  name_required: "اسم المشروع مينفعش يبقى فاضي",
  unsupported_file_type: "نوع الملف مش مدعوم",
  file_too_large: "الملف أكبر من المسموح",
  build_hook_missing: "لازم تحط رابط Build Hook من الإعدادات الأول",
  invalid_build_hook: "رابط الـBuild Hook مش صحيح",
  rebuild_too_soon: "لسه عامل تحديث من أقل من 3 دقايق",
  research_faq_invalid: "في سؤال ناقص: لازم سؤال وإجابة (20 حرف على الأقل) ومصدر واحد على الأقل",
  build_hook_failed: "Netlify رفض طلب التحديث",
  gallery_too_long: "أقصى عدد 60 صورة",
  upload_network: "النت فصل أثناء الرفع",
  unit_type_required: "نوع الوحدة مطلوب",
  invalid_status: "حالة الوحدة مش صحيحة",
  import_empty: "الملف مفيهوش صفوف",
  import_too_large: "أقصى عدد 1000 صف في المرة",
  request_already_decided: "الطلب ده اتقرر فيه قبل كده",
  username_taken: "اسم المستخدم ده موجود",
  invalid_username: "اسم المستخدم: حروف إنجليزي صغيرة وأرقام (3 حروف على الأقل)",
  password_too_short: "كلمة السر لازم 10 حروف على الأقل",
  cannot_disable_self: "مينفعش تقفل حسابك انت",
  unit_not_found: "الوحدة مش موجودة (ممكن تكون اتمسحت)",
  project_not_found: "المشروع مش موجود",
  project_name_required: "اسم المشروع مطلوب",
  developer_required: "اسم المطور مطلوب",
  location_required: "المنطقة مطلوبة",
  project_exists: "فيه مشروع بنفس الاسم والمطور موجود بالفعل",
};

Object.assign(ERROR_MESSAGES, {
  http_504: "التوليد أخد وقت أطول من المعتاد. اضغط نفس الزرار تاني بعد دقيقة — هيجيب النتيجة اللي اتعملت من غير ما يتحسب تاني.",
  generation_in_progress: "لسه بيتولّد. استنى دقيقة واضغط نفس الزرار تاني.",
  article_keyword_too_long: "الكلمة المفتاحية طويلة — أقصى حد 80 حرف",
  article_takeaways_invalid: "الخلاصة: أقصى حد 6 نقاط، وكل نقطة أقل من 240 حرف",
  article_faq_invalid: "الأسئلة الشائعة: أقصى حد 10 أسئلة، وكل سؤال لازم يكون له إجابة (السؤال أقل من 200 حرف والإجابة أقل من 700)",
  article_translation_invalid: "مينفعش تربط المقال بنفسه",
  article_translation_not_found: "النسخة اللي اخترتها للربط مش موجودة",
  article_translation_same_language: "النسخة المقابلة لازم تكون باللغة التانية",
  article_translation_target_mismatch: "النسخة المقابلة لازم تكون لنفس المشروع أو نفس المنطقة",
  article_translation_taken: "النسخة دي مربوطة بالفعل بمقال تاني بنفس اللغة",
  article_review_blocked: "توجد ملاحظات تمنع النشر. راجع الملاحظات في المحرر، ثم صحّحها واحفظ المسودة لإعادة الفحص.",
  article_review_confirmation_required: "راجع حقائق النسخة المحفوظة ومصادرها وجميع ملاحظات المراجعة، ثم أكّد المراجعة قبل النشر.",
  generation_provider_credit_exhausted: "رصيد حساب الـ AI (Claude أو OpenAI) خلص. اشحن الرصيد من صفحة Billing وجرّب تاني.",
  generation_provider_spend_limit_exceeded: "حساب الـ AI (Claude أو OpenAI) وصل لحد الصرف الشهري. ارفع الحد من إعدادات الحساب.",
  generation_provider_usage_limit_exceeded: "حساب الـ AI وصل لحد الاستخدام المسموح. راجع حدود الاستخدام أو اطلب زيادتها.",
  generation_provider_quota_exceeded: "حساب الـ AI وصل لحد في الحصة أو الفوترة. راجع الرصيد والحدود قبل ما تجرّب تاني.",
  generation_provider_authentication_failed: "مفتاح الـ AI بتاع الموقع مش شغال. راجع ANTHROPIC_API_KEY (أو OPENAI_API_KEY) في Netlify.",
  generation_provider_model_access_failed: "النموذج المحدد غير متاح لهذا المشروع أو أن المفتاح لا يملك صلاحية استخدامه.",
  generation_provider_permission_denied: "مفتاح الـ AI ملوش صلاحية للطلب ده. راجع صلاحيات المفتاح.",
  generation_provider_unavailable: "خدمة كتابة المحتوى (Claude) مش متاحة دلوقتي. جرّب تاني بعد شوية.",
  generation_background_failed: "الكتابة وقفت قبل ما تخلص. اعمل refresh للصفحة وجرّب تاني؛ مفيش محاولة جديدة اتعملت لوحدها.",
  generation_background_unavailable: "تعذر بدء الكتابة في الخلفية. جرّب تاني بعد دقيقة.",
  generation_provider_request_invalid: "رفضت خدمة إنشاء المحتوى إعدادات الطلب. راجع النموذج وإعدادات التوليد.",
  generation_provider_limit_unknown: "رفض مزود إنشاء المحتوى الطلب بسبب حد غير محدد. راجع كود الخطأ ومعرّف الطلب في سجل الوظيفة قبل إعادة المحاولة.",
  generation_provider_failed: "فشل مزود إنشاء المحتوى. راجع بيانات التشخيص الآمنة في سجل الوظيفة.",
  generation_incomplete_max_output_tokens: "لم يكتمل اقتراح الموضوعات. حاول مرة أخرى؛ لن يتم حفظ نتيجة ناقصة.",
  generation_incomplete: "توقف اقتراح الموضوعات قبل اكتماله. حاول مرة أخرى.",
  generation_refused: "تعذر إنشاء الاقتراحات لهذا الطلب. عدّل البيانات وحاول مرة أخرى.",
  generation_empty: "لم تصل اقتراحات من خدمة التوليد. حاول مرة أخرى.",
  generation_invalid: "وصلت نتيجة غير مكتملة من خدمة التوليد. حاول مرة أخرى.",
  generation_shape_invalid: "وصلت اقتراحات بتنسيق غير صالح. حاول مرة أخرى.",
  generation_failed: "تعذر إكمال التوليد حاليًا. حاول مرة أخرى.",
  generation_source_insufficient: "بيانات الوحدات الحالية لا تكفي لكتابة مقارنة مساحات موثوقة.",
  generation_placeholder_unresolved: "المسودة تحتوي على قيمة مؤقتة غير مكتملة، لذلك لم يتم قبولها.",
  generation_topic_unsupported: "المسودة لا تدعم وعد العنوان ببيانات الوحدات المتاحة.",
  generation_area_fact_unverified: "المسودة تحتوي على مساحة وحدة غير مرتبطة بصف مصدر موثوق.",
  generation_commercial_fact_unverified: "المسودة تحتوي على رقم تجاري غير موجود في بيانات الوحدة المصدر.",
  generation_commercial_review_required: "أي سعر أو نظام سداد أو موعد تسليم يجب ربطه بوحدة مصدر والتنبيه لمراجعته.",
});

const FIELD_LABELS: Record<string, string> = {
  unit_type: "نوع الوحدة",
  area_sqm: "المساحة",
  starting_price: "السعر",
  location: "الموقع",
};

const GENERATION_FIELD_LABELS: Record<GenerationFailureField, string> = {
  title: "العنوان", slug: "الرابط", excerpt: "الملخص", meta_title: "عنوان البحث",
  meta_description: "وصف البحث", body_markdown: "نص المقال", claim_evidence: "اختيار بيانات الوحدة",
};

export function errorMessage(error: unknown): string {
  const code = error instanceof AdminApiError ? error.code : "";
  if (code === "generation_commercial_fact_unverified" && error instanceof AdminApiError && error.generationFailure) {
    const failure = error.generationFailure;
    const locations = failure.fields.map((field) => GENERATION_FIELD_LABELS[field]).join("، ");
    const suffix = locations ? ` في: ${locations}.` : ".";
    if (failure.reason === "numeric_prose") return `المسودة تضمنت رقماً تجارياً غير موثق${suffix}`;
    if (failure.reason === "commercial_prose") return `المسودة تضمنت وصفاً تجارياً غير موثق${suffix}`;
    if (failure.reason === "availability_prose") return `المسودة تضمنت ادعاء توافر غير موثق${suffix}`;
    if (failure.reason === "title_commercial") return `عنوان المسودة تضمن ادعاءً تجارياً غير موثق${suffix}`;
    if (failure.reason === "title_availability") return `عنوان المسودة تضمن ادعاء توافر غير موثق${suffix}`;
    if (failure.reason === "claim_evidence") return "اختارت المسودة حقيقة تجارية غير موجودة في بيانات الوحدة المصدر.";
  }
  if (code === "generation_rate_limited") {
    const seconds = error instanceof AdminApiError ? error.retryAfterSeconds : null;
    const minutes = Math.max(1, Math.ceil((seconds || 600) / 60));
    return `تم بلوغ حد 6 طلبات توليد خلال 10 دقائق. حاول بعد نحو ${minutes} دقائق؛ لم يتم إرسال محاولة مدفوعة جديدة.`;
  }
  if (code === "generation_provider_rate_limited") {
    const seconds = error instanceof AdminApiError ? error.retryAfterSeconds : null;
    if (!seconds) return "وصل مزود التوليد إلى حد الطلبات مؤقتاً. حاول لاحقاً؛ لن تتم إعادة المحاولة تلقائياً.";
    return `مزود التوليد مشغول حالياً. حاول بعد ${seconds} ثانية؛ لن تتم إعادة المحاولة تلقائياً.`;
  }
  if (code.startsWith("invalid_url")) return "فيه رابط مش صحيح (لازم يبدأ بـ https ومن غير فواصل)";
  if (code.startsWith("invalid_number:")) return `رقم مش صحيح في ${FIELD_LABELS[code.split(":")[1]] || code.split(":")[1]}`;
  if (code.startsWith("row_")) {
    const [row, inner] = code.slice(4).split(":");
    return `صف ${row}: ${errorMessage(new AdminApiError(inner, 400))}`;
  }
  if (code.startsWith("apply_failed")) return "التعديل ماتطبقش — البيانات اتغيرت. حدّث الصفحة وجرّب تاني";
  const detail = error instanceof AdminApiError && error.providerDetail ? ` — رد الـ AI: ${error.providerDetail}` : "";
  return (ERROR_MESSAGES[code] || `حصل خطأ${code ? ` (${code})` : ""}`) + detail;
}

export const STATUS_LABELS: Record<string, string> = {
  available: "متاحة",
  sold: "اتباعت",
  not_confirmed: "محتاجة تأكيد",
  review_only: "مراجعة",
  new_launch: "إطلاق جديد",
};

export const UNIT_FIELD_LABELS: Record<string, string> = {
  unit_type: "النوع",
  bedrooms_text: "الغرف",
  area_sqm: "المساحة م²",
  starting_price: "السعر",
  down_payment_text: "المقدم",
  installments_text: "التقسيط",
  delivery_text: "الاستلام",
  finishing: "التشطيب",
  availability_status: "الحالة",
  description: "الوصف",
  location: "الموقع",
  image_url: "الغلاف",
  gallery_urls: "المعرض",
  video_url: "الفيديو",
  brochure_url: "البروشور",
  project_name: "المشروع",
  name: "الاسم",
  developer: "المطور",
  slug: "الرابط",
  status: "الحالة",
  hero_text: "نص الهيرو",
  seo_title: "عنوان SEO",
  seo_description: "وصف SEO",
};

export function formatPrice(value: number | string | null | undefined) {
  const number = Number(value);
  if (!number) return "—";
  if (number >= 1_000_000) return `${Number((number / 1_000_000).toFixed(2))} مليون`;
  return `${Math.round(number / 1000)} ألف`;
}


/** "طلبات واتساب: 7 · الترتيب #1" for a project, or "" when nobody asked yet. */
export function waDemandLabel(project: Pick<AdminProject, "wa_requests" | "wa_requests_30d" | "wa_rank">): string {
  if (!project.wa_requests) return "";
  return `طلبات واتساب: ${project.wa_requests}${project.wa_requests_30d ? ` (${project.wa_requests_30d} آخر 30 يوم)` : ""} · الترتيب #${project.wa_rank}`;
}

/** Published article languages per project id. */
export function articleLanguages(articles: { project_id: string | null; status: string; language: string }[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const article of articles) {
    if (article.status !== "published" || !article.project_id) continue;
    map.set(article.project_id, new Set([...(map.get(article.project_id) ?? []), article.language]));
  }
  return map;
}
