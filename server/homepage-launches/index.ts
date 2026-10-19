// Supabase Edge Function: homepage-launches
// Admin API for the homepage "بتتطرح دلوقتي" carousel. Same login sessions as tycoons-admin
// (x-admin-token -> media_admin_sessions). Stores the choice per project in
// projects.targeting.homepage_launch = { rank, badge, image_url }; the homepage reads it publicly.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-admin-token, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const BADGES = ["جديد", "استلام فوري", "متاح الآن", "طرح جديد"];
type Json = Record<string, unknown>;

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const text = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());
const fail = (error: { message?: string } | null) => { if (error) throw new Error(error.message || "db_error"); };
const sha256 = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");

async function requireUser(req: Request) {
  const token = text(req.headers.get("x-admin-token"));
  if (token.length < 32) throw new HttpError(401, "login_required");
  // A failed lookup is a temporary server problem, not a logout (see tycoons-admin).
  const { data: session, error: sessionError } = await db.from("media_admin_sessions").select("user_id, expires_at").eq("token_hash", await sha256(token)).maybeSingle();
  if (sessionError) throw new HttpError(503, "session_check_failed");
  if (!session?.user_id || new Date(session.expires_at).getTime() < Date.now()) throw new HttpError(401, "login_required");
  const { data: user, error: userError } = await db.from("admin_users").select("id,role,active").eq("id", session.user_id).maybeSingle();
  if (userError) throw new HttpError(503, "session_check_failed");
  if (!user?.active) throw new HttpError(401, "login_required");
  return user as { id: string; role: string };
}

async function list() {
  const { data, error } = await db.from("projects").select("id,name,targeting").not("targeting->homepage_launch", "is", null);
  fail(error);
  const items = ((data ?? []) as Json[]).map((row) => {
    const launch = (((row.targeting as Json) ?? {}).homepage_launch ?? {}) as Json;
    return { project_id: text(row.id), name: text(row.name), rank: Number(launch.rank) || 0, badge: text(launch.badge), image_url: text(launch.image_url) };
  }).sort((a, b) => a.rank - b.rank);
  return { items, badges: BADGES };
}

async function save(user: { id: string; role: string }, body: Json) {
  const raw = Array.isArray(body.items) ? body.items : [];
  if (raw.length > 12) throw new HttpError(400, "too_many_launches");
  const items = raw.map((value, index) => {
    const item = (value && typeof value === "object" ? value : {}) as Json;
    const projectId = text(item.project_id);
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new HttpError(400, "project_id_invalid");
    const badge = BADGES.includes(text(item.badge)) ? text(item.badge) : BADGES[0];
    const image = text(item.image_url).slice(0, 600);
    if (image && !/^https:\/\/[^\s"'<>]+$/i.test(image)) throw new HttpError(400, "image_url_invalid");
    return { project_id: projectId, rank: index + 1, badge, image_url: image };
  });
  if (new Set(items.map((item) => item.project_id)).size !== items.length) throw new HttpError(400, "duplicate_project");
  const keep = new Set(items.map((item) => item.project_id));
  const { data: current, error } = await db.from("projects").select("id,targeting").not("targeting->homepage_launch", "is", null);
  fail(error);
  const before = ((current ?? []) as Json[]).map((row) => ({ project_id: text(row.id), ...((((row.targeting as Json) ?? {}).homepage_launch ?? {}) as Json) }));
  for (const row of (current ?? []) as Json[]) {
    if (keep.has(text(row.id))) continue;
    const { homepage_launch: _removed, ...rest } = ((row.targeting && typeof row.targeting === "object" ? row.targeting : {}) as Json);
    fail((await db.from("projects").update({ targeting: rest }).eq("id", text(row.id))).error);
  }
  for (const item of items) {
    const { data: row, error: readError } = await db.from("projects").select("id,targeting").eq("id", item.project_id).maybeSingle();
    if (readError || !row) throw new HttpError(404, "project_not_found");
    const targeting = ((row as Json).targeting && typeof (row as Json).targeting === "object" ? (row as Json).targeting : {}) as Json;
    fail((await db.from("projects").update({ targeting: { ...targeting, homepage_launch: { rank: item.rank, badge: item.badge, image_url: item.image_url } } }).eq("id", item.project_id)).error);
  }
  const now = new Date().toISOString();
  await db.from("admin_change_requests").insert({
    entity: "project", action: "update", target_id: items[0]?.project_id ?? null, project_id: items[0]?.project_id ?? null,
    summary: `مشاريع "بتتطرح دلوقتي" في الصفحة الرئيسية (${items.length} مشروع)`,
    ops: [], before: { homepage_launch: before },
    created_by: user.id, status: "approved", reviewed_by: user.role === "owner" ? user.id : null, reviewed_at: now,
    result: { homepage_launch: items.length },
  }).then(() => undefined, () => undefined);
  return list();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const user = await requireUser(req);
    const action = text(body.action);
    if (action === "homepage_launches") return reply(await list());
    if (action === "homepage_launches_save") return reply(await save(user, body));
    return reply({ error: "unknown_action" }, 400);
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.code }, error.status);
    console.error(error);
    return reply({ error: "server_error" }, 500);
  }
});
