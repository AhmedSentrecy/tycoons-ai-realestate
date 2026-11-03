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
/** The 9 main areas (same list Claude uses and projects.area_group holds). */
const AREA_GROUPS = ["New Cairo", "Mostakbal City", "New Capital", "Sheikh Zayed", "October", "North Coast", "New Alamein", "Ain Sokhna", "Other"];
const MAX_GALLERY = 60;
const INBOX_COLUMNS =
  "id,created_at,updated_at,status,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,description,image_url,source_group,sender,message_id,match_unit_id,decided_at,result_unit_id,note,area_group";
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

interface ProjectRow { id: string; name: string; developer: string | null; location: string | null; area_group?: string | null }

async function allProjects(): Promise<ProjectRow[]> {
  const { data, error } = await db.from("projects").select("id,name,developer,location,area_group").limit(5000);
  fail(error);
  return (data ?? []) as ProjectRow[];
}

/** Names that are not a project name (Claude writes them when the message names none). */
const NO_NAME_KEYS = new Set(["", "needsprojectname", "unknown", "unknownproject", "na", "none"]);
const aliasKey = (name: unknown) => norm(text(name).split(" @ ")[0]);

/** WhatsApp names the admin already confirmed: alias key -> project id. */
async function allAliases(): Promise<Map<string, string>> {
  const { data, error } = await db.from("wa_project_aliases").select("alias_key,project_id").limit(10000);
  fail(error);
  return new Map(((data ?? []) as Json[]).map((row) => [text(row.alias_key), text(row.project_id)]));
}

/** Remembers "this WhatsApp name is that project" so the next units with the same name link by themselves. */
async function rememberAlias(name: unknown, projectId: string, userId: string | null) {
  const key = aliasKey(name);
  if (NO_NAME_KEYS.has(key) || key.length < 3) return false;
  const { data: project } = await db.from("projects").select("name").eq("id", projectId).maybeSingle();
  if (!project || norm(project.name) === key) return false;
  await db.from("wa_project_aliases").upsert({ alias_key: key, alias: text(name).slice(0, 300), project_id: projectId, created_by: userId });
  return true;
}

type SuggestKind = "phase" | "master" | "similar";
interface Suggestion { project_id: string; name: string; kind: SuggestKind }

/** Words of a name, for "similar name" suggestions. */
const words = (value: unknown) => new Set(text(value).toLowerCase().split(/[^a-z0-9\u0600-\u06ff]+/).filter((word) => word.length >= 3));

/**
 * The project an unmatched WhatsApp name most likely means (the admin confirms it):
 * phase  -> a project whose name the message name starts with, longest first ("Taj City - Origami Golf" -> "Taj City - Origami")
 * master -> the same, but the site only has the master project ("Sarai - Elan" -> "Sarai")
 * similar -> same developer and at least two words in common (most of the name)
 */
function suggestProject(all: ProjectRow[], name: string, developer: string, areaGroup = ""): Suggestion | null {
  const key = aliasKey(name);
  if (NO_NAME_KEYS.has(key) || key.length < 3) return null;
  const dev = norm(developer);
  const sameDev = (project: ProjectRow) => Boolean(dev && norm(project.developer) && (norm(project.developer).includes(dev) || dev.includes(norm(project.developer))));
  const prefix = all.filter((project) => { const pn = norm(project.name); return pn.length >= 4 && key.startsWith(pn); })
    .sort((a, b) => norm(b.name).length - norm(a.name).length || Number(sameDev(b)) - Number(sameDev(a)));
  if (prefix.length) {
    const best = prefix[0];
    const phase = text(best.name).includes(" - ") || norm(best.name).length >= key.length - 3;
    return { project_id: best.id, name: best.name, kind: phase ? "phase" : "master" };
  }
  const mine = words(name);
  if (!mine.size) return null;
  // A similar name in another main area is another project (Ivoire East is not Ivoire West).
  const projects = areaGroup && areaGroup !== "Other" ? all.filter((project) => !project.area_group || project.area_group === areaGroup || project.area_group === "Other") : all;
  let best: ProjectRow | null = null;
  let bestScore = 0;
  for (const project of projects) {
    if (!sameDev(project)) continue;
    const theirs = words(project.name);
    const common = [...mine].filter((word) => theirs.has(word)).length;
    const score = common / Math.max(mine.size, theirs.size, 1);
    if (common && score > bestScore) [best, bestScore] = [project, score];
  }
  return best && bestScore >= 0.5 && [...mine].filter((word) => words(best!.name).has(word)).length >= 2 ? { project_id: best.id, name: best.name, kind: "similar" } : null;
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
  return bestUnit((data ?? []) as Json[], unitType, area);
}

/**
 * Same type and area (less than 1 m² apart). The site often prefixes the project to the type
 * ("MV 1.1 - Millennial" vs "Millennial"), so one name ending with the other also counts.
 */
function sameType(a: unknown, b: unknown) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 4 && (x.endsWith(y) || y.endsWith(x)));
}

function bestUnit(units: Json[], unitType: string, area: number | null): string | null {
  if (!area) return null;
  const same = units.filter((unit) => sameType(unit.unit_type, unitType) && Math.abs(Number(unit.area_sqm) - area) < 1);
  same.sort((a, b) => Number(b.availability_status === "available") - Number(a.availability_status === "available")
    || Number(norm(b.unit_type) === norm(unitType)) - Number(norm(a.unit_type) === norm(unitType)));
  return same.length ? text(same[0].id) : null;
}

// ---------- filling gaps ----------

/** Unit details a WhatsApp message often leaves out. */
const FILL_FIELDS = ["down_payment_text", "installments_text", "delivery_text", "finishing"] as const;
const PROJECT_FILL_FIELDS = new Set(["down_payment_text", "installments_text", "delivery_text", "finishing"]);
type FillSource = "unit" | "project" | "units";

/** Most frequent non-empty value of one field (ties: the first seen). */
function mostCommon(units: Json[], field: string): string {
  const counts = new Map<string, number>();
  for (const unit of units) {
    const value = text(unit[field]);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [value, count] of counts) if (count > bestCount) [best, bestCount] = [value, count];
  return best;
}

/**
 * Fills the details the message left empty, never the ones it gave:
 * 1. the unit on the site this one updates, 2. the project's own down payment / installments /
 * delivery, 3. the most common value among the project's units of the same type (or of all its
 * units when they all agree). Answer: field -> where the value came from.
 */
function fillGaps(row: Json, match: Json | null, project: Json | null, units: Json[]): Record<string, FillSource> {
  const filled: Record<string, FillSource> = {};
  const sameTypeUnits = units.filter((unit) => sameType(unit.unit_type, row.unit_type));
  for (const field of FILL_FIELDS) {
    if (text(row[field])) continue;
    let value = text(match?.[field]);
    let source: FillSource = "unit";
    if (!value && project && PROJECT_FILL_FIELDS.has(field)) {
      value = text(project[field]);
      source = "project";
    }
    if (!value) {
      value = mostCommon(sameTypeUnits, field);
      if (!value) {
        const all = new Set(units.map((unit) => text(unit[field])).filter(Boolean));
        if (all.size === 1) value = [...all][0];
      }
      source = "units";
    }
    if (value) {
      row[field] = value;
      filled[field] = source;
    }
  }
  return filled;
}

/** Same unit and price as one already rejected: shown with a "rejected before" badge. */
const rejectKey = (row: Json) =>
  [text(row.project_id) || norm(row.project_name), norm(row.unit_type), norm(row.bedrooms_text), Math.round(Number(row.area_sqm) || 0), Math.round(Number(row.starting_price) || 0)].join("|");

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
  values.area_group = AREA_GROUPS.includes(text(body.area_group)) ? text(body.area_group) : null;
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
  const aliased = (await allAliases()).get(aliasKey(values.project_name));
  const project = (aliased ? projects.find((row) => row.id === aliased) : null) ?? matchProject(projects, text(values.project_name), text(values.developer));
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
  const autoFilled: Record<string, Record<string, FillSource>> = {};
  const previouslyRejected: Record<string, string> = {};
  const suggestions: Record<string, Suggestion> = {};
  const finishingSuggestions: Record<string, string> = {};
  if (status === "pending") {
    // Unmatched units: a name the admin already confirmed links by itself (saved), otherwise the
    // most likely project is suggested for one-click confirmation.
    const unmatched = rows.filter((row) => !text(row.project_id));
    if (unmatched.length) {
      const [projects, aliases] = await Promise.all([allProjects(), allAliases()]);
      for (const row of unmatched) {
        const aliased = aliases.get(aliasKey(row.project_name));
        const project = aliased ? projects.find((item) => item.id === aliased) : null;
        if (project) {
          const linked = { project_id: project.id, project_name: project.name, developer: project.developer, updated_at: new Date().toISOString() };
          const { error: linkError } = await db.from("wa_unit_inbox").update(linked).eq("id", Number(row.id)).eq("status", "pending");
          if (!linkError) Object.assign(row, linked, { location: row.location || project.location });
          continue;
        }
        const suggestion = suggestProject(projects, text(row.project_name), text(row.developer), text(row.area_group));
        if (suggestion) suggestions[String(row.id)] = suggestion;
      }
    }
    // Units saved before a match existed (or before the better type match) get one now, and the
    // details the message left out are filled from the site (shown to the admin as auto-filled).
    const projectIds = [...new Set(rows.map((row) => text(row.project_id)).filter(Boolean))];
    if (projectIds.length) {
      const [{ data: units, error: unitsError }, { data: projects, error: projectsError }] = await Promise.all([
        db.from("units").select(`id,project_id,unit_type,area_sqm,availability_status,${FILL_FIELDS.join(",")}`).in("project_id", projectIds).limit(10000),
        db.from("projects").select("id,down_payment_text,installments_text,delivery_text,finishing").in("id", projectIds),
      ]);
      fail(unitsError);
      fail(projectsError);
      const projectById = new Map(((projects ?? []) as Json[]).map((project) => [text(project.id), project]));
      for (const row of rows) {
        if (!text(row.project_id)) continue;
        const own = ((units ?? []) as Json[]).filter((unit) => unit.project_id === row.project_id);
        if (!text(row.match_unit_id) && Number(row.area_sqm) > 0) row.match_unit_id = bestUnit(own, text(row.unit_type), Number(row.area_sqm));
        const match = own.find((unit) => unit.id === row.match_unit_id) ?? null;
        const filled = fillGaps(row, match, projectById.get(text(row.project_id)) ?? null, own);
        if (Object.keys(filled).length) autoFilled[String(row.id)] = filled;
      }
      // A project with no default finishing whose units on the site all have the same one:
      // suggested as the project's default (the admin confirms it in the project header).
      for (const id of projectIds) {
        if (text(projectById.get(id)?.finishing)) continue;
        const values = ((units ?? []) as Json[]).filter((unit) => unit.project_id === id).map((unit) => text(unit.finishing)).filter(Boolean);
        if (values.length >= 2 && new Set(values.map((value) => value.toLowerCase())).size === 1) finishingSuggestions[id] = values[0];
      }
    }
    const { data: rejected, error: rejectedError } = await db.from("wa_unit_inbox")
      .select("project_id,project_name,unit_type,bedrooms_text,area_sqm,starting_price,decided_at").eq("status", "rejected")
      .order("decided_at", { ascending: false }).limit(5000);
    fail(rejectedError);
    const rejectedAt = new Map<string, string>();
    for (const row of (rejected ?? []) as Json[]) if (!rejectedAt.has(rejectKey(row))) rejectedAt.set(rejectKey(row), text(row.decided_at));
    for (const row of rows) {
      const when = rejectedAt.get(rejectKey(row));
      if (when) previouslyRejected[String(row.id)] = when;
    }
  }
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
  return { items: rows, matches, counts, duplicates: findDuplicates(rows), auto_filled: autoFilled, previously_rejected: previouslyRejected,
    suggestions, finishing_suggestions: finishingSuggestions };
}

/**
 * Same unit sent more than once (another group or another message) before anyone decided:
 * same project, type, bedrooms and area (less than 1 m² apart). Answer: inbox id -> the other ids.
 */
function findDuplicates(rows: Json[]) {
  const groups = new Map<string, Json[]>();
  for (const row of rows) {
    const area = Number(row.area_sqm);
    const project = text(row.project_id) || norm(row.project_name);
    if (!project || !norm(row.unit_type) || !(area > 0)) continue;
    const key = [project, norm(row.unit_type), norm(row.bedrooms_text), Math.round(area)].join("|");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const out: Record<string, number[]> = {};
  for (const list of groups.values()) {
    if (list.length < 2 || new Set(list.map((row) => text(row.message_id) || String(row.id))).size < 2) continue;
    for (const row of list) out[String(row.id)] = list.filter((other) => other.id !== row.id).map((other) => Number(other.id));
  }
  return out;
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

async function save(body: Json, user: AdminUser | null = null) {
  const item = await loadInbox(body.id);
  if (item.status !== "pending") throw new HttpError(409, "already_decided");
  const edits = cleanEdits((body.values as Json) ?? {});
  if (edits.project_id) {
    const { data: project } = await db.from("projects").select("id,name,developer").eq("id", text(edits.project_id)).maybeSingle();
    if (!project) throw new HttpError(404, "project_not_found");
    edits.project_name = project.name;
    edits.developer = project.developer;
    // The admin picked the project by hand for a name the site did not know: remember it.
    if (!text(item.project_id)) await rememberAlias(item.project_name, text(edits.project_id), user?.id ?? null).catch(() => false);
  }
  edits.updated_at = new Date().toISOString();
  const { data, error } = await db.from("wa_unit_inbox").update(edits).eq("id", Number(item.id)).select(INBOX_COLUMNS).single();
  fail(error);
  return { item: data };
}

async function approve(user: AdminUser, body: Json) {
  const saved = (await save(body, user)).item as Json;
  const { data: project } = await db.from("projects").select("id,name,developer,location").eq("id", text(saved.project_id)).maybeSingle();
  if (!project) throw new HttpError(400, "project_required");
  if (!text(saved.unit_type)) throw new HttpError(400, "unit_type_required");
  if (!saved.area_sqm) throw new HttpError(400, "area_required");
  if (!saved.starting_price) throw new HttpError(400, "price_required");
  const status = APPROVE_STATUSES.includes(text(body.availability_status)) ? text(body.availability_status) : "available";

  const replaceId = text(body.replace_unit_id);
  // Same gap filling the admin saw in the list (quick approve sends no values).
  const { data: projectRows } = await db.from("projects").select("id,down_payment_text,installments_text,delivery_text,finishing").eq("id", project.id).maybeSingle();
  const { data: siteUnits } = await db.from("units").select(`id,project_id,unit_type,area_sqm,availability_status,${FILL_FIELDS.join(",")}`).eq("project_id", project.id).limit(2000);
  const own = (siteUnits ?? []) as Json[];
  fillGaps(saved, own.find((unit) => unit.id === replaceId) ?? null, (projectRows ?? null) as Json | null, own);

  const unitValues: Json = { area_sqm: Number(saved.area_sqm), starting_price: Number(saved.starting_price), availability_status: status };
  for (const field of UNIT_TEXT_FIELDS) {
    const value = text(saved[field]);
    // An update never erases what the unit already has: an empty field keeps the old value.
    if (value || !replaceId) unitValues[field] = value || null;
  }
  if (!replaceId || unitValues.location !== undefined) unitValues.location = unitValues.location || project.location || "Egypt";
  // Photos the admin picked from the project's Supabase photos (cover first, same format as the media editor).
  const picked = [...new Set([body.image_url, ...(Array.isArray(body.gallery_urls) ? body.gallery_urls : [])].map(text).filter(Boolean))];
  if (picked.length > MAX_GALLERY) throw new HttpError(400, "gallery_too_long");
  if (picked.some((url) => url.length > 2000 || url.includes(",") || !/^https:\/\/[^\s]+$/i.test(url))) throw new HttpError(400, "invalid_image_url");
  if (picked.length) {
    unitValues.image_url = picked[0];
    unitValues.gallery_urls = picked.join(", ");
  }

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

/**
 * The admin confirmed (or picked) the project of an unmatched unit: every pending unit with the same
 * WhatsApp name is linked to it, and the name is remembered for the units that come later.
 */
async function linkProject(user: AdminUser, body: Json) {
  const item = await loadInbox(body.id);
  if (item.status !== "pending") throw new HttpError(409, "already_decided");
  const projectId = text(body.project_id);
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new HttpError(400, "project_id_invalid");
  const { data: project } = await db.from("projects").select("id,name,developer,location").eq("id", projectId).maybeSingle();
  if (!project) throw new HttpError(404, "project_not_found");
  const key = aliasKey(item.project_name);
  const { data: pending, error } = await db.from("wa_unit_inbox").select("id,project_name,project_id").eq("status", "pending").limit(2000);
  fail(error);
  const sameName = NO_NAME_KEYS.has(key) ? [] : ((pending ?? []) as Json[]).filter((row) => !text(row.project_id) && aliasKey(row.project_name) === key);
  const ids = [...new Set([Number(item.id), ...sameName.map((row) => Number(row.id))])];
  const now = new Date().toISOString();
  fail((await db.from("wa_unit_inbox").update({ project_id: project.id, project_name: project.name, developer: project.developer, updated_at: now }).in("id", ids).eq("status", "pending")).error);
  const remembered = body.remember === false ? false : await rememberAlias(item.project_name, project.id, user.id);
  return { ok: true, linked: ids.length, remembered };
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
      case "save": return reply(await save(body, user));
      case "approve": return reply(await approve(user, body));
      case "reject": return reply(await reject(user, body));
      case "link_project": return reply(await linkProject(user, body));
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
