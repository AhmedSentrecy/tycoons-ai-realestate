// Supabase Edge Function: media-admin
// Backend for /admin/media — lets the owner attach photos, videos and brochures to
// projects/units without opening the Supabase dashboard.
//
// Security model
// - The service-role key never leaves this function (Supabase injects it at runtime).
// - Login = PBKDF2-SHA256 password check -> random session token (only its SHA-256 is stored).
// - Files go straight from the browser to Storage through one-time signed upload URLs
//   (no bucket policies needed, no size limit from this function).
// - All tables used here have RLS on with no policies: unreachable with the public key.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const BUCKET = "property-images";
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const PASSWORD = {
  salt: "53c9878f427bb0807534276086046e07",
  iterations: 210000,
  hash: "ea3defbd301ed242294e8e06599ca60f898eadd0b9ba6a9558491773ec46d5b3",
};
const SESSION_DAYS = 7;
const MAX_FAILURES_PER_15_MIN = 8;
const MAX_GALLERY = 60;
const MB = 1024 * 1024;
const FILE_RULES: Record<string, { types: Record<string, string>; maxBytes: number; folder: string }> = {
  image: {
    types: { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/avif": "avif" },
    maxBytes: 15 * MB,
    folder: "",
  },
  video: { types: { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }, maxBytes: 50 * MB, folder: "videos/" },
  brochure: { types: { "application/pdf": "pdf" }, maxBytes: 50 * MB, folder: "brochures/" },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-media-token, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (value: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const text = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());

function slugify(value: unknown) {
  return text(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function passwordMatches(password: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(PASSWORD.salt.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD.iterations }, key, 256);
  return timingSafeEqual(hex(bits), PASSWORD.hash);
}

function clientIp(req: Request) {
  return text(req.headers.get("x-forwarded-for")?.split(",")[0]) || text(req.headers.get("cf-connecting-ip")) || "unknown";
}

async function login(req: Request, body: Record<string, unknown>) {
  const ipHash = await sha256(clientIp(req));
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await db
    .from("media_admin_login_failures")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_FAILURES_PER_15_MIN) throw new HttpError(429, "too_many_attempts");

  if (!(await passwordMatches(text(body.password)))) {
    await db.from("media_admin_login_failures").insert({ ip_hash: ipHash });
    await new Promise((resolve) => setTimeout(resolve, 700));
    throw new HttpError(401, "invalid_password");
  }

  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const now = Date.now();
  await db.from("media_admin_sessions").delete().lt("expires_at", new Date(now).toISOString());
  await db.from("media_admin_login_failures").delete().lt("created_at", new Date(now - 24 * 3600 * 1000).toISOString());
  const { error } = await db.from("media_admin_sessions").insert({
    token_hash: await sha256(token),
    expires_at: new Date(now + SESSION_DAYS * 86400 * 1000).toISOString(),
  });
  if (error) throw error;
  return { token, expires_in_days: SESSION_DAYS };
}

async function requireSession(req: Request) {
  const token = text(req.headers.get("x-media-token"));
  if (token.length < 32) throw new HttpError(401, "login_required");
  const { data } = await db
    .from("media_admin_sessions")
    .select("token_hash, expires_at")
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) throw new HttpError(401, "login_required");
  return data.token_hash as string;
}

const PROJECT_COLUMNS = "id,name,slug,developer,location,image_url,gallery_urls,video_url,brochure_url";
const UNIT_COLUMNS =
  "id,project_id,unit_type,bedrooms_text,area_sqm,starting_price,availability_status,image_url,gallery_urls,video_url,brochure_url";

// PostgREST caps responses (1000 rows by default), so read in pages.
async function readAll<T>(table: string, columns: string, order: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order(order).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

type ProjectRow = { id: string } & Record<string, unknown>;
type UnitStatRow = { project_id: string; image_url: string | null; availability_status: string | null };

async function listProjects() {
  const [projects, units] = await Promise.all([
    readAll<ProjectRow>("projects", PROJECT_COLUMNS, "name"),
    readAll<UnitStatRow>("units", "id,project_id,image_url,availability_status", "id"),
  ]);
  const stats = new Map<string, { units: number; available: number; with_media: number }>();
  for (const unit of units ?? []) {
    const entry = stats.get(unit.project_id) ?? { units: 0, available: 0, with_media: 0 };
    entry.units += 1;
    if (unit.availability_status === "available") entry.available += 1;
    if (text(unit.image_url)) entry.with_media += 1;
    stats.set(unit.project_id, entry);
  }
  const { data: usage } = await db.rpc("media_admin_storage_usage");
  return {
    projects: (projects ?? []).map((project) => ({
      ...project,
      units_count: stats.get(project.id)?.units ?? 0,
      available_units: stats.get(project.id)?.available ?? 0,
      units_with_own_media: stats.get(project.id)?.with_media ?? 0,
    })),
    storage: usage?.[0] ?? usage ?? null,
  };
}

async function listUnits(body: Record<string, unknown>) {
  const projectId = text(body.project_id);
  if (!projectId) throw new HttpError(400, "project_id_required");
  const { data, error } = await db.from("units").select(UNIT_COLUMNS).eq("project_id", projectId).order("starting_price");
  if (error) throw error;
  return { units: data ?? [] };
}

async function loadTarget(target: string, id: string) {
  if (!id) throw new HttpError(400, "id_required");
  if (target === "project") {
    const { data } = await db.from("projects").select("id,name,slug,developer").eq("id", id).maybeSingle();
    if (!data) throw new HttpError(404, "project_not_found");
    return { project: data, unitId: "" };
  }
  if (target === "unit") {
    const { data: unit } = await db.from("units").select("id,project_id").eq("id", id).maybeSingle();
    if (!unit) throw new HttpError(404, "unit_not_found");
    const { data: project } = await db.from("projects").select("id,name,slug,developer").eq("id", unit.project_id).maybeSingle();
    if (!project) throw new HttpError(404, "project_not_found");
    return { project, unitId: unit.id as string };
  }
  throw new HttpError(400, "invalid_target");
}

async function signUpload(body: Record<string, unknown>) {
  const kind = text(body.kind);
  const rule = FILE_RULES[kind];
  if (!rule) throw new HttpError(400, "invalid_kind");
  const contentType = text(body.content_type).toLowerCase();
  const ext = rule.types[contentType];
  if (!ext) throw new HttpError(400, "unsupported_file_type");
  const size = Number(body.size) || 0;
  if (size <= 0 || size > rule.maxBytes) throw new HttpError(400, "file_too_large");

  const { project, unitId } = await loadTarget(text(body.target), text(body.id));
  const developerFolder = slugify(project.developer) || "developer";
  const projectPart = slugify(text(project.slug).split("--")[0] || project.name) || "project";
  const unitPart = unitId ? `-unit-${unitId.slice(0, 8)}` : "";
  const stamp = `${Date.now().toString(36)}${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4)}`;
  const kindPart = kind === "image" ? "" : `-${kind}`;
  const path = `${developerFolder}/${projectPart}/${rule.folder}${projectPart}${unitPart}${kindPart}-${stamp}.${ext}`;

  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("sign_failed");
  return { upload_url: data.signedUrl, path, public_url: `${PUBLIC_PREFIX}${path}` };
}

function cleanUrl(value: unknown, field: string) {
  const url = text(value);
  if (!url) return "";
  if (url.length > 2000 || url.includes(",") || !/^https:\/\/[^\s]+$/i.test(url)) throw new HttpError(400, `invalid_url:${field}`);
  return url;
}

async function saveMedia(body: Record<string, unknown>) {
  const target = text(body.target);
  const { project, unitId } = await loadTarget(target, text(body.id));
  const gallery = Array.isArray(body.gallery_urls) ? body.gallery_urls : [];
  if (gallery.length > MAX_GALLERY) throw new HttpError(400, "gallery_too_long");
  const galleryUrls = [...new Set(gallery.map((url) => cleanUrl(url, "gallery_urls")).filter(Boolean))];
  const cover = cleanUrl(body.image_url, "image_url");
  // Cover always leads the gallery, matching how existing rows are stored.
  const ordered = cover ? [cover, ...galleryUrls.filter((url) => url !== cover)] : galleryUrls;
  const patch = {
    image_url: cover || null,
    gallery_urls: ordered.length ? ordered.join(", ") : null,
    video_url: cleanUrl(body.video_url, "video_url") || null,
    brochure_url: cleanUrl(body.brochure_url, "brochure_url") || null,
  };

  const table = target === "project" ? "projects" : "units";
  const id = target === "project" ? project.id : unitId;
  const { data, error } = await db.from(table).update(patch).eq("id", id).select(target === "project" ? PROJECT_COLUMNS : UNIT_COLUMNS).single();
  if (error) throw error;
  return { saved: data };
}

async function getSetting(key: string) {
  const { data } = await db.from("media_admin_settings").select("value, updated_at").eq("key", key).maybeSingle();
  return data;
}

async function setSetting(key: string, value: string) {
  const { error } = await db.from("media_admin_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function settings() {
  const hook = await getSetting("netlify_build_hook");
  const last = await getSetting("last_rebuild_at");
  return { has_build_hook: Boolean(hook?.value), last_rebuild_at: last?.value || null };
}

async function saveSettings(body: Record<string, unknown>) {
  const hook = text(body.build_hook_url);
  if (!/^https:\/\/api\.netlify\.com\/build_hooks\/[a-zA-Z0-9]{10,}$/.test(hook)) throw new HttpError(400, "invalid_build_hook");
  await setSetting("netlify_build_hook", hook);
  return settings();
}

async function rebuild() {
  const hook = await getSetting("netlify_build_hook");
  if (!hook?.value) throw new HttpError(400, "build_hook_missing");
  const last = await getSetting("last_rebuild_at");
  if (last?.value && Date.now() - new Date(last.value).getTime() < 3 * 60 * 1000) throw new HttpError(429, "rebuild_too_soon");
  const response = await fetch(`${hook.value}?trigger_title=${encodeURIComponent("Media admin update")}`, { method: "POST" });
  if (!response.ok) throw new HttpError(502, "build_hook_failed");
  await setSetting("last_rebuild_at", new Date().toISOString());
  return settings();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = text(body.action);
    if (action === "login") return reply(await login(req, body));

    const tokenHash = await requireSession(req);
    switch (action) {
      case "logout":
        await db.from("media_admin_sessions").delete().eq("token_hash", tokenHash);
        return reply({ ok: true });
      case "projects":
        return reply(await listProjects());
      case "units":
        return reply(await listUnits(body));
      case "sign_upload":
        return reply(await signUpload(body));
      case "save":
        return reply(await saveMedia(body));
      case "settings":
        return reply(await settings());
      case "save_settings":
        return reply(await saveSettings(body));
      case "rebuild":
        return reply(await rebuild());
      default:
        return reply({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.code }, error.status);
    console.error(error);
    return reply({ error: "server_error" }, 500);
  }
});
