// Supabase Edge Function: wa-inbox
// Units extracted from WhatsApp developer groups wait here until an admin approves them.
//
// Two kinds of callers:
// - Make.com (header x-waha-key or x-intake-key, see requireIntake):
//     track  -> registers the WhatsApp group and answers { track } (false = skip this group)
//     intake -> stores one extracted unit as "pending" (duplicates of the same message are ignored)
//     intake_batch -> same for every unit in Claude's answer for one message (units_json)
// - The admin page (header x-admin-token, same sessions as tycoons-admin):
//     list, save, approve, reject, groups, group_toggle
// Approve writes to public.units through admin_apply_ops and logs the change in
// admin_change_requests, exactly like a manual edit in the units tab.
// Table: public.wa_unit_inbox, public.wa_groups (see migration.sql). Deploy with verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-admin-token, x-intake-key, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
type Json = Record<string, unknown>;
interface AdminUser { id: string; role: string; display_name: string }

const TEXT_FIELDS = ["project_name", "developer", "location", "unit_type", "bedrooms_text", "down_payment_text", "installments_text", "delivery_text", "finishing", "description"] as const;
const UNIT_TEXT_FIELDS = ["location", "unit_type", "bedrooms_text", "down_payment_text", "installments_text", "delivery_text", "finishing", "description"] as const;
const APPROVE_STATUSES = ["available", "new_launch"];
const INBOX_COLUMNS =
  "id,created_at,updated_at,status,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,description,image_url,source_group,sender,message_id,match_unit_id,decided_at,result_unit_id,note";
const UNIT_COLUMNS =
  "id,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,availability_status,description,last_updated_at";

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
/** Lower-case letters and digits only, so "Mountain View 1.1" == "mountainview11". */
const norm = (value: unknown) => text(value).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9؀-ۿ]+/g, "");

function timingSafeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** "12,500,000", "12500000 EGP", 12500000 -> 12500000. Anything else (or <= 0) -> null. */
function positiveNumber(value: unknown): number | null {
  const raw = text(value).replace(/[,\s٬]/g, "").replace(/[^\d.]/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// ---------- auth ----------

/**
 * Make proves itself with either key:
 * - x-intake-key: media_admin_settings.wa_inbox_key
 * - x-waha-key: the WAHA API key Make already holds. It is checked once against the WAHA server
 *   (media_admin_settings.wa_waha_base_url) and only its SHA-256 is remembered (wa_waha_key_hash),
 *   so no new secret has to be copied into Make.
 */
async function requireIntake(req: Request) {
  const { data, error } = await db.from("media_admin_settings").select("key,value").in("key", ["wa_inbox_key", "wa_waha_key_hash", "wa_waha_base_url"]);
  if (error) throw new HttpError(503, "settings_unavailable");
  const setting = (key: string) => text((data ?? []).find((row) => row.key === key)?.value);
  const intakeKey = text(req.headers.get("x-intake-key"));
  if (intakeKey && timingSafeEqual(intakeKey, setting("wa_inbox_key"))) return;
  const wahaKey = text(req.headers.get("x-waha-key"));
  if (wahaKey.length >= 16) {
    const hash = await sha256(wahaKey);
    if (timingSafeEqual(hash, setting("wa_waha_key_hash"))) return;
    const base = setting("wa_waha_base_url");
    if (/^https?:\/\/[^\s]+$/i.test(base)) {
      const check = await fetch(`${base.replace(/\/+$/, "")}/api/sessions`, { headers: { "X-Api-Key": wahaKey }, signal: AbortSignal.timeout(8000) }).catch(() => null);
      if (check?.ok) {
        await db.from("media_admin_settings").upsert({ key: "wa_waha_key_hash", value: hash, updated_at: new Date().toISOString() });
        return;
      }
    }
  }
  throw new HttpError(401, "intake_key_invalid");
}

async function requireUser(req: Request): Promise<AdminUser> {
  const token = text(req.headers.get("x-admin-token"));
  if (token.length < 32) throw new HttpError(401, "login_required");
  // A failed lookup is a temporary server problem, not a logout (see tycoons-admin).
  const { data: session, error: sessionError } = await db.from("media_admin_sessions").select("user_id, expires_at").eq("token_hash", await sha256(token)).maybeSingle();
  if (sessionError) throw new HttpError(503, "session_check_failed");
  if (!session?.user_id || new Date(session.expires_at).getTime() < Date.now()) throw new HttpError(401, "login_required");
  const { data: user, error: userError } = await db.from("admin_users").select("id,role,display_name,active").eq("id", session.user_id).maybeSingle();
  if (userError) throw new HttpError(503, "session_check_failed");
  if (!user?.active) throw new HttpError(401, "login_required");
  return user as AdminUser;
}

// ---------- matching ----------

interface ProjectRow { id: string; name: string; developer: string | null; location: string | null }

async function allProjects(): Promise<ProjectRow[]> {
  const { data, error } = await db.from("projects").select("id,name,developer,location").limit(5000);
  fail(error);
  return (data ?? []) as ProjectRow[];
}

/** Same project name (ignoring spaces/case/punctuation); a developer match breaks ties. */
function matchProject(projects: ProjectRow[], name: string, developer: string): ProjectRow | null {
  const key = norm(name.split(" @ ")[0]);
  if (!key) return null;
  let candidates = projects.filter((project) => norm(project.name) === key);
  if (!candidates.length) candidates = projects.filter((project) => key.length >= 5 && norm(project.name).startsWith(key));
  if (candidates.length <= 1) return candidates[0] ?? null;
  const dev = norm(developer);
  return candidates.find((project) => dev && (norm(project.developer).includes(dev) || dev.includes(norm(project.developer)))) ?? candidates[0];
}

/** An existing unit of the same type and area in the project (the one approval would replace). */
async function matchUnit(projectId: string, unitType: string, area: number | null): Promise<string | null> {
  if (!area) return null;
  const { data, error } = await db.from("units").select("id,unit_type,area_sqm,availability_status").eq("project_id", projectId).limit(1000);
  fail(error);
  const type = norm(unitType);
  const same = ((data ?? []) as Json[]).filter((unit) => norm(unit.unit_type) === type && Math.abs(Number(unit.area_sqm) - area) < 1);
  same.sort((a, b) => Number(b.availability_status === "available") - Number(a.availability_status === "available"));
  return same.length ? text(same[0].id) : null;
}

// ---------- Make.com ----------

/** Group subject straight from WAHA (GOWS answers Name, WEBJS answers subject). */
async function wahaGroupName(req: Request, groupId: string): Promise<string | null> {
  const key = text(req.headers.get("x-waha-key"));
  if (!key) return null;
  const { data } = await db.from("media_admin_settings").select("value").eq("key", "wa_waha_base_url").maybeSingle();
  const base = text(data?.value).replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) return null;
  const response = await fetch(`${base}/api/default/groups/${encodeURIComponent(groupId)}`, { headers: { "X-Api-Key": key }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!response?.ok) return null;
  const group = (await response.json().catch(() => ({}))) as Json;
  return text(group.subject || group.Name || group.name || (group.groupMetadata as Json | undefined)?.subject).slice(0, 300) || null;
}

async function track(req: Request, body: Json) {
  const groupId = text(body.group_id).slice(0, 200);
  if (!groupId) throw new HttpError(400, "group_id_required");
  const given = text(body.group_name).slice(0, 300);
  let name: string | null = given && given !== groupId ? given : null;
  const { data: existing, error } = await db.from("wa_groups").select("group_id,name,track,messages").eq("group_id", groupId).maybeSingle();
  fail(error);
  if (!name && !existing?.name) name = await wahaGroupName(req, groupId);
  if (!existing) {
    fail((await db.from("wa_groups").insert({ group_id: groupId, name, track: true, messages: 1 })).error);
    return { track: true, new_group: true };
  }
  await db.from("wa_groups").update({ name: name || existing.name, last_seen_at: new Date().toISOString(), messages: Number(existing.messages || 0) + 1 }).eq("group_id", groupId);
  return { track: Boolean(existing.track), new_group: false };
}

async function intake(body: Json) {
  const values: Json = {};
  for (const field of TEXT_FIELDS) values[field] = text(body[field]).slice(0, 2000) || null;
  values.project_name = text(values.project_name).split(" @ ")[0].trim() || null;
  values.area_sqm = positiveNumber(body.area_sqm);
  values.starting_price = positiveNumber(body.starting_price);
  const image = text(body.image_url || body.media_url);
  values.image_url = /^https?:\/\/[^\s]+$/i.test(image) ? image.slice(0, 2000) : null;
  values.source_group = text(body.source_group).slice(0, 300) || null;
  values.source_group_id = text(body.source_group_id).slice(0, 200) || null;
  values.sender = text(body.sender).slice(0, 300) || null;
  values.message_id = text(body.message_id).slice(0, 300) || null;
  if (!values.unit_type && !values.project_name) return { stored: false, reason: "empty" };
  // Groups switched off in the admin are ignored even if Make still sends them.
  if (values.source_group_id) {
    const { data: group } = await db.from("wa_groups").select("track,name").eq("group_id", values.source_group_id).maybeSingle();
    if (group && group.track === false) return { stored: false, reason: "group_off" };
    if (!values.source_group && group?.name) values.source_group = group.name;
  }

  const projects = await allProjects();
  const project = matchProject(projects, text(values.project_name), text(values.developer));
  if (project) {
    values.project_id = project.id;
    values.project_name = project.name;
    values.developer = project.developer;
    values.location = values.location || project.location;
    values.match_unit_id = await matchUnit(project.id, text(values.unit_type), values.area_sqm as number | null);
  }
  values.dedupe_key = values.message_id
    ? await sha256([values.message_id, norm(values.project_name), norm(values.unit_type), norm(values.bedrooms_text), values.area_sqm ?? "", values.starting_price ?? ""].join("|"))
    : null;

  const { data, error } = await db.from("wa_unit_inbox").upsert(values, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id");
  fail(error);
  return { stored: Boolean(data?.length), id: data?.[0]?.id ?? null, project_matched: Boolean(project), replaces_unit: values.match_unit_id ?? null };
}

/**
 * One call per WhatsApp message: units_json is Claude's raw answer ({"units":[...]}), the other
 * form fields describe the message. Each unit goes through intake() on its own.
 */
async function intakeBatch(body: Json) {
  // Make blanks form values that look like JSON, so Make sends Claude's answer base64-encoded (units_b64).
  let raw = text(body.units_json);
  if (!raw && text(body.units_b64)) {
    try {
      raw = new TextDecoder().decode(Uint8Array.from(atob(text(body.units_b64)), (char) => char.charCodeAt(0)));
    } catch {
      throw new HttpError(400, "units_b64_invalid");
    }
  }
  if (!raw) console.warn("intake_batch without units", JSON.stringify(Object.fromEntries(Object.entries(body).map(([key, value]) => [key, text(value).length]))));
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    throw new HttpError(400, "units_json_invalid");
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray((parsed as Json)?.units) ? ((parsed as Json).units as unknown[]) : [];
  const meta = {
    source_group: body.source_group, source_group_id: body.source_group_id, sender: body.sender,
    message_id: body.message_id, image_url: body.image_url || body.media_url,
  };
  const results = [];
  for (const raw of list.slice(0, 100)) {
    if (!raw || typeof raw !== "object") continue;
    results.push(await intake({ ...(raw as Json), ...meta }));
  }
  return { units: list.length, stored: results.filter((result) => result.stored).length, results };
}

// ---------- admin ----------

async function list(body: Json) {
  const status = ["pending", "approved", "rejected"].includes(text(body.status)) ? text(body.status) : "pending";
  const { data, error } = await db.from("wa_unit_inbox").select(INBOX_COLUMNS).eq("status", status)
    .order(status === "pending" ? "created_at" : "decided_at", { ascending: false }).limit(status === "pending" ? 1000 : 200);
  fail(error);
  const rows = (data ?? []) as Json[];
  const ids = [...new Set(rows.map((row) => text(row.match_unit_id)).filter(Boolean))];
  let matches: Json[] = [];
  if (ids.length) {
    const result = await db.from("units").select(UNIT_COLUMNS).in("id", ids);
    fail(result.error);
    matches = (result.data ?? []) as Json[];
  }
  const counts: Record<string, number> = {};
  for (const key of ["pending", "approved", "rejected"]) {
    const { count } = await db.from("wa_unit_inbox").select("id", { count: "exact", head: true }).eq("status", key);
    counts[key] = count ?? 0;
  }
  return { items: rows, matches, counts };
}

async function loadInbox(id: unknown) {
  const { data, error } = await db.from("wa_unit_inbox").select(INBOX_COLUMNS).eq("id", Number(id)).maybeSingle();
  fail(error);
  if (!data) throw new HttpError(404, "inbox_item_not_found");
  return data as Json;
}

/** Fields the admin may edit before approving. */
function cleanEdits(input: Json) {
  const out: Json = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
  for (const field of TEXT_FIELDS) if (has(field)) out[field] = text(input[field]).slice(0, 2000) || null;
  if (has("area_sqm")) out.area_sqm = positiveNumber(input.area_sqm);
  if (has("starting_price")) out.starting_price = positiveNumber(input.starting_price);
  if (has("project_id")) {
    const id = text(input.project_id);
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "project_id_invalid");
    out.project_id = id || null;
  }
  if (has("match_unit_id")) {
    const id = text(input.match_unit_id);
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "unit_id_invalid");
    out.match_unit_id = id || null;
  }
  return out;
}

async function save(body: Json) {
  const item = await loadInbox(body.id);
  if (item.status !== "pending") throw new HttpError(409, "already_decided");
  const edits = cleanEdits((body.values as Json) ?? {});
  if (edits.project_id) {
    const { data: project } = await db.from("projects").select("id,name,developer").eq("id", text(edits.project_id)).maybeSingle();
    if (!project) throw new HttpError(404, "project_not_found");
    edits.project_name = project.name;
    edits.developer = project.developer;
  }
  edits.updated_at = new Date().toISOString();
  const { data, error } = await db.from("wa_unit_inbox").update(edits).eq("id", Number(item.id)).select(INBOX_COLUMNS).single();
  fail(error);
  return { item: data };
}

async function approve(user: AdminUser, body: Json) {
  const saved = (await save(body)).item as Json;
  const { data: project } = await db.from("projects").select("id,name,developer,location").eq("id", text(saved.project_id)).maybeSingle();
  if (!project) throw new HttpError(400, "project_required");
  if (!text(saved.unit_type)) throw new HttpError(400, "unit_type_required");
  if (!saved.area_sqm) throw new HttpError(400, "area_required");
  if (!saved.starting_price) throw new HttpError(400, "price_required");
  const status = APPROVE_STATUSES.includes(text(body.availability_status)) ? text(body.availability_status) : "available";

  const unitValues: Json = { area_sqm: Number(saved.area_sqm), starting_price: Number(saved.starting_price), availability_status: status };
  for (const field of UNIT_TEXT_FIELDS) unitValues[field] = text(saved[field]) || null;
  unitValues.location = unitValues.location || project.location || "Egypt";

  const replaceId = text(body.replace_unit_id);
  const label = `${unitValues.unit_type}${unitValues.area_sqm ? ` ${unitValues.area_sqm} م²` : ""} في ${project.name}`;
  let ops: Json[];
  let before: unknown = null;
  let action: "create" | "update" = "create";
  if (replaceId) {
    const { data: unit } = await db.from("units").select(UNIT_COLUMNS).eq("id", replaceId).eq("project_id", project.id).maybeSingle();
    if (!unit) throw new HttpError(404, "unit_not_found");
    before = unit;
    action = "update";
    ops = [{ op: "update", id: replaceId, values: unitValues }];
  } else {
    ops = [{ op: "create", values: { ...unitValues, project_id: project.id, project_name: project.name, developer: project.developer } }];
  }
  const { data: result, error } = await db.rpc("admin_apply_ops", { ops });
  if (error) throw new HttpError(409, `apply_failed:${error.message}`);
  const now = new Date().toISOString();
  await db.from("admin_change_requests").insert({
    entity: "unit", action, target_id: replaceId || null, project_id: project.id,
    summary: `واتساب (${text(saved.source_group) || "جروب"}): ${action === "update" ? "تحديث" : "وحدة جديدة"} ${label}`,
    ops, before, created_by: user.id, status: "approved", reviewed_by: user.id, reviewed_at: now, result,
  }).then(() => undefined, () => undefined);
  const unitId = replaceId || text(((result as Json)?.created_ids as unknown[] | undefined)?.[0]);
  fail((await db.from("wa_unit_inbox").update({ status: "approved", decided_by: user.id, decided_at: now, result_unit_id: unitId || null, updated_at: now }).eq("id", Number(saved.id))).error);
  return { ok: true, unit_id: unitId, action };
}

async function reject(user: AdminUser, body: Json) {
  const ids = (Array.isArray(body.ids) ? body.ids : [body.id]).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 500);
  if (!ids.length) throw new HttpError(400, "id_required");
  const now = new Date().toISOString();
  const { data, error } = await db.from("wa_unit_inbox")
    .update({ status: "rejected", decided_by: user.id, decided_at: now, updated_at: now, note: text(body.note).slice(0, 500) || null })
    .in("id", ids).eq("status", "pending").select("id");
  fail(error);
  return { ok: true, rejected: data?.length ?? 0 };
}

async function groups() {
  const { data, error } = await db.from("wa_groups").select("group_id,name,track,first_seen_at,last_seen_at,messages").order("last_seen_at", { ascending: false });
  fail(error);
  return { groups: data ?? [] };
}

async function groupToggle(body: Json) {
  const groupId = text(body.group_id);
  if (!groupId) throw new HttpError(400, "group_id_required");
  const { data, error } = await db.from("wa_groups").update({ track: Boolean(body.track) }).eq("group_id", groupId).select("group_id,track");
  fail(error);
  if (!data?.length) throw new HttpError(404, "group_not_found");
  return groups();
}

/** Make sends form fields (application/x-www-form-urlencoded); the admin page sends JSON. */
async function readBody(req: Request): Promise<Json> {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === "string" ? value : ""]));
  }
  return ((await req.json().catch(() => ({}))) ?? {}) as Json;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const body = await readBody(req);
    const action = text(body.action);
    if (action === "track" || action === "intake" || action === "intake_batch") {
      await requireIntake(req);
      if (action === "track") return reply(await track(req, body));
      return reply(action === "intake" ? await intake(body) : await intakeBatch(body));
    }
    const user = await requireUser(req);
    switch (action) {
      case "list": return reply(await list(body));
      case "save": return reply(await save(body));
      case "approve": return reply(await approve(user, body));
      case "reject": return reply(await reject(user, body));
      case "groups": return reply(await groups());
      case "group_toggle": return reply(await groupToggle(body));
      default: return reply({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.code }, error.status);
    console.error(error);
    return reply({ error: "server_error" }, 500);
  }
});
