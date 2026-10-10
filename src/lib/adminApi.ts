const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const API = `${SUPABASE_URL}/functions/v1/tycoons-admin`;
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
  units_count: number;
  available_units: number;
  units_with_own_media: number;
  pending_requests: number;
}

export interface ArticleSourceRef {
  type: "project" | "unit";
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
  entity: MediaTarget;
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

  constructor(code: string, status: number, retryAfterSeconds: number | null = null, generationFailure: GenerationFailure | null = null, reviewIssues: ArticleReviewIssue[] | null = null) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.generationFailure = generationFailure;
    this.reviewIssues = reviewIssues;
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

async function call<T>(action: string, payload: Record<string, unknown> = {}, token = ""): Promise<T> {
  const response = await fetch(API, {
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

async function generate<T>(token: string, idempotencyKey: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch("/.netlify/functions/article-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": token, "x-idempotency-key": idempotencyKey },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AdminApiError(String(data.error || `http_${response.status}`), response.status, Number(data.retry_after_seconds) || null, safeGenerationFailure(data.generation_failure), safeReviewIssues(data.review_issues));
  return data as T;
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
  articleDraft: (token: string, idempotencyKey: string, target: Pick<ArticleValues, "language" | "target_type" | "project_id" | "area_name">, topic: string) =>
    generate<Pick<ArticleValues, "title" | "slug" | "excerpt" | "body_markdown" | "meta_title" | "meta_description" | "focus_keyword" | "key_takeaways" | "faq" | "source_refs" | "review_issues"> & { generated_as: "draft" }>(token, idempotencyKey, { action: "draft", topic, ...target }),
  signUpload: (token: string, body: { target: MediaTarget; id: string; kind: MediaKind; content_type: string; size: number }) =>
    call<{ upload_url: string; path: string; public_url: string }>("sign_upload", body, token),
  saveMedia: (
    token: string,
    body: { target: MediaTarget; id: string; image_url: string; gallery_urls: string[]; video_url: string; brochure_url: string },
  ) => call<SubmitResult & { values: Omit<MediaFields, "id"> }>("save_media", body, token),
  projectCreate: (token: string, values: { name: string; developer: string; location: string; description: string }) =>
    call<SubmitResult>("project_create", { values }, token),
  unitCreate: (token: string, projectId: string, values: UnitValues) =>
    call<SubmitResult>("unit_create", { project_id: projectId, values }, token),
  unitUpdate: (token: string, id: string, values: UnitValues) => call<SubmitResult>("unit_update", { id, values }, token),
  unitDelete: (token: string, id: string) => call<SubmitResult>("unit_delete", { id }, token),
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
};

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
  owner_only: "الصلاحية دي للمالك بس",
  unsupported_file_type: "نوع الملف مش مدعوم",
  file_too_large: "الملف أكبر من المسموح",
  build_hook_missing: "لازم تحط رابط Build Hook من الإعدادات الأول",
  invalid_build_hook: "رابط الـBuild Hook مش صحيح",
  rebuild_too_soon: "لسه عامل تحديث من أقل من 3 دقايق",
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
  generation_provider_credit_exhausted: "رصيد OpenAI API المستخدم بالموقع منتهٍ. أضف رصيدًا من إعدادات الفوترة ثم حاول مجددًا.",
  generation_provider_spend_limit_exceeded: "وصل مشروع OpenAI إلى حد الإنفاق المسموح. راجع حدود الإنفاق للمشروع أو المؤسسة.",
  generation_provider_usage_limit_exceeded: "وصل حساب OpenAI إلى حد الاستخدام المسموح. راجع حدود الاستخدام أو اطلب زيادتها.",
  generation_provider_quota_exceeded: "وصل OpenAI إلى حد حصة أو فوترة غير محدد. راجع الرصيد وحدود الاستخدام والإنفاق قبل إعادة المحاولة.",
  generation_provider_authentication_failed: "تعذر توثيق مفتاح OpenAI الخاص بالموقع. راجع إعداد OPENAI_API_KEY وصلاحياته.",
  generation_provider_model_access_failed: "النموذج المحدد غير متاح لهذا المشروع أو أن المفتاح لا يملك صلاحية استخدامه.",
  generation_provider_permission_denied: "لا يملك مشروع OpenAI أو المفتاح صلاحية تنفيذ هذا الطلب. راجع صلاحيات المشروع والمفتاح.",
  generation_provider_unavailable: "خدمة إنشاء المحتوى غير متاحة مؤقتًا. راجع حالة OpenAI ثم حاول لاحقًا.",
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
  return ERROR_MESSAGES[code] || `حصل خطأ${code ? ` (${code})` : ""}`;
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

