const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const API = `${SUPABASE_URL}/functions/v1/media-admin`;
export const MEDIA_TOKEN_KEY = "tycoons_media_admin_token";

export type MediaTarget = "project" | "unit";
export type MediaKind = "image" | "video" | "brochure";

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
}

export interface AdminUnit extends MediaFields {
  project_id: string;
  unit_type: string | null;
  bedrooms_text: string | null;
  area_sqm: number | null;
  starting_price: number | null;
  availability_status: string | null;
}

export interface StorageUsage {
  objects: number;
  bytes: number;
}

export interface AdminSettings {
  has_build_hook: boolean;
  last_rebuild_at: string | null;
}

export class MediaAdminError extends Error {
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
      ...(token ? { "x-media-token": token } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new MediaAdminError(String(data.error || `http_${response.status}`), response.status);
  return data as T;
}

export const mediaAdminApi = {
  login: (password: string) => call<{ token: string }>("login", { password }),
  logout: (token: string) => call<{ ok: boolean }>("logout", {}, token),
  projects: (token: string) => call<{ projects: AdminProject[]; storage: StorageUsage | null }>("projects", {}, token),
  units: (token: string, projectId: string) => call<{ units: AdminUnit[] }>("units", { project_id: projectId }, token),
  signUpload: (token: string, body: { target: MediaTarget; id: string; kind: MediaKind; content_type: string; size: number }) =>
    call<{ upload_url: string; path: string; public_url: string }>("sign_upload", body, token),
  save: <T extends MediaFields>(
    token: string,
    body: { target: MediaTarget; id: string; image_url: string; gallery_urls: string[]; video_url: string; brochure_url: string },
  ) => call<{ saved: T }>("save", body, token),
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
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new MediaAdminError(`upload_${xhr.status}`, xhr.status)));
    xhr.onerror = () => reject(new MediaAdminError("upload_network", 0));
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
  invalid_password: "كلمة السر غلط",
  too_many_attempts: "محاولات كتير غلط. استنى ربع ساعة وجرّب تاني",
  login_required: "انتهت الجلسة، ادخل تاني",
  unsupported_file_type: "نوع الملف مش مدعوم",
  file_too_large: "الملف أكبر من المسموح",
  build_hook_missing: "لازم تحط رابط Build Hook من الإعدادات الأول",
  invalid_build_hook: "رابط الـBuild Hook مش صحيح",
  rebuild_too_soon: "لسه عامل تحديث من أقل من 3 دقايق",
  build_hook_failed: "Netlify رفض طلب التحديث",
  gallery_too_long: "أقصى عدد 60 صورة",
  upload_network: "النت فصل أثناء الرفع",
};

export function errorMessage(error: unknown) {
  const code = error instanceof MediaAdminError ? error.code : "";
  if (code.startsWith("invalid_url")) return "فيه رابط مش صحيح (لازم يبدأ بـ https ومن غير فواصل)";
  return ERROR_MESSAGES[code] || `حصل خطأ${code ? ` (${code})` : ""}`;
}
