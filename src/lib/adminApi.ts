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

  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
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
  if (!response.ok) throw new AdminApiError(String(data.error || `http_${response.status}`), response.status);
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

const FIELD_LABELS: Record<string, string> = {
  unit_type: "نوع الوحدة",
  area_sqm: "المساحة",
  starting_price: "السعر",
  location: "الموقع",
};

export function errorMessage(error: unknown): string {
  const code = error instanceof AdminApiError ? error.code : "";
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
