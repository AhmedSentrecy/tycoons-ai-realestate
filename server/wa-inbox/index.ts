// Supabase Edge Function: wa-inbox
// Units extracted from WhatsApp developer groups wait here until an admin approves them.
//
// Two kinds of callers:
// - Make.com (header x-waha-key or x-intake-key, see requireIntake):
//     track  -> registers the WhatsApp group and answers { track } (false = skip this group)
//     intake -> stores one extracted unit as "pending" (duplicates of the same message are ignored)
//     intake_batch -> same for every unit in Claude's answer for one message (units_json)
// - The admin page (header x-admin-token, same sessions as tycoons-admin):
//     list, save, approve, approve_ready, reject, groups, group_toggle, group_developer, auto_approve_save, photo_confirm,
//     photo_suggest, photo_suggest_approve, photo_suggest_reject,
//     draft_save, draft_reject, draft_research, publish_draft
// pg_cron (x-intake-key): research_run -> groups new WhatsApp names and researches new projects
// Approve writes to public.units through admin_apply_ops and logs the change in
// admin_change_requests, exactly like a manual edit in the units tab.
// Table: public.wa_unit_inbox, public.wa_groups (see migration.sql). Deploy with verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2";
import { canonicalDeveloper, cleanDeveloperName, developerKey, developersByProject, doubtsFor, groupNameDeveloper, hasProjectName, isUnknownDeveloper, projectKey, resolveDeveloper, type DeveloperRow, type Doubt } from "./review.ts";
import {
  DRAFT_FIELDS, GROUPING_SCHEMA, candidateValue, checkedValue, developerCheckPrompt, draftDoubts, firstJson, groupingCheckPrompt, groupingPrompt, projectCheckPrompt, researchPrompt, searchedUrls, unitSummary, verifyFacts, verifyGrouping,
  type DraftField, type NameCount,
} from "./research.ts";

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
  "id,created_at,updated_at,status,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,description,image_url,source_group,source_group_id,sender,message_id,match_unit_id,decided_at,result_unit_id,note,area_group,draft_id,suggested_project_id,web_filled,web_candidates";
const DRAFT_COLUMNS =
  "id,created_at,updated_at,status,name,name_ar,developer,area_group,sub_area,location,description,down_payment_text,installments_text,delivery_text,finishing,wa_keys,sources,doubts,confirmed,research_error,researched_at,project_id,published_at,candidates";
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

interface ProjectRow { id: string; name: string; developer: string | null; location: string | null; area_group?: string | null; slug?: string | null }

/**
 * 60 projects exist twice: an old row without a page (no slug, no units) and the live one with a
 * page and all the units. Matching always prefers the live row so units land where the site has them.
 */
const live = (project: ProjectRow) => Number(Boolean(text(project.slug)));

async function allProjects(): Promise<ProjectRow[]> {
  const { data, error } = await db.from("projects").select("id,name,developer,location,area_group,slug").limit(5000);
  fail(error);
  return (data ?? []) as ProjectRow[];
}

async function allDevelopers(): Promise<DeveloperRow[]> {
  const { data, error } = await db.from("developers").select("name,aliases").limit(2000);
  fail(error);
  return (data ?? []) as DeveloperRow[];
}

/**
 * The usual developer of a WhatsApp group: the one the admin set (wa_groups.developer), else the
 * developer named in the group's title when the site knows it ("Concrete 🤝 Tai Tycoons" -> Concrete Developments).
 */
async function groupDevelopers(developers: DeveloperRow[]): Promise<Map<string, string>> {
  const { data, error } = await db.from("wa_groups").select("group_id,name,developer").limit(2000);
  fail(error);
  return new Map(((data ?? []) as Json[]).map((group) => [
    text(group.group_id),
    text(group.developer) || canonicalDeveloper(groupNameDeveloper(group.name), developers),
  ]));
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

type SuggestKind = "phase" | "master" | "similar" | "ai";
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
    .sort((a, b) => norm(b.name).length - norm(a.name).length || Number(sameDev(b)) - Number(sameDev(a)) || live(b) - live(a));
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
    if (common && (score > bestScore || (score === bestScore && best && live(project) > live(best)))) [best, bestScore] = [project, score];
  }
  return best && bestScore >= 0.5 && [...mine].filter((word) => words(best!.name).has(word)).length >= 2 ? { project_id: best.id, name: best.name, kind: "similar" } : null;
}

/** Same project name (ignoring spaces/case/punctuation); a developer match breaks ties. */
function matchProject(projects: ProjectRow[], name: string, developer: string): ProjectRow | null {
  const key = norm(name.split(" @ ")[0]);
  if (!key) return null;
  let candidates = projects.filter((project) => norm(project.name) === key);
  // Same name without "The" or a trailing area ("The 101" == "101", "KOR New Capital" == "KOR").
  const loose = projectKey(name);
  if (!candidates.length && loose.length >= 3) candidates = projects.filter((project) => projectKey(project.name) === loose);
  if (!candidates.length) candidates = projects.filter((project) => key.length >= 5 && norm(project.name).startsWith(key));
  if (candidates.length <= 1) return candidates[0] ?? null;
  const dev = norm(developer);
  const sameDev = (project: ProjectRow) => Number(Boolean(dev && (norm(project.developer).includes(dev) || dev.includes(norm(project.developer)))));
  // Same developer first, then the live row (with a page) over its old duplicate.
  return [...candidates].sort((a, b) => sameDev(b) - sameDev(a) || live(b) - live(a))[0];
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
type FillSource = "unit" | "project" | "units" | "web";

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
  // What Claude read, before any matching or the admin's edits (for the reading review).
  values.original = Object.fromEntries(
    [...TEXT_FIELDS, "area_sqm", "starting_price", "area_group"].map((field) => [field, values[field] ?? null]).filter(([, value]) => value !== null),
  );
  // Groups switched off in the admin are ignored even if Make still sends them.
  if (values.source_group_id) {
    const { data: group } = await db.from("wa_groups").select("track,name").eq("group_id", values.source_group_id).maybeSingle();
    if (group && group.track === false) return { stored: false, reason: "group_off" };
    if (!values.source_group && group?.name) values.source_group = group.name;
  }
  // Developer spelled the site's way; the group's usual developer when the message names none.
  const developers = await allDevelopers();
  const groupDev = values.source_group_id ? (await groupDevelopers(developers)).get(text(values.source_group_id)) ?? "" : "";
  values.developer = resolveDeveloper(values.developer, groupDev, developers).developer || null;

  const projects = await allProjects();
  const aliased = (await allAliases()).get(aliasKey(values.project_name));
  const project = (aliased ? projects.find((row) => row.id === aliased) : null) ?? matchProject(projects, text(values.project_name), text(values.developer));
  if (project) {
    values.project_id = project.id;
    values.project_name = project.name;
    values.developer = project.developer;
    values.location = values.location || project.location;
    values.match_unit_id = await matchUnit(project.id, text(values.unit_type), values.area_sqm as number | null);
  } else {
    // A new project already being researched (or waiting for «انشر») under another spelling.
    values.draft_id = await draftForName(text(values.project_name), text(values.developer));
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
  const projectAreas = new Set<string>();
  /** Site projects that have at least one photo (a unit without its own photos shows the project's). */
  const projectPhotos = new Set<string>();
  if (status === "pending") {
    // Unmatched units: a name the admin already confirmed links by itself (saved), otherwise the
    // most likely project is suggested for one-click confirmation.
    const unmatched = rows.filter((row) => !text(row.project_id));
    if (unmatched.length) {
      const [projects, aliases, developers] = await Promise.all([allProjects(), allAliases(), allDevelopers()]);
      const groupDev = await groupDevelopers(developers);
      for (const row of unmatched) {
        // Units saved before the group's developer was known: fill it now (only when the message named none).
        const resolved = resolveDeveloper(row.developer, groupDev.get(text(row.source_group_id)) ?? "", developers);
        if (resolved.developer && resolved.developer !== text(row.developer)) {
          const { error: devError } = await db.from("wa_unit_inbox").update({ developer: resolved.developer, updated_at: new Date().toISOString() }).eq("id", Number(row.id)).eq("status", "pending");
          if (!devError) row.developer = resolved.developer;
        }
        const aliased = aliases.get(aliasKey(row.project_name));
        const project = aliased ? projects.find((item) => item.id === aliased) : null;
        if (project) {
          const linked = { project_id: project.id, project_name: project.name, developer: project.developer, updated_at: new Date().toISOString() };
          const { error: linkError } = await db.from("wa_unit_inbox").update(linked).eq("id", Number(row.id)).eq("status", "pending");
          if (!linkError) Object.assign(row, linked, { location: row.location || project.location });
          continue;
        }
        const suggestion = suggestProject(projects, text(row.project_name), text(row.developer), text(row.area_group));
        // Claude's grouping thought this name is a site project (research_run): one-click confirm too.
        const ai = text(row.suggested_project_id) ? projects.find((item) => item.id === text(row.suggested_project_id)) : null;
        if (suggestion) suggestions[String(row.id)] = suggestion;
        else if (ai) suggestions[String(row.id)] = { project_id: ai.id, name: ai.name, kind: "ai" };
      }
    }
    // Units saved before a match existed (or before the better type match) get one now, and the
    // details the message left out are filled from the site (shown to the admin as auto-filled).
    const projectIds = [...new Set(rows.map((row) => text(row.project_id)).filter(Boolean))];
    if (projectIds.length) {
      const [{ data: units, error: unitsError }, { data: projects, error: projectsError }] = await Promise.all([
        db.from("units").select(`id,project_id,unit_type,area_sqm,availability_status,${FILL_FIELDS.join(",")}`).in("project_id", projectIds).limit(10000),
        db.from("projects").select("id,down_payment_text,installments_text,delivery_text,finishing,area_group,image_url,gallery_urls").in("id", projectIds),
      ]);
      fail(unitsError);
      fail(projectsError);
      const projectById = new Map(((projects ?? []) as Json[]).map((project) => [text(project.id), project]));
      for (const project of projectById.values()) if (text(project.area_group)) projectAreas.add(text(project.id));
      for (const project of projectById.values()) if (hasPhotos(project)) projectPhotos.add(text(project.id));
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
  // New projects (drafts): their facts fill the units' gaps, and their status decides the units' readiness.
  const drafts: Record<string, Json> = {};
  const draftIds = [...new Set(rows.map((row) => text(row.draft_id)).filter(Boolean))];
  if (draftIds.length) {
    const { data: draftRows, error: draftError } = await db.from("wa_project_drafts").select(DRAFT_COLUMNS).in("id", draftIds);
    fail(draftError);
    for (const draft of (draftRows ?? []) as Json[]) drafts[text(draft.id)] = draft;
    if (status === "pending") {
      for (const row of rows) {
        const draft = drafts[text(row.draft_id)];
        if (!draft || text(row.project_id)) continue;
        // Only facts with 2 sources or confirmed by the admin (a weak fact is shown on the draft, not used).
        const trusted: Json = {};
        const sources = (draft.sources ?? {}) as Record<string, unknown>;
        const confirmed = new Set(((draft.confirmed as string[]) ?? []).map(text));
        for (const field of FILL_FIELDS) if (confirmed.has(field) || (Array.isArray(sources[field]) && (sources[field] as unknown[]).length >= 2)) trusted[field] = draft[field];
        const filled = fillGaps(row, null, trusted, []);
        if (Object.keys(filled).length) autoFilled[String(row.id)] = { ...(autoFilled[String(row.id)] ?? {}), ...filled };
      }
    }
  }
  // Details the web filled (2 sites) for a project's missing facts: shown as «من النت».
  for (const row of rows) {
    const web = (row.web_filled ?? {}) as Record<string, unknown>;
    for (const field of Object.keys(web)) {
      if (!text(row[field])) continue;
      autoFilled[String(row.id)] = { ...(autoFilled[String(row.id)] ?? {}), [field]: "web" };
    }
  }
  const duplicates = findDuplicates(rows);
  // Ready = every detail present and nothing doubtful (one click, or all at once); the rest wait in "مراجعة" with the reasons.
  const doubts: Record<string, Doubt[]> = {};
  if (status === "pending") {
    const matchPrice = new Map(matches.map((unit) => [text(unit.id), Number(unit.starting_price) || 0]));
    const ctx = {
      hasProject: (row: Json) => Boolean(text(row.project_id)),
      draftStatus: (row: Json) => text(drafts[text(row.draft_id)]?.status),
      suggested: new Set(Object.keys(suggestions)),
      duplicates,
      rejectedBefore: previouslyRejected,
      developersByKey: developersByProject(rows),
      replacedPrice: new Map(rows.filter((row) => matchPrice.get(text(row.match_unit_id))).map((row) => [String(row.id), matchPrice.get(text(row.match_unit_id))!])),
      hasArea: (row: Json) =>
        text(row.project_id) ? projectAreas.has(text(row.project_id)) : Boolean(text(drafts[text(row.draft_id)]?.area_group) || text(row.area_group)),
    };
    for (const row of rows) doubts[String(row.id)] = doubtsFor(row, ctx);
  }
  // Ready units that would go on the site with no photo at all: the project has none and the site unit
  // they update has none. They are not approved automatically; the admin sees which projects need photos.
  const noPhotos: Record<string, true> = {};
  const photoGaps: { project_id: string; name: string; developer: string; waiting: number }[] = [];
  if (status === "pending") {
    const unitsWithPhotos = new Set<string>();
    const matchIds = [...new Set(rows.map((row) => text(row.match_unit_id)).filter(Boolean))];
    for (let start = 0; start < matchIds.length; start += 200) {
      const { data: photoRows, error: photoError } = await db.from("units").select("id,image_url,gallery_urls").in("id", matchIds.slice(start, start + 200));
      fail(photoError);
      for (const unit of (photoRows ?? []) as Json[]) if (hasPhotos(unit)) unitsWithPhotos.add(text(unit.id));
    }
    const gaps = new Map<string, number>();
    for (const row of rows) {
      const projectId = text(row.project_id);
      if (!projectId || projectPhotos.has(projectId) || unitsWithPhotos.has(text(row.match_unit_id))) continue;
      noPhotos[String(row.id)] = true;
      if (!(doubts[String(row.id)] ?? []).length) gaps.set(projectId, (gaps.get(projectId) ?? 0) + 1);
    }
    if (gaps.size) {
      const { data: gapProjects, error: gapError } = await db.from("projects").select("id,name,developer").in("id", [...gaps.keys()]);
      fail(gapError);
      for (const project of (gapProjects ?? []) as Json[]) {
        photoGaps.push({ project_id: text(project.id), name: text(project.name), developer: text(project.developer), waiting: gaps.get(text(project.id)) ?? 0 });
      }
      photoGaps.sort((a, b) => b.waiting - a.waiting || a.name.localeCompare(b.name));
    }
  }
  const counts: Record<string, number> = {};
  for (const key of ["pending", "approved", "rejected"]) {
    const { count } = await db.from("wa_unit_inbox").select("id", { count: "exact", head: true }).eq("status", key);
    counts[key] = count ?? 0;
  }
  return { items: rows, matches, counts, duplicates, auto_filled: autoFilled, previously_rejected: previouslyRejected,
    suggestions, finishing_suggestions: finishingSuggestions, doubts, drafts,
    no_photos: noPhotos, photo_gaps: photoGaps, photo_checks: status === "pending" ? await currentPhotoChecks(rows) : {},
    photo_suggestions: status === "pending" ? Object.fromEntries(await latestSuggestions(photoGaps.map((gap) => gap.project_id))) : {},
    auto_approve: status === "pending" ? await autoApproveState() : undefined };
}

/** A project or unit has a photo when its cover or its gallery holds at least one URL. */
function hasPhotos(row: Json) {
  return Boolean(text(row.image_url) || text(row.gallery_urls).split(",").some((url) => url.trim()));
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
    summary: `واتساب${body.auto === true ? " تلقائي" : ""} (${text(saved.source_group) || "جروب"}): ${action === "update" ? "تحديث" : "وحدة جديدة"} ${label}`,
    ops, before, created_by: user.id, status: "approved", reviewed_by: user.id, reviewed_at: now, result,
  }).then(() => undefined, () => undefined);
  const unitId = replaceId || text(((result as Json)?.created_ids as unknown[] | undefined)?.[0]);
  fail((await db.from("wa_unit_inbox").update({ status: "approved", decided_by: user.id, decided_at: now, result_unit_id: unitId || null, updated_at: now }).eq("id", Number(saved.id))).error);
  return { ok: true, unit_id: unitId, action };
}

/**
 * "وافق على الكل" in "جاهز للموافقة": approves the given units, but only the ones that are still ready
 * when the server checks again (nothing missing, nothing doubtful). Each one is approved exactly like
 * a single "وافق" (updates the matched site unit, or adds a new one). Answer: what was approved and what was skipped.
 */
async function approveReady(user: AdminUser, body: Json) {
  const wanted = new Set((Array.isArray(body.ids) ? body.ids : []).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 300));
  if (!wanted.size) throw new HttpError(400, "id_required");
  const current = await list({ status: "pending" });
  const approved: number[] = [];
  const skipped: { id: number; reason: string }[] = [];
  for (const row of current.items) {
    const id = Number(row.id);
    if (!wanted.has(id)) continue;
    wanted.delete(id);
    const reasons = current.doubts[String(id)] ?? [];
    // A new project's units go on the site with the project («انشر»), not one by one.
    if (text(row.draft_id) && !text(row.project_id)) {
      skipped.push({ id, reason: "publish_draft" });
      continue;
    }
    if (reasons.length) {
      skipped.push({ id, reason: reasons.join(",") });
      continue;
    }
    try {
      await approve(user, { id, values: {}, replace_unit_id: text(row.match_unit_id), availability_status: "available" });
      approved.push(id);
    } catch (error) {
      skipped.push({ id, reason: error instanceof HttpError ? error.code : "approve_failed" });
    }
  }
  for (const id of wanted) skipped.push({ id, reason: "not_pending" });
  return { ok: true, approved: approved.length, approved_ids: approved, skipped };
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
  const { data, error } = await db.from("wa_groups").select("group_id,name,track,developer,first_seen_at,last_seen_at,messages").order("last_seen_at", { ascending: false });
  fail(error);
  return { groups: data ?? [] };
}

/** The admin sets (or clears) a group's usual developer in "الجروبات". */
async function groupDeveloper(body: Json) {
  const groupId = text(body.group_id);
  if (!groupId) throw new HttpError(400, "group_id_required");
  const { data, error } = await db.from("wa_groups").update({ developer: text(body.developer).slice(0, 200) || null }).eq("group_id", groupId).select("group_id");
  fail(error);
  if (!data?.length) throw new HttpError(404, "group_not_found");
  return groups();
}

async function groupToggle(body: Json) {
  const groupId = text(body.group_id);
  if (!groupId) throw new HttpError(400, "group_id_required");
  const { data, error } = await db.from("wa_groups").update({ track: Boolean(body.track) }).eq("group_id", groupId).select("group_id,track");
  fail(error);
  if (!data?.length) throw new HttpError(404, "group_not_found");
  return groups();
}

// ---------- new projects (drafts) ----------
//
// Units whose project is not on the site: Claude groups the WhatsApp spellings of one project, researches
// it on the web (each fact from 2 different sites) and keeps it as a draft in wa_project_drafts. Nothing
// is on the site until the admin presses «انشر» (publish_draft).

const ACTIVE_DRAFT = ["researching", "ready", "needs_review"];
const MODEL = "claude-sonnet-5-5";
const GROUP_BUCKETS_PER_RUN = 6;
const RESEARCH_PER_RUN = 2;
/** Web checks of unsure groupings per run (new names first, then older drafts still marked unsure). */
const GROUP_CHECKS_PER_RUN = 3;
/** Web checks of unit doubts (developer, project name, a site project's missing facts) per run. */
const UNIT_CHECKS_PER_RUN = 4;

/** Developer key, "" for "Unknown" / "Needs developer name". */
const knownDevKey = (developer: unknown) => (isUnknownDeveloper(developer) ? "" : developerKey(developer));

/** The open draft this WhatsApp name belongs to (same spelling key, same or unknown developer). */
async function draftForName(name: string, developer: string): Promise<string | null> {
  const key = projectKey(name);
  if (!key) return null;
  const { data, error } = await db.from("wa_project_drafts").select("id,developer").in("status", ACTIVE_DRAFT).contains("wa_keys", [key]).limit(5);
  fail(error);
  const dev = knownDevKey(developer);
  const rows = (data ?? []) as Json[];
  const same = rows.find((row) => !dev || !knownDevKey(row.developer) || knownDevKey(row.developer) === dev);
  return same ? text(same.id) : null;
}

async function claudeKey(): Promise<string> {
  const env = Deno.env.get("ANTHROPIC_API_KEY");
  if (env) return env;
  const { data } = await db.from("media_admin_settings").select("value").eq("key", "anthropic_api_key").maybeSingle();
  const key = text(data?.value);
  if (!key) throw new Error("ANTHROPIC_API_KEY_missing");
  return key;
}

/** One Claude call. With search: the web_search tool (paused turns are continued); answer = text + searched URLs. */
async function askClaude(prompt: string, options: { schema?: Json; search?: number; maxTokens?: number }): Promise<{ text: string; searched: Set<string> }> {
  const key = await claudeKey();
  const body: Json = {
    model: MODEL,
    max_tokens: options.maxTokens ?? 8000,
    messages: [{ role: "user", content: prompt }],
  };
  if (options.schema) body.output_config = { format: { type: "json_schema", schema: options.schema } };
  // No user_location: the search tool does not accept EG (Egypt is in the prompt instead).
  if (options.search) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: options.search }];
  const content: Json[] = [];
  for (let turn = 0; turn < 4; turn++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(turn ? { ...body, messages: [...(body.messages as Json[]), { role: "assistant", content }] } : body),
      signal: AbortSignal.timeout(150_000),
    });
    const data = (await response.json().catch(() => ({}))) as Json;
    if (!response.ok) throw new Error(`claude_${response.status}:${text((data.error as Json | undefined)?.message).slice(0, 200)}`);
    content.push(...((data.content as Json[]) ?? []));
    if (data.stop_reason !== "pause_turn") break;
  }
  const textOut = content.filter((block) => block.type === "text").map((block) => text(block.text)).join("\n");
  return { text: textOut, searched: searchedUrls(content) };
}

/**
 * Claude was unsure the names are one project: each name is searched on the web. The answer is used only
 * when 2 different sites show every project (verifyGrouping); otherwise null and the admin decides.
 */
async function checkGroupingOnWeb(developer: string, waNames: string[]) {
  try {
    const reply = await askClaude(groupingCheckPrompt(developer, waNames), { search: 5, maxTokens: 6000 });
    return verifyGrouping(firstJson(reply.text), reply.searched, waNames);
  } catch (error) {
    console.error("wa grouping check failed", developer, error);
    return null;
  }
}

/** Pending units without a site project and without a draft, that have a project name. */
async function loosePending(): Promise<Json[]> {
  const { data, error } = await db.from("wa_unit_inbox").select(INBOX_COLUMNS).eq("status", "pending").is("project_id", null).is("draft_id", null).limit(3000);
  fail(error);
  return ((data ?? []) as Json[]).filter((row) => hasProjectName(row.project_name));
}

/**
 * Step 1: per developer, Claude groups the WhatsApp spellings into projects. A group that is a site
 * project becomes a suggestion (the admin confirms it); a group that is a draft joins it; the rest
 * becomes a new draft waiting for research.
 */
async function groupNewNames(): Promise<{ buckets: number; drafts_created: number; linked: number; web_checks: number }> {
  const rows = await loosePending();
  // Units saved before the group's developer was known ("Unknown"): the group's developer, else none.
  const developers = await allDevelopers();
  const groupDev = await groupDevelopers(developers);
  for (const row of rows) {
    if (!isUnknownDeveloper(row.developer)) continue;
    const resolved = groupDev.get(text(row.source_group_id)) ?? "";
    if (resolved || text(row.developer)) {
      fail((await db.from("wa_unit_inbox").update({ developer: resolved || null }).eq("id", Number(row.id)).eq("status", "pending")).error);
      row.developer = resolved || null;
    }
  }
  // Units that a draft already covers (another spelling arrived after the draft was made).
  const { data: open, error: openError } = await db.from("wa_project_drafts").select("id,developer,wa_keys").in("status", ACTIVE_DRAFT).limit(1000);
  fail(openError);
  const draftByKey = (name: unknown, developer: unknown) => {
    const key = projectKey(name);
    const dev = knownDevKey(developer);
    const hit = ((open ?? []) as Json[]).find((draft) => ((draft.wa_keys as string[]) ?? []).includes(key) && (!dev || !knownDevKey(draft.developer) || knownDevKey(draft.developer) === dev));
    return hit ? text(hit.id) : "";
  };
  let linked = 0;
  for (const row of rows) {
    const draftId = draftByKey(row.project_name, row.developer);
    if (draftId) {
      fail((await db.from("wa_unit_inbox").update({ draft_id: draftId }).eq("id", Number(row.id)).eq("status", "pending")).error);
      row.draft_id = draftId;
      linked++;
    }
  }
  const byDeveloper = new Map<string, Json[]>();
  for (const row of rows) {
    if (row.draft_id || row.suggested_project_id) continue;
    // No known developer: one bucket per WhatsApp group (never one big "unknown" bucket).
    const dev = knownDevKey(row.developer) || `group:${text(row.source_group_id)}`;
    byDeveloper.set(dev, [...(byDeveloper.get(dev) ?? []), row]);
  }
  const projects = await allProjects();
  let created = 0;
  let buckets = 0;
  let checks = 0;
  for (const list of [...byDeveloper.values()].sort((a, b) => b.length - a.length).slice(0, GROUP_BUCKETS_PER_RUN)) {
    buckets++;
    const developer = text(list.find((row) => knownDevKey(row.developer))?.developer);
    const dev = knownDevKey(developer);
    const names = new Map<string, NameCount>();
    for (const row of list) {
      const name = text(row.project_name);
      const current = names.get(name) ?? { name, count: 0, location: text(row.location).slice(0, 80) };
      current.count++;
      names.set(name, current);
    }
    const site = dev ? projects.filter((project) => text(project.slug) && developerKey(project.developer) === dev).map((project) => ({ id: project.id, name: project.name })) : [];
    const { data: draftRows } = await db.from("wa_project_drafts").select("id,name,developer").in("status", ACTIVE_DRAFT).limit(500);
    const drafts = ((draftRows ?? []) as Json[]).filter((draft) => !dev || developerKey(draft.developer) === dev).map((draft) => ({ id: text(draft.id), name: text(draft.name) }));
    let answer: Json;
    try {
      const reply = await askClaude(groupingPrompt(developer, [...names.values()], site, drafts), { schema: GROUPING_SCHEMA, maxTokens: 6000 });
      answer = JSON.parse(reply.text || "{}") as Json;
    } catch (error) {
      console.error("wa grouping failed", developer, error);
      continue;
    }
    // Unsure groups of 2+ names: the web decides (one project or several); undecided ones stay unsure.
    const groups: Json[] = [];
    for (const group of (Array.isArray(answer.projects) ? answer.projects : []) as Json[]) {
      const waNames = (Array.isArray(group.wa_names) ? group.wa_names : []).map(text).filter((name) => names.has(name));
      if (group.sure === false && waNames.length >= 2 && checks < GROUP_CHECKS_PER_RUN) {
        checks++;
        const settled = await checkGroupingOnWeb(developer, waNames);
        if (settled) {
          for (const part of settled) groups.push({ name: part.name, wa_names: part.wa_names, site_project_id: "", draft_id: "", sure: true, web_checked: true });
          continue;
        }
        group.web_checked = true;
      }
      groups.push(group);
    }
    for (const group of groups) {
      const waNames = (Array.isArray(group.wa_names) ? group.wa_names : []).map(text).filter((name) => names.has(name));
      if (!waNames.length) continue;
      const ids = list.filter((row) => waNames.includes(text(row.project_name))).map((row) => Number(row.id));
      const keys = [...new Set([...waNames, text(group.name)].map(projectKey).filter(Boolean))];
      const siteId = text(group.site_project_id);
      if (siteId && site.some((project) => project.id === siteId)) {
        fail((await db.from("wa_unit_inbox").update({ suggested_project_id: siteId }).in("id", ids).eq("status", "pending")).error);
        continue;
      }
      let draftId = text(group.draft_id);
      if (draftId && drafts.some((draft) => draft.id === draftId)) {
        const { data: draft } = await db.from("wa_project_drafts").select("wa_keys").eq("id", draftId).maybeSingle();
        const merged = [...new Set([...(((draft?.wa_keys as string[]) ?? [])), ...keys])];
        fail((await db.from("wa_project_drafts").update({ wa_keys: merged, updated_at: new Date().toISOString() }).eq("id", draftId)).error);
      } else {
        const { data: draft, error } = await db.from("wa_project_drafts").insert({
          name: text(group.name).slice(0, 200) || waNames[0], developer: developer || null, wa_keys: keys, status: "researching",
          doubts: group.sure === false ? ["grouping_unsure"] : [],
          grouping_checked_at: group.web_checked ? new Date().toISOString() : null,
        }).select("id").single();
        fail(error);
        draftId = text(draft.id);
        created++;
      }
      fail((await db.from("wa_unit_inbox").update({ draft_id: draftId }).in("id", ids).eq("status", "pending")).error);
    }
  }
  return { buckets, drafts_created: created, linked, web_checks: checks };
}

/**
 * Drafts still marked «grouping_unsure» that the web never checked (made before this check, or over the
 * run's limit): each is checked once. One project -> the doubt goes. Several -> the draft keeps the first
 * project, each other one becomes its own draft with its units, and the kept draft is researched again.
 */
async function recheckUnsureDrafts(limit: number) {
  if (limit <= 0) return 0;
  const { data, error } = await db.from("wa_project_drafts").select(DRAFT_COLUMNS).in("status", ACTIVE_DRAFT)
    .contains("doubts", ["grouping_unsure"]).is("grouping_checked_at", null).order("created_at", { ascending: true }).limit(limit);
  fail(error);
  let done = 0;
  for (const draft of (data ?? []) as Json[]) {
    const id = text(draft.id);
    const now = new Date().toISOString();
    const { data: units } = await db.from("wa_unit_inbox").select("id,project_name").eq("draft_id", id).eq("status", "pending").limit(500);
    const list = (units ?? []) as Json[];
    const waNames = [...new Set(list.map((row) => text(row.project_name)).filter(Boolean))];
    done++;
    const settled = waNames.length >= 2 ? await checkGroupingOnWeb(text(draft.developer), waNames) : null;
    if (!settled) {
      fail((await db.from("wa_project_drafts").update({ grouping_checked_at: now }).eq("id", id)).error);
      continue;
    }
    const nameKey = projectKey(draft.name);
    const keep = settled.find((part) => part.wa_names.some((name) => projectKey(name) === nameKey)) ?? settled[0];
    const doubts = ((draft.doubts as string[]) ?? []).filter((doubt) => doubt !== "grouping_unsure");
    const split = settled.length > 1;
    const keepKeys = [...new Set([...keep.wa_names, keep.name].map(projectKey).filter(Boolean))];
    // Already researched and not split: its status is worked out again without the grouping doubt.
    const after = !split && text(draft.status) !== "researching" ? draftState({ ...draft, doubts }, { groupingSure: true }) : null;
    fail((await db.from("wa_project_drafts").update({
      grouping_checked_at: now, doubts: after ? after.doubts : doubts, updated_at: now,
      ...(after ? { status: after.status } : {}),
      ...(split ? { wa_keys: keepKeys, status: "researching" } : {}),
    }).eq("id", id)).error);
    for (const part of settled) {
      if (part === keep) continue;
      const { data: created, error: createError } = await db.from("wa_project_drafts").insert({
        name: part.name, developer: draft.developer || null, status: "researching", grouping_checked_at: now,
        wa_keys: [...new Set([...part.wa_names, part.name].map(projectKey).filter(Boolean))],
      }).select("id").single();
      fail(createError);
      const ids = list.filter((row) => part.wa_names.includes(text(row.project_name))).map((row) => Number(row.id));
      if (ids.length) fail((await db.from("wa_unit_inbox").update({ draft_id: text(created.id) }).in("id", ids).eq("status", "pending")).error);
    }
  }
  return done;
}

/** Saves what the web said without 2 sites on the units (web_candidates), next to what they already have. */
async function keepCandidates(rows: Json[], add: Json) {
  for (const row of rows) {
    const current = (row.web_candidates ?? {}) as Json;
    const next = { ...current, ...add, fields: { ...((current.fields ?? {}) as Json), ...((add.fields ?? {}) as Json) } };
    if (!Object.keys(next.fields).length) delete (next as Json).fields;
    fail((await db.from("wa_unit_inbox").update({ web_candidates: next }).eq("id", Number(row.id)).eq("status", "pending")).error);
    row.web_candidates = next;
  }
}

/**
 * Unit doubts about the project or the developer, settled on the web (2 sites) before the admin sees them.
 * Each unit is checked once (web_checked_at); what the web cannot settle stays a doubt for the admin.
 * 1. developer unknown, or one project under several developers -> who develops the project
 * 2. no project name -> which of the developer's projects (the group's developer, without «Tai Tycoons»)
 * 3. a site project's unit still missing down payment / installments / delivery / finishing -> the project's facts
 */
async function resolveUnitDoubts(limit: number): Promise<{ checks: number; developers: number; projects: number; filled: number }> {
  const result = { checks: 0, developers: 0, projects: 0, filled: 0 };
  if (limit <= 0) return result;
  const { data, error } = await db.from("wa_unit_inbox").select(`${INBOX_COLUMNS},web_checked_at`).eq("status", "pending").is("web_checked_at", null).limit(3000);
  fail(error);
  const rows = (data ?? []) as Json[];
  if (!rows.length) return result;
  const developers = await allDevelopers();
  const groupDev = await groupDevelopers(developers);
  const projects = await allProjects();
  const now = new Date().toISOString();
  const markChecked = async (ids: number[]) => {
    if (ids.length) fail((await db.from("wa_unit_inbox").update({ web_checked_at: now }).in("id", ids)).error);
  };
  const loose = rows.filter((row) => !text(row.project_id) && !text(row.draft_id));
  const devHint = (row: Json) => {
    const own = isUnknownDeveloper(row.developer) ? "" : cleanDeveloperName(row.developer);
    return own || groupDev.get(text(row.source_group_id)) || cleanDeveloperName(groupNameDeveloper(row.source_group));
  };

  // 1. who develops the project (one search per project name)
  const devsByKey = developersByProject(loose);
  const needDev = new Map<string, Json[]>();
  for (const row of loose) {
    if (!hasProjectName(row.project_name)) continue;
    const key = projectKey(row.project_name);
    if (isUnknownDeveloper(row.developer) || (devsByKey.get(key)?.size ?? 0) > 1) needDev.set(key, [...(needDev.get(key) ?? []), row]);
  }
  for (const list of needDev.values()) {
    if (result.checks >= limit) break;
    result.checks++;
    const hints = [...new Set(list.map(devHint).concat(list.map((row) => text(row.location))).filter(Boolean))].slice(0, 4);
    try {
      const reply = await askClaude(developerCheckPrompt(text(list[0].project_name), hints), { search: 4, maxTokens: 4000 });
      const found = checkedValue(firstJson(reply.text), "developer", reply.searched);
      if (found) {
        const name = cleanDeveloperName(found.value);
        const known = canonicalDeveloper(name, developers) || [...groupDev.values()].find((dev) => developerKey(dev) === developerKey(name)) || name;
        fail((await db.from("wa_unit_inbox").update({ developer: known }).in("id", list.map((row) => Number(row.id))).eq("status", "pending")).error);
        result.developers += list.length;
      } else {
        // One site only: shown next to the unit as a suggestion the admin accepts with one click.
        const maybe = candidateValue(firstJson(reply.text), "developer", reply.searched);
        if (maybe) await keepCandidates(list, { developer: { ...maybe, value: cleanDeveloperName(maybe.value) } });
      }
    } catch (error) {
      console.error("wa developer check failed", list[0].project_name, error);
    }
    await markChecked(list.map((row) => Number(row.id)));
  }

  // 2. which project (one search per WhatsApp message)
  const needName = new Map<string, Json[]>();
  for (const row of loose) {
    if (hasProjectName(row.project_name)) continue;
    const key = text(row.message_id) || `id:${text(row.id)}`;
    needName.set(key, [...(needName.get(key) ?? []), row]);
  }
  for (const list of needName.values()) {
    if (result.checks >= limit) break;
    const developer = devHint(list[0]);
    if (!developer) {
      await markChecked(list.map((row) => Number(row.id))); // nothing to search with: the admin decides
      continue;
    }
    result.checks++;
    let body = "";
    if (text(list[0].message_id)) {
      const { data: log } = await db.from("wa_message_log").select("body").eq("message_id", text(list[0].message_id)).maybeSingle();
      body = text(log?.body);
    }
    try {
      const reply = await askClaude(projectCheckPrompt(developer, list.slice(0, 8).map(unitSummary), body), { search: 5, maxTokens: 5000 });
      const found = checkedValue(firstJson(reply.text), "project", reply.searched);
      if (found) {
        const site = matchProject(projects, found.value, developer);
        const values: Json = { project_name: site?.name ?? found.value };
        if (site) values.project_id = site.id;
        if (isUnknownDeveloper(list[0].developer)) values.developer = canonicalDeveloper(developer, developers) || developer;
        fail((await db.from("wa_unit_inbox").update(values).in("id", list.map((row) => Number(row.id))).eq("status", "pending")).error);
        result.projects += list.length;
      } else {
        const maybe = candidateValue(firstJson(reply.text), "project", reply.searched);
        if (maybe) {
          const site = matchProject(projects, maybe.value, developer);
          await keepCandidates(list, { project: { ...maybe, value: site?.name ?? maybe.value, project_id: site?.id ?? null } });
        }
      }
    } catch (error) {
      console.error("wa project check failed", developer, error);
    }
    await markChecked(list.map((row) => Number(row.id)));
  }

  // 3. a site project's missing facts (one search per project)
  const linked = rows.filter((row) => text(row.project_id) && FILL_FIELDS.some((field) => !text(row[field])));
  if (linked.length && result.checks < limit) {
    const ids = [...new Set(linked.map((row) => text(row.project_id)))];
    const { data: projectRows, error: projectError } = await db.from("projects").select("id,name,developer,down_payment_text,installments_text,delivery_text,finishing").in("id", ids);
    fail(projectError);
    for (const project of (projectRows ?? []) as Json[]) {
      const list = linked.filter((row) => text(row.project_id) === text(project.id));
      // What the project already has fills the units on the admin page (fillGaps): search only the rest.
      const missing = FILL_FIELDS.filter((field) => !text(project[field]) && list.some((row) => !text(row[field])));
      if (!missing.length) {
        await markChecked(list.map((row) => Number(row.id)));
        continue;
      }
      if (result.checks >= limit) break;
      result.checks++;
      try {
        const reply = await askClaude(researchPrompt(text(project.name), text(project.developer), [text(project.name)], []), { search: 5, maxTokens: 6000 });
        const checked = verifyFacts(firstJson(reply.text), reply.searched);
        const options: Record<string, unknown> = {};
        for (const field of missing) if (!checked.facts[field] && checked.candidates[field]?.length) options[field] = checked.candidates[field];
        if (Object.keys(options).length) await keepCandidates(list.filter((row) => missing.some((field) => !text(row[field]) && options[field])), { fields: options });
        for (const row of list) {
          const values: Json = {};
          const web: Record<string, string[]> = { ...((row.web_filled ?? {}) as Record<string, string[]>) };
          for (const field of missing) {
            const fact = checked.facts[field];
            if (!fact || text(row[field])) continue;
            values[field] = fact.value;
            web[field] = fact.sources;
          }
          if (Object.keys(values).length) {
            fail((await db.from("wa_unit_inbox").update({ ...values, web_filled: web }).eq("id", Number(row.id)).eq("status", "pending")).error);
            result.filled++;
          }
        }
      } catch (error) {
        console.error("wa project facts check failed", project.name, error);
      }
      await markChecked(list.map((row) => Number(row.id)));
    }
  }
  return result;
}

/** Recomputes a draft's doubts and status from its values, sources and the admin's confirmations. */
function draftState(draft: Json, extra: { weak?: DraftField[]; conflicts?: DraftField[]; found?: boolean; groupingSure?: boolean } = {}) {
  const values: Partial<Record<DraftField, string>> = {};
  for (const field of DRAFT_FIELDS) values[field] = text(draft[field]);
  const sources = (draft.sources ?? {}) as Record<string, unknown>;
  const previous = new Set(((draft.doubts as string[]) ?? []).map(text));
  const doubts = draftDoubts({
    values,
    verified: DRAFT_FIELDS.filter((field) => Array.isArray(sources[field]) && (sources[field] as unknown[]).length >= 2),
    confirmed: ((draft.confirmed as string[]) ?? []) as DraftField[],
    weak: extra.weak ?? DRAFT_FIELDS.filter((field) => previous.has(`weak_${field}`)),
    conflicts: extra.conflicts ?? DRAFT_FIELDS.filter((field) => previous.has(`conflict_${field}`)),
    found: extra.found ?? !previous.has("not_found"),
    groupingSure: extra.groupingSure ?? !previous.has("grouping_unsure"),
    waDeveloper: text(draft.wa_developer),
  });
  // Found under another developer by the research: stays until the admin confirms the developer.
  const webDeveloper = Array.isArray(sources.developer) && (sources.developer as unknown[]).length >= 2;
  if (previous.has("developer_mismatch") && !doubts.includes("developer_mismatch") && !((draft.confirmed as string[]) ?? []).includes("developer") && !webDeveloper && !text(draft.wa_developer)) doubts.push("developer_mismatch");
  return { doubts, status: doubts.length ? "needs_review" : "ready" };
}

/** Step 2: research one draft on the web and keep only the facts 2 different sites state. */
async function researchDraft(draft: Json) {
  const { data: units } = await db.from("wa_unit_inbox").select("project_name,developer,location,description").eq("draft_id", text(draft.id)).eq("status", "pending").limit(50);
  const list = (units ?? []) as Json[];
  const waNames = [...new Set(list.map((row) => text(row.project_name)).filter(Boolean))].slice(0, 12);
  const hints = [...new Set(list.map((row) => text(row.location)).filter(Boolean))].slice(0, 3);
  const now = new Date().toISOString();
  try {
    const reply = await askClaude(researchPrompt(text(draft.name), text(draft.developer), waNames, hints), { search: 6, maxTokens: 8000 });
    const checked = verifyFacts(firstJson(reply.text), reply.searched);
    const confirmed = new Set(((draft.confirmed as string[]) ?? []).map(text));
    const values: Json = {};
    const sources: Record<string, string[]> = { ...((draft.sources ?? {}) as Record<string, string[]>) };
    for (const field of DRAFT_FIELDS) {
      if (confirmed.has(field)) continue; // the admin's value stays
      const fact = checked.facts[field];
      // name/developer: keep the WhatsApp ones unless the web confirms another spelling.
      if (fact) {
        values[field] = fact.value;
        sources[field] = fact.sources;
      } else if (field !== "name" && field !== "developer") {
        values[field] = null;
        delete sources[field];
      }
    }
    // Facts without 2 sites: every value the sites gave, kept for the admin to pick (never used by itself).
    const candidates: Record<string, unknown> = {};
    for (const field of DRAFT_FIELDS) if (!confirmed.has(field) && !checked.facts[field] && checked.candidates[field]?.length) candidates[field] = checked.candidates[field];
    values.candidates = candidates;
    const merged = { ...draft, ...values, sources, wa_developer: draft.developer };
    const state = draftState(merged, { weak: checked.weak, conflicts: checked.conflicts, found: checked.found, groupingSure: !((draft.doubts as string[]) ?? []).includes("grouping_unsure") });
    fail((await db.from("wa_project_drafts").update({ ...values, sources, doubts: state.doubts, status: state.status, research_error: null, researched_at: now, updated_at: now }).eq("id", text(draft.id))).error);
    return { id: draft.id, status: state.status };
  } catch (error) {
    console.error("wa research failed", draft.name, error);
    fail((await db.from("wa_project_drafts").update({ research_error: String((error as Error).message || error).slice(0, 300), status: "needs_review", doubts: ["not_found"], researched_at: now, updated_at: now }).eq("id", text(draft.id))).error);
    return { id: draft.id, status: "failed" };
  }
}

// ---------- spending mode ----------
//
// «مكثف»: every pg_cron run (15 min), up to 40 new projects a day, until wa_intensive_until (then «عادي» by itself).
// «عادي»: one run every 6 hours, up to 8 new projects a day. «متوقف»: nothing (units still arrive and link to known projects).
// The admin changes it in «الجروبات». Keys in media_admin_settings.

type ResearchMode = "intensive" | "normal" | "off";
const MODE_DEFAULTS: Record<ResearchMode, { cap: number; everyMs: number }> = {
  intensive: { cap: 40, everyMs: 0 },
  normal: { cap: 8, everyMs: 6 * 60 * 60 * 1000 },
  off: { cap: 0, everyMs: Infinity },
};
const MODE_KEYS = ["wa_research_mode", "wa_research_daily_cap", "wa_intensive_until", "wa_research_last_run"];

async function researchSettings() {
  const { data, error } = await db.from("media_admin_settings").select("key,value").in("key", MODE_KEYS);
  fail(error);
  const get = (key: string) => text(((data ?? []) as Json[]).find((row) => row.key === key)?.value);
  const chosen = (["intensive", "normal", "off"].includes(get("wa_research_mode")) ? get("wa_research_mode") : "normal") as ResearchMode;
  const until = get("wa_intensive_until");
  // «مكثف» ends by itself at its end date.
  const mode: ResearchMode = chosen === "intensive" && until && Date.parse(until) < Date.now() ? "normal" : chosen;
  const customCap = Number(get("wa_research_daily_cap"));
  const cap = mode === "off" ? 0 : Number.isInteger(customCap) && customCap > 0 && chosen === mode ? customCap : MODE_DEFAULTS[mode].cap;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db.from("wa_project_drafts").select("id", { count: "exact", head: true }).gte("researched_at", since);
  return { mode, chosen, until: until || null, cap, used_today: count ?? 0, last_run: get("wa_research_last_run") || null };
}

async function setSetting(key: string, value: string | null) {
  if (value === null) fail((await db.from("media_admin_settings").delete().eq("key", key)).error);
  else fail((await db.from("media_admin_settings").upsert({ key, value, updated_at: new Date().toISOString() })).error);
}

/** The admin's mode switch in «الجروبات». */
async function researchSettingsSave(body: Json) {
  const mode = text(body.mode);
  if (!["intensive", "normal", "off"].includes(mode)) throw new HttpError(400, "mode_invalid");
  const cap = Number(body.daily_cap);
  if (body.daily_cap !== undefined && body.daily_cap !== null && body.daily_cap !== "" && !(Number.isInteger(cap) && cap >= 1 && cap <= 200)) throw new HttpError(400, "daily_cap_invalid");
  const until = text(body.intensive_until);
  if (until && Number.isNaN(Date.parse(until))) throw new HttpError(400, "intensive_until_invalid");
  await setSetting("wa_research_mode", mode);
  await setSetting("wa_research_daily_cap", Number.isInteger(cap) && cap > 0 ? String(cap) : null);
  await setSetting("wa_intensive_until", mode === "intensive" && until ? new Date(until).toISOString() : null);
  return researchSettings();
}

// ---------- automatic approval ----------
//
// Every 15 minutes (same pg_cron as the research): units in «جاهز للموافقة» go on the site by themselves,
// exactly like «وافق» (update the matched site unit, or add a new one). Left for the admin: units of a
// new project (they go with «انشر»), units with any doubt, units that would have no photo at all, and
// units whose project photos Claude flagged (another project, or a phone number other than Tycoons' WhatsApp).

/** Most units approved in one run (the rest go in the next run). */
const AUTO_APPROVE_PER_RUN = 100;
const AUTO_KEYS = ["wa_auto_approve", "wa_auto_approve_last_run", "wa_auto_approve_last_count", "wa_photo_check"];
/** Sonnet 5.5 list price, USD per million tokens (platform.claude.com, Nov 2026): input, output. */
const PHOTO_PRICE_PER_MTOK = { input: 2, output: 10 };

async function autoApproveState() {
  const { data, error } = await db.from("media_admin_settings").select("key,value").in("key", AUTO_KEYS);
  fail(error);
  const get = (key: string) => text(((data ?? []) as Json[]).find((row) => row.key === key)?.value);
  return {
    on: get("wa_auto_approve") !== "off",
    last_run: get("wa_auto_approve_last_run") || null,
    last_approved: Number(get("wa_auto_approve_last_count")) || 0,
    photo_check: get("wa_photo_check") !== "off",
    photo_usage: await photoUsage(),
  };
}

/** What the photo checks cost: today (Cairo day) and since the start. */
async function photoUsage() {
  const { data, error } = await db.from("wa_photo_check_usage").select("created_at,status,input_tokens,output_tokens").order("created_at", { ascending: false }).limit(20000);
  fail(error);
  const today = new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10);
  const sum = { checks: 0, input_tokens: 0, output_tokens: 0 };
  const day = { checks: 0, input_tokens: 0, output_tokens: 0 };
  for (const row of (data ?? []) as Json[]) {
    const input = Number(row.input_tokens) || 0;
    const output = Number(row.output_tokens) || 0;
    // «checks» = projects whose photos were checked; photo searches («suggest») count in the tokens only.
    const check = text(row.status) === "suggest" ? 0 : 1;
    sum.checks += check; sum.input_tokens += input; sum.output_tokens += output;
    if (new Date(Date.parse(text(row.created_at)) + 2 * 3600_000).toISOString().slice(0, 10) === today) {
      day.checks += check; day.input_tokens += input; day.output_tokens += output;
    }
  }
  const { data: credits, error: creditsError } = await db.from("wa_photo_suggestions").select("firecrawl_credits").limit(20000);
  fail(creditsError);
  const firecrawlCredits = ((credits ?? []) as Json[]).reduce((total, row) => total + (Number(row.firecrawl_credits) || 0), 0);
  const usd = (part: typeof sum) => Math.round(((part.input_tokens * PHOTO_PRICE_PER_MTOK.input + part.output_tokens * PHOTO_PRICE_PER_MTOK.output) / 1_000_000) * 100) / 100;
  return { today: { ...day, usd: usd(day) }, total: { ...sum, usd: usd(sum) }, firecrawl_credits: firecrawlCredits };
}

/** The admin's switches: «النزول التلقائي» (on) and «تشييك الصور» (photo_check). */
async function autoApproveSave(body: Json) {
  if (typeof body.on !== "boolean" && typeof body.photo_check !== "boolean") throw new HttpError(400, "on_required");
  if (typeof body.on === "boolean") await setSetting("wa_auto_approve", body.on ? "on" : "off");
  if (typeof body.photo_check === "boolean") await setSetting("wa_photo_check", body.photo_check ? "on" : "off");
  return autoApproveState();
}

async function autoApproveRun() {
  const state = await autoApproveState();
  if (!state.on) return { skipped: "off" };
  // «تشييك الصور» stopped: nothing goes on the site by itself (only what the admin approves by hand).
  if (!state.photo_check) return { skipped: "photo_check_off" };
  // Approved in the owner's name (the approvals history shows «واتساب تلقائي»).
  const { data: owner, error: ownerError } = await db.from("admin_users").select("id,role,display_name").eq("role", "owner").eq("active", true)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  fail(ownerError);
  if (!owner) return { skipped: "no_owner" };
  const current = await list({ status: "pending" });
  const ready = current.items.filter((row) => {
    const id = String(row.id);
    return text(row.project_id) && !(current.doubts[id] ?? []).length && !current.no_photos[id];
  });
  // Units go on the site only when their project's photos passed Claude's check (or the admin confirmed them).
  const byProject = new Map<string, Json[]>();
  for (const row of ready) byProject.set(text(row.project_id), [...(byProject.get(text(row.project_id)) ?? []), row]);
  const photos = await projectPhotos([...byProject.keys()]);
  const checks = await storedPhotoChecks([...byProject.keys()]);
  const toCheck = [...byProject.keys()].filter((id) => {
    const urls = photos.get(id) ?? [];
    const check = checks.get(id);
    return urls.length && (!check || text(check.photos_key) !== urls.join(",") || text(check.status) === "error");
  }).slice(0, PHOTO_CHECKS_PER_RUN);
  if (toCheck.length) {
    const { data: projectRows, error: projectError } = await db.from("projects").select("id,name,developer,location,area_group").in("id", toCheck);
    fail(projectError);
    const results = await Promise.all(((projectRows ?? []) as Json[]).map(async (project) => {
      const urls = photos.get(text(project.id)) ?? [];
      const result = await checkProjectPhotos(project, urls);
      const row = { project_id: text(project.id), photos_key: urls.join(","), ...result, checked_at: new Date().toISOString(), confirmed_by: null };
      fail((await db.from("wa_photo_checks").upsert(row)).error);
      return row;
    }));
    for (const row of results) checks.set(row.project_id, row as unknown as Json);
  }
  let approved = 0;
  const failed: { id: number; reason: string }[] = [];
  for (const [projectId, rows] of byProject) {
    const urls = photos.get(projectId) ?? [];
    const check = checks.get(projectId);
    // No project photos: these units keep the photos they already have on the site (no_photos is false).
    const passed = !urls.length || (check && text(check.photos_key) === urls.join(",") && ["ok", "confirmed"].includes(text(check.status)));
    if (!passed) continue;
    for (const row of rows) {
      if (approved >= AUTO_APPROVE_PER_RUN) break;
      try {
        await approve(owner as AdminUser, { id: row.id, values: {}, replace_unit_id: text(row.match_unit_id), availability_status: "available", auto: true });
        approved += 1;
      } catch (error) {
        failed.push({ id: Number(row.id), reason: error instanceof HttpError ? error.code : "approve_failed" });
      }
    }
  }
  await setSetting("wa_auto_approve_last_run", new Date().toISOString());
  await setSetting("wa_auto_approve_last_count", String(approved));
  if (failed.length) console.error("wa auto approve skipped", JSON.stringify(failed.slice(0, 20)));
  return { approved, photo_checks: toCheck.length, failed: failed.length };
}

// ---------- photo check (before the automatic approval) ----------

/** Projects whose photos Claude checks in one run (the others in the next runs). */
const PHOTO_CHECKS_PER_RUN = 6;
/** Photos sent to Claude per project (cover first). */
const PHOTOS_PER_CHECK = 8;
/** The only phone number allowed on a photo: the site's WhatsApp (src/lib/whatsapp.ts). */
const TYCOONS_WHATSAPP = "01110100025";

/** Cover + gallery of each project, in order, without repeats. */
async function projectPhotos(projectIds: string[]) {
  const out = new Map<string, string[]>();
  if (!projectIds.length) return out;
  const { data, error } = await db.from("projects").select("id,image_url,gallery_urls").in("id", projectIds);
  fail(error);
  for (const project of (data ?? []) as Json[]) {
    const urls = [text(project.image_url), ...text(project.gallery_urls).split(",").map((url) => url.trim())].filter(Boolean);
    out.set(text(project.id), [...new Set(urls)]);
  }
  return out;
}

async function storedPhotoChecks(projectIds: string[]) {
  const out = new Map<string, Json>();
  if (!projectIds.length) return out;
  const { data, error } = await db.from("wa_photo_checks").select("project_id,photos_key,status,reason,bad_urls,checked_at").in("project_id", projectIds);
  fail(error);
  for (const row of (data ?? []) as Json[]) out.set(text(row.project_id), row);
  return out;
}

/** For the admin page: the check of each pending unit's project, only when it is about the photos the project has now. */
async function currentPhotoChecks(rows: Json[]) {
  const ids = [...new Set(rows.map((row) => text(row.project_id)).filter(Boolean))];
  const [photos, checks] = await Promise.all([projectPhotos(ids), storedPhotoChecks(ids)]);
  const out: Record<string, Json> = {};
  for (const [id, check] of checks) {
    if (text(check.photos_key) !== (photos.get(id) ?? []).join(",")) continue;
    out[id] = { status: check.status, reason: check.reason, bad_urls: check.bad_urls ?? [], checked_at: check.checked_at };
  }
  return out;
}

/**
 * Claude looks at the project's photos: another project's name or logo, a place that does not fit the
 * location, or something that is not a real-estate photo = "mismatch"; a phone number other than
 * Tycoons' WhatsApp = "phone". A failed call is "error" and is tried again in the next run.
 */
async function checkProjectPhotos(project: Json, urls: string[]): Promise<{ status: string; reason: string | null; bad_urls: string[] }> {
  const result = await askPhotoCheck(project, urls);
  // Every call is counted, even a failed one (it may still have been billed).
  await db.from("wa_photo_check_usage").insert({
    project_id: text(project.id) || null, status: result.status, photos: Math.min(urls.length, PHOTOS_PER_CHECK),
    input_tokens: result.input_tokens, output_tokens: result.output_tokens,
  }).then(() => undefined, (error) => console.error("photo usage log failed", error));
  return { status: result.status, reason: result.reason, bad_urls: result.bad_urls };
}

async function askPhotoCheck(project: Json, urls: string[]): Promise<{ status: string; reason: string | null; bad_urls: string[]; input_tokens: number; output_tokens: number }> {
  let input_tokens = 0;
  let output_tokens = 0;
  const sent = urls.slice(0, PHOTOS_PER_CHECK);
  const content: Json[] = [{
    type: "text",
    text: [
      "You check the photos of a real-estate project on the Tycoons Investments website (Egypt) before its units go live automatically.",
      `Project: ${text(project.name)} | Developer: ${text(project.developer) || "unknown"} | Location: ${text(project.location) || "unknown"} | Area: ${text(project.area_group) || "unknown"}`,
      `${sent.length} photos follow, numbered from 1. Answer with one verdict:`,
      `- "phone": a photo shows any phone number, hotline (e.g. 16xxx, 19xxx) or WhatsApp number other than Tycoons' WhatsApp ${TYCOONS_WHATSAPP} (also written 01110100025, +20 111 010 0025, 201110100025).`,
      "- \"mismatch\": clear evidence a photo is not this project: a visible name or logo of another project or another developer, a setting that contradicts the location (for example an open sea beach for an inland city such as New Cairo, Mostakbal City, New Capital, Sheikh Zayed or October; lagoons and pools are fine), or not a real-estate photo at all (chat screenshot, price list only, unrelated picture).",
      "- \"match\": nothing above. Renders and generic photos are fine: never reject only because you cannot recognise the exact building.",
      "If both phone and mismatch apply, answer phone. bad_photos = the numbers of the photos that caused it (empty for match).",
      "reason = one short sentence in Egyptian Arabic for the admin, naming what you saw (empty for match).",
    ].join("\n"),
  }];
  sent.forEach((url, index) => {
    content.push({ type: "text", text: `Photo ${index + 1}:` });
    content.push({ type: "image", source: { type: "url", url } });
  });
  try {
    const key = await claudeKey();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        output_config: { format: { type: "json_schema", schema: {
          type: "object",
          additionalProperties: false,
          required: ["verdict", "reason", "bad_photos"],
          properties: {
            verdict: { type: "string", enum: ["match", "mismatch", "phone"] },
            reason: { type: "string" },
            bad_photos: { type: "array", items: { type: "integer" } },
          },
        } } },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const data = (await response.json().catch(() => ({}))) as Json;
    const usage = (data.usage ?? {}) as Json;
    input_tokens = (Number(usage.input_tokens) || 0) + (Number(usage.cache_read_input_tokens) || 0) + (Number(usage.cache_creation_input_tokens) || 0);
    output_tokens = Number(usage.output_tokens) || 0;
    if (!response.ok) throw new Error(`claude_${response.status}:${text((data.error as Json | undefined)?.message).slice(0, 200)}`);
    const block = ((data.content as Json[]) ?? []).find((item) => item.type === "text");
    const answer = JSON.parse(text(block?.text) || "{}") as Json;
    const verdict = text(answer.verdict);
    if (!["match", "mismatch", "phone"].includes(verdict)) throw new Error("photo_check_bad_answer");
    const bad = (Array.isArray(answer.bad_photos) ? answer.bad_photos : []).map(Number).filter((n) => n >= 1 && n <= sent.length).map((n) => sent[n - 1]);
    return { status: verdict === "match" ? "ok" : verdict, reason: verdict === "match" ? null : text(answer.reason).slice(0, 300) || null, bad_urls: verdict === "match" ? [] : bad, input_tokens, output_tokens };
  } catch (error) {
    console.error("photo check failed", text(project.name), error);
    return { status: "error", reason: String((error as Error)?.message || error).slice(0, 300), bad_urls: [], input_tokens, output_tokens };
  }
}

/** «الصور صح»: the admin says the project's current photos are fine; its ready units go on the site in the next run. */
async function photoConfirm(user: AdminUser, body: Json) {
  const projectId = text(body.project_id);
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new HttpError(400, "project_id_invalid");
  const urls = (await projectPhotos([projectId])).get(projectId);
  if (!urls) throw new HttpError(404, "project_not_found");
  if (!urls.length) throw new HttpError(400, "project_has_no_photos");
  fail((await db.from("wa_photo_checks").upsert({
    project_id: projectId, photos_key: urls.join(","), status: "confirmed", reason: null, bad_urls: [], checked_at: new Date().toISOString(), confirmed_by: user.id,
  })).error);
  return { ok: true };
}

// ---------- photo suggestions (projects with no photos) ----------
//
// For a site project with ready WhatsApp units and no photos: Firecrawl finds the project's pages on the
// developer's official website first, then on property and broker sites. Claude keeps only photos of the
// project with no phone number except Tycoons' WhatsApp and no logo, watermark, website address, QR code or
// price text of any other company, and the kept photos are copied to Storage as a suggestion.
// Nothing changes on the site until the admin adds them.

/** Projects searched in one run (the others in the next runs). */
const PHOTO_SUGGEST_PER_RUN = 1;
/** Most photos suggested for one project. */
const MAX_SUGGESTED = 10;
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2";
const STORAGE_BUCKET = "property-images";
/** Social, video and reference sites: no usable project photos there. */
const NOT_USABLE = /(facebook|instagram|youtube|tiktok|linkedin|twitter|x\.com|wikipedia|google|pinterest|threads\.net)/i;
/** Broker and property-site pages scraped besides the developer's own pages. */
const OTHER_PAGES = 2;
/** «none» results older than this were found by the first version (developer's site only): searched again. */
const PHOTO_SEARCH_SINCE = "2026-11-07T00:00:00Z";

const SUGGESTION_COLUMNS = "id,project_id,created_at,status,source_page,urls,reason,firecrawl_credits";

async function firecrawl(path: string, body: Json, timeoutMs = 60_000): Promise<{ data: Json; credits: number }> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY_missing");
  const response = await fetch(`${FIRECRAWL_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok || data.success === false) throw new Error(`firecrawl_${response.status}:${text(data.error).slice(0, 160)}`);
  return { data: (data.data ?? {}) as Json, credits: Number(data.creditsUsed) || 0 };
}

/** One Claude call (text and images) answering JSON with the schema; tokens go to wa_photo_check_usage. */
async function claudeJson(projectId: string, content: Json[], schema: Json, maxTokens = 1500): Promise<Json> {
  const key = await claudeKey();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, output_config: { format: { type: "json_schema", schema } }, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(90_000),
  });
  const data = (await response.json().catch(() => ({}))) as Json;
  const usage = (data.usage ?? {}) as Json;
  await db.from("wa_photo_check_usage").insert({
    project_id: projectId, status: "suggest", photos: content.filter((block) => block.type === "image").length,
    input_tokens: (Number(usage.input_tokens) || 0) + (Number(usage.cache_read_input_tokens) || 0) + (Number(usage.cache_creation_input_tokens) || 0),
    output_tokens: Number(usage.output_tokens) || 0,
  }).then(() => undefined, (error) => console.error("photo usage log failed", error));
  if (!response.ok) throw new Error(`claude_${response.status}:${text((data.error as Json | undefined)?.message).slice(0, 160)}`);
  const block = ((data.content as Json[]) ?? []).find((item) => item.type === "text");
  return JSON.parse(text(block?.text) || "{}") as Json;
}

/** Downloads a photo for checking: real photos only (jpeg / png / webp, 40 KB to 5 MB). */
async function downloadPhoto(url: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  try {
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (TycoonsBot photo check)" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return null;
    const type = text(response.headers.get("content-type")).split(";")[0].toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length >= 40_000 && bytes.length <= 5_000_000 ? { bytes, type } : null;
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const slugPart = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** Searches, checks and stores the suggestion for one project. Answer: the new wa_photo_suggestions row. */
async function suggestPhotos(projectId: string): Promise<Json> {
  const { data: project, error } = await db.from("projects").select("id,name,slug,developer,location,area_group").eq("id", projectId).maybeSingle();
  fail(error);
  if (!project) throw new HttpError(404, "project_not_found");
  let credits = 0;
  const save = async (values: Json) => {
    const { data, error: saveError } = await db.from("wa_photo_suggestions").insert({ project_id: projectId, firecrawl_credits: credits, ...values }).select(SUGGESTION_COLUMNS).single();
    fail(saveError);
    return data as Json;
  };
  try {
    // 1. Pages about the project. The developer's official website comes first (Claude picks it).
    const search = await firecrawl("/search", { query: `${text(project.name)} ${text(project.developer)} ${text(project.area_group) || "Egypt"}`, limit: 10, sources: ["web"] });
    credits += search.credits;
    const results = ((search.data.web as Json[]) ?? []).map((item) => ({ url: text(item.url), title: text(item.title) }))
      .filter((item) => /^https:\/\//i.test(item.url) && !NOT_USABLE.test(item.url) && !/\.pdf(\?|$)/i.test(item.url));
    if (!results.length) return await save({ status: "none", reason: "ما لقيناش صفحات عن المشروع في البحث" });
    const pick = await claudeJson(projectId, [{
      type: "text",
      text: [
        `Project: ${text(project.name)} | Developer: ${text(project.developer)} | Location: ${text(project.location) || text(project.area_group)} (Egypt)`,
        "Which search result is on the developer's own official website (any page of it)? Broker, listing and news sites do not count.",
        "relevant = the numbers of the other results that are clearly about THIS project (broker or property pages), best first.",
        "Answer official = the result number, or 0 when none is the developer's own website.",
        ...results.map((item, index) => `${index + 1}. ${item.url} — ${item.title}`),
      ].join("\n"),
    }], {
      type: "object", additionalProperties: false, required: ["official", "relevant"],
      properties: { official: { type: "integer" }, relevant: { type: "array", items: { type: "integer" } } },
    }, 300);
    const official = results[Number(pick.official) - 1]?.url ?? "";
    const pages: string[] = [];
    if (official) {
      const domain = new URL(official).hostname.replace(/^www\./, "");
      const onSite = await firecrawl("/search", { query: `site:${domain} ${text(project.name)}`, limit: 5, sources: ["web"] });
      credits += onSite.credits;
      pages.push(...[...new Set([...((onSite.data.web as Json[]) ?? []).map((item) => text(item.url)), official])]
        .filter((url) => /^https:\/\//i.test(url) && !/\.pdf(\?|$)/i.test(url) && new URL(url).hostname.replace(/^www\./, "") === domain)
        .slice(0, 2));
    }
    // 2. Broker and property pages about the project too (their photos go through the same strict check).
    const others = ((pick.relevant as unknown[]) ?? []).map((n) => results[Number(n) - 1]?.url).filter((url): url is string => Boolean(url) && url !== official);
    pages.push(...others.filter((url) => !pages.includes(url)).slice(0, OTHER_PAGES));
    if (!pages.length) return await save({ status: "none", reason: "ما لقيناش صفحات عن المشروع ده بالتحديد" });
    const page = pages[0];
    const found: string[] = [];
    for (const url of pages) {
      const scraped = await firecrawl("/scrape", { url, formats: ["images"], onlyMainContent: false, waitFor: 3000 }, 90_000).catch(() => null);
      if (!scraped) continue;
      credits += scraped.credits || Number(((scraped.data.metadata ?? {}) as Json).creditsUsed) || 1;
      found.push(text(((scraped.data.metadata ?? {}) as Json).ogImage), ...((scraped.data.images as unknown[]) ?? []).map(text));
    }
    const candidates = [...new Set(found)]
      .filter((url) => /^https:\/\//i.test(url) && !/\.(svg|gif|ico)(\?|$)|logo|icon|sprite|favicon|avatar|flag|whatsapp|facebook|instagram/i.test(url))
      .slice(0, 40);
    const photos: { url: string; bytes: Uint8Array; type: string }[] = [];
    for (const url of candidates) {
      if (photos.length >= 16) break;
      const photo = await downloadPhoto(url);
      if (photo) photos.push({ url, ...photo });
    }
    if (!photos.length) return await save({ status: "none", source_page: page, reason: "الصفحات اللي لقيناها مفيهاش صور ينفع نستخدمها" });

    // 3. Claude keeps only photos of this project, with no other phone number, logo or watermark.
    const content: Json[] = [{
      type: "text",
      text: [
        "These photos come from web pages about a real-estate project (the developer's website first, then property and broker sites). Pick the ones the Tycoons Investments website (Egypt) may show for this project.",
        `Project: ${text(project.name)} | Developer: ${text(project.developer)} | Location: ${text(project.location) || text(project.area_group)} | Page: ${page}`,
        "Keep a photo only when ALL of these hold:",
        "- it shows this project: buildings, renders, aerial views, amenities, interiors, landscape or the master plan;",
        `- it shows no phone number, hotline or WhatsApp number at all, except Tycoons' WhatsApp ${TYCOONS_WHATSAPP};`,
        "- it shows no logo, watermark (even faint or in a corner), website address, QR code, price or payment text of a broker or of any company other than this developer (the developer's own logo is fine);",
        "- it is not a logo, icon, banner made mostly of text, map screenshot, person portrait, or another project's photo.",
        "keep = the numbers of the photos to keep, best cover first. reason = one short Egyptian Arabic sentence for the admin about what was dropped (empty if nothing).",
      ].join("\n"),
    }];
    photos.forEach((photo, index) => {
      content.push({ type: "text", text: `Photo ${index + 1}:` });
      content.push({ type: "image", source: { type: "base64", media_type: photo.type, data: toBase64(photo.bytes) } });
    });
    const answer = await claudeJson(projectId, content, {
      type: "object", additionalProperties: false, required: ["keep", "reason"],
      properties: { keep: { type: "array", items: { type: "integer" } }, reason: { type: "string" } },
    });
    const kept = [...new Set(((answer.keep as unknown[]) ?? []).map(Number))].filter((n) => n >= 1 && n <= photos.length).slice(0, MAX_SUGGESTED).map((n) => photos[n - 1]);
    if (!kept.length) return await save({ status: "none", source_page: page, reason: text(answer.reason).slice(0, 300) || "ولا صورة عدّت التشييك" });

    // 4. Copied to our Storage, so the site never depends on the developer's website.
    const folder = `${slugPart(project.developer) || "developer"}/${slugPart(text(project.slug).split("--")[0] || project.name) || "project"}/suggested`;
    const stored: string[] = [];
    const originals: string[] = [];
    for (const [index, photo] of kept.entries()) {
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const path = `${folder}/${Date.now().toString(36)}-${index + 1}.${ext}`;
      const { error: uploadError } = await db.storage.from(STORAGE_BUCKET).upload(path, photo.bytes, { contentType: photo.type, cacheControl: "31536000", upsert: false });
      if (uploadError) continue;
      stored.push(db.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl);
      originals.push(photo.url);
    }
    if (!stored.length) return await save({ status: "error", source_page: page, reason: "storage_upload_failed" });
    return await save({ status: "pending", source_page: page, urls: stored, original_urls: originals, reason: text(answer.reason).slice(0, 300) || null });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("photo suggest failed", text(project.name), error);
    return await save({ status: "error", reason: String((error as Error)?.message || error).slice(0, 300) });
  }
}

/** Latest suggestion of each project. */
async function latestSuggestions(projectIds: string[]) {
  const out = new Map<string, Json>();
  if (!projectIds.length) return out;
  const { data, error } = await db.from("wa_photo_suggestions").select(SUGGESTION_COLUMNS).in("project_id", projectIds).order("created_at", { ascending: false }).limit(500);
  fail(error);
  for (const row of (data ?? []) as Json[]) if (!out.has(text(row.project_id))) out.set(text(row.project_id), row);
  return out;
}

/**
 * pg_cron: projects with ready units and no photos that were never searched get a search (2 per run).
 * A failed search is tried again after a day; «none» and decided ones only with «دوّر تاني».
 */
async function photoSuggestRun(gaps: string[]) {
  if (!gaps.length || !Deno.env.get("FIRECRAWL_API_KEY")) return { searched: 0 };
  const latest = await latestSuggestions(gaps);
  const todo = gaps.filter((id) => {
    const row = latest.get(id);
    return !row || (text(row.status) === "error" && Date.now() - Date.parse(text(row.created_at)) > 86_400_000) ||
      (text(row.status) === "none" && Date.parse(text(row.created_at)) < Date.parse(PHOTO_SEARCH_SINCE));
  }).slice(0, PHOTO_SUGGEST_PER_RUN);
  for (const id of todo) await suggestPhotos(id).catch((error) => console.error("photo suggest", id, error));
  return { searched: todo.length };
}

/** Cron step: only while «النزول التلقائي» and «تشييك الصور» are on (both mean the admin accepts the cost). */
async function photoSuggestCron() {
  const state = await autoApproveState();
  if (!state.on || !state.photo_check) return { skipped: "off" };
  const current = await list({ status: "pending" });
  return photoSuggestRun(current.photo_gaps.map((gap) => gap.project_id));
}

/** «دوّر على صور»: searches now for one project (the admin's button). */
async function photoSuggest(body: Json) {
  const projectId = text(body.project_id);
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new HttpError(400, "project_id_invalid");
  if (!Deno.env.get("FIRECRAWL_API_KEY")) throw new HttpError(503, "firecrawl_key_missing");
  return { suggestion: await suggestPhotos(projectId) };
}

/**
 * «ضيف الصور»: the picked suggested photos become the project's photos (cover first), through the same
 * admin_apply_ops "media" change as the photos tab, logged in admin_change_requests. They passed the
 * photo check, so the project's ready units go on the site in the next run.
 */
async function photoSuggestApprove(user: AdminUser, body: Json) {
  const { data: row, error } = await db.from("wa_photo_suggestions").select("id,project_id,status,urls").eq("id", Number(body.id)).maybeSingle();
  fail(error);
  if (!row) throw new HttpError(404, "suggestion_not_found");
  if (text(row.status) !== "pending") throw new HttpError(409, "already_decided");
  const offered = new Set(((row.urls as string[]) ?? []).map(text));
  const picked = [...new Set((Array.isArray(body.urls) ? body.urls : [...offered]).map(text))].filter((url) => offered.has(url));
  if (!picked.length) throw new HttpError(400, "no_photos_picked");
  const projectId = text(row.project_id);
  const { data: project, error: projectError } = await db.from("projects").select("id,name,image_url,gallery_urls").eq("id", projectId).maybeSingle();
  fail(projectError);
  if (!project) throw new HttpError(404, "project_not_found");
  // Photos the project got in the meantime stay; the suggested ones are added after them.
  const existing = [text(project.image_url), ...text(project.gallery_urls).split(",").map((url) => url.trim())].filter(Boolean);
  const all = [...new Set([...existing, ...picked])].slice(0, MAX_GALLERY);
  const values = { image_url: all[0], gallery_urls: all.join(", ") };
  const ops = [{ op: "media", entity: "project", id: projectId, values }];
  const { data: result, error: applyError } = await db.rpc("admin_apply_ops", { ops });
  if (applyError) throw new HttpError(409, `apply_failed:${applyError.message}`);
  const now = new Date().toISOString();
  await db.from("admin_change_requests").insert({
    entity: "project", action: "media", target_id: projectId, project_id: projectId,
    summary: `صور ${text(project.name)} من النت (${picked.length} صورة)`,
    ops, before: { image_url: project.image_url ?? null, gallery_urls: project.gallery_urls ?? null },
    created_by: user.id, status: "approved", reviewed_by: user.id, reviewed_at: now, result,
  }).then(() => undefined, () => undefined);
  fail((await db.from("wa_photo_suggestions").update({ status: "approved", decided_at: now, decided_by: user.id }).eq("id", Number(row.id))).error);
  fail((await db.from("wa_photo_checks").upsert({
    project_id: projectId, photos_key: all.join(","), status: "confirmed", reason: null, bad_urls: [], checked_at: now, confirmed_by: user.id,
  })).error);
  return { ok: true, added: picked.length };
}

async function photoSuggestReject(user: AdminUser, body: Json) {
  const { error } = await db.from("wa_photo_suggestions").update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", Number(body.id)).eq("status", "pending");
  fail(error);
  return { ok: true };
}

/** pg_cron every 15 minutes (and «ابحث تاني»): group new names, then research a few drafts, within the mode's limits. */
async function researchRun() {
  const settings = await researchSettings();
  if (settings.mode === "off") return { skipped: "off" };
  const last = settings.last_run ? Date.parse(settings.last_run) : 0;
  if (Date.now() - last < MODE_DEFAULTS[settings.mode].everyMs) return { skipped: "not_yet", mode: settings.mode };
  const left = Math.max(0, settings.cap - settings.used_today);
  if (!left) return { skipped: "daily_cap", mode: settings.mode, cap: settings.cap };
  await setSetting("wa_research_last_run", new Date().toISOString());
  // Developer and project name first, so the grouping below already sees them.
  const units = await resolveUnitDoubts(UNIT_CHECKS_PER_RUN);
  const grouped = await groupNewNames();
  const rechecked = await recheckUnsureDrafts(GROUP_CHECKS_PER_RUN - grouped.web_checks);
  const { data, error } = await db.from("wa_project_drafts").select(DRAFT_COLUMNS).eq("status", "researching").order("created_at", { ascending: true }).limit(Math.min(RESEARCH_PER_RUN, left));
  fail(error);
  const researched = [];
  for (const draft of (data ?? []) as Json[]) researched.push(await researchDraft(draft));
  return { mode: settings.mode, units, ...grouped, rechecked, researched };
}

async function loadDraft(id: unknown) {
  const { data, error } = await db.from("wa_project_drafts").select(DRAFT_COLUMNS).eq("id", text(id)).maybeSingle();
  fail(error);
  if (!data) throw new HttpError(404, "draft_not_found");
  return data as Json;
}

/** The admin edits a draft's facts: every field sent counts as confirmed (no 2 sources needed). */
async function draftSave(user: AdminUser, body: Json) {
  const draft = await loadDraft(body.id);
  if (!ACTIVE_DRAFT.includes(text(draft.status))) throw new HttpError(409, "draft_closed");
  const input = (body.values ?? {}) as Json;
  const values: Json = {};
  const confirmed = new Set(((draft.confirmed as string[]) ?? []).map(text));
  for (const field of DRAFT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue;
    const value = text(input[field]).slice(0, field === "description" ? 600 : 200);
    if (field === "area_group" && value && !AREA_GROUPS.includes(value)) throw new HttpError(400, "area_group_invalid");
    if (field === "name" && !value) throw new HttpError(400, "name_required");
    values[field] = value || null;
    confirmed.add(field);
  }
  for (const field of (Array.isArray(body.confirm) ? body.confirm : []).map(text)) if ((DRAFT_FIELDS as readonly string[]).includes(field)) confirmed.add(field);
  const merged = { ...draft, ...values, confirmed: [...confirmed] };
  const state = draftState(merged);
  const now = new Date().toISOString();
  const { data, error } = await db.from("wa_project_drafts").update({ ...values, confirmed: [...confirmed], doubts: state.doubts, status: state.status, decided_by: user.id, updated_at: now })
    .eq("id", text(draft.id)).select(DRAFT_COLUMNS).single();
  fail(error);
  // A new name means new spellings join it.
  if (values.name) await db.from("wa_project_drafts").update({ wa_keys: [...new Set([...((draft.wa_keys as string[]) ?? []), projectKey(values.name)].filter(Boolean))] }).eq("id", text(draft.id));
  return { draft: data };
}

/** Not a real project (or not ours to sell): the draft closes and its units go back to «محتاج مراجعة» without it. */
async function draftReject(user: AdminUser, body: Json) {
  const draft = await loadDraft(body.id);
  const now = new Date().toISOString();
  fail((await db.from("wa_project_drafts").update({ status: "rejected", decided_by: user.id, updated_at: now }).eq("id", text(draft.id))).error);
  fail((await db.from("wa_unit_inbox").update({ draft_id: null, updated_at: now }).eq("draft_id", text(draft.id)).eq("status", "pending")).error);
  return { ok: true };
}

/** «ابحث تاني»: the draft is researched again now (the admin's confirmed fields stay). */
async function draftResearch(body: Json) {
  const draft = await loadDraft(body.id);
  if (!ACTIVE_DRAFT.includes(text(draft.status))) throw new HttpError(409, "draft_closed");
  return { result: await researchDraft(draft), draft: await loadDraft(body.id) };
}

// ---------- «انشر»: a new project goes on the site ----------

const slugify = (value: unknown) =>
  text(value).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

async function uniqueSlug(base: string) {
  const root = base || "project";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt ? `${root}-${attempt + 1}` : root;
    const { data } = await db.from("projects").select("id").eq("slug", candidate).limit(1);
    if (!data?.length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** The developer's name as public.developers writes it; a developer the site does not know yet is added (same as the admin's new project form). */
async function siteDeveloper(name: string): Promise<string> {
  const developers = await allDevelopers();
  const known = canonicalDeveloper(name, developers);
  if (known) return known;
  const key = slugify(name);
  const bySlug = (await db.from("developers").select("name").eq("slug", key).maybeSingle()).data;
  if (bySlug?.name) return text(bySlug.name);
  fail((await db.from("developers").insert({ slug: key, name, aliases: [name] })).error);
  return name;
}

/**
 * «انشر» on a ready new project: creates the project on the site (same fields and texts as the admin's
 * new-project form), links every pending unit of it, and approves the units that are ready (the others
 * stay in «محتاج مراجعة» under the project). The article is written next by the admin page with the
 * site's writing tool. If the project already exists on the site (same name and developer), the units
 * join it and nothing new is created.
 */
async function publishDraft(user: AdminUser, body: Json) {
  const draft = await loadDraft(body.id);
  if (text(draft.status) !== "ready") throw new HttpError(409, "draft_not_ready");
  const name = text(draft.name).slice(0, 200);
  const developer = await siteDeveloper(text(draft.developer));
  const areaGroup = text(draft.area_group);
  const subArea = text(draft.sub_area).slice(0, 120) || null;
  const location = text(draft.location).slice(0, 200) || (subArea ? `${subArea}, ${areaGroup}` : areaGroup);
  const now = new Date().toISOString();

  let projectId = "";
  let slug = "";
  let created = false;
  const { data: twins } = await db.from("projects").select("id,slug").ilike("name", name).ilike("developer", developer).limit(1);
  if (twins?.length) {
    projectId = text(twins[0].id);
    slug = text(twins[0].slug);
  } else {
    slug = await uniqueSlug(`${slugify(name)}--${slugify(developer)}`);
    const year = new Date().getFullYear();
    const row: Json = {
      name, developer, location, area_group: areaGroup, sub_area: subArea,
      finishing: text(draft.finishing).slice(0, 300) || null,
      slug, status: "available",
      description: text(draft.description) || `${name} من ${developer} في ${location}. تعرض الصفحة أحدث الوحدات والأسعار المسجلة لدى Tycoons مع ضرورة تأكيد التوفر وقت الطلب.`,
      hero_text: `اعرف أسعار ومساحات ${name} وخطط السداد والوحدات المتاحة في ${location}.`,
      seo_title: `${name} | الأسعار وخطط السداد ${year}`,
      seo_description: `تعرف على أسعار ${name} في ${year}، الوحدات والمساحات المتاحة، المقدم وخطط السداد والاستلام. مشروع من ${developer} في ${location}.`,
    };
    const ops: Json[] = [{ op: "project_create", values: row }];
    const { data: result, error } = await db.rpc("admin_apply_ops", { ops });
    if (error) throw new HttpError(409, `apply_failed:${error.message}`);
    projectId = text(((result as Json)?.created_ids as unknown[] | undefined)?.[0]);
    created = true;
    // Payment plan and delivery are project-level texts too (only the trusted ones).
    const sources = (draft.sources ?? {}) as Record<string, unknown>;
    const confirmed = new Set(((draft.confirmed as string[]) ?? []).map(text));
    const plan: Json = {};
    for (const field of ["down_payment_text", "installments_text", "delivery_text"]) {
      if (text(draft[field]) && (confirmed.has(field) || (Array.isArray(sources[field]) && (sources[field] as unknown[]).length >= 2))) plan[field] = text(draft[field]);
    }
    if (Object.keys(plan).length) ops.push({ op: "project_update", id: projectId, values: plan });
    if (Object.keys(plan).length) fail((await db.rpc("admin_apply_ops", { ops: [ops[1]] })).error);
    await db.from("admin_change_requests").insert({
      entity: "project", action: "create", target_id: projectId, project_id: projectId,
      summary: `مشروع جديد من واتساب: ${name} — ${developer} (${location})`,
      ops, before: null, created_by: user.id, status: "approved", reviewed_by: user.id, reviewed_at: now, result,
    }).then(() => undefined, () => undefined);
  }

  fail((await db.from("wa_project_drafts").update({ status: "published", project_id: projectId, published_at: now, decided_by: user.id, updated_at: now }).eq("id", text(draft.id))).error);
  // The WhatsApp spellings now point at the site project (later units link by themselves).
  const { data: spellings } = await db.from("wa_unit_inbox").select("project_name").eq("draft_id", text(draft.id)).limit(2000);
  for (const spelling of new Set(((spellings ?? []) as Json[]).map((row) => text(row.project_name)).filter(Boolean))) {
    await rememberAlias(spelling, projectId, user.id).catch(() => false);
  }
  const { data: units, error: unitsError } = await db.from("wa_unit_inbox")
    .update({ project_id: projectId, project_name: name, developer, updated_at: now })
    .eq("draft_id", text(draft.id)).eq("status", "pending").select("id");
  fail(unitsError);
  const ids = ((units ?? []) as Json[]).map((row) => Number(row.id));
  const approval = ids.length ? await approveReady(user, { ids }) : { approved: 0, skipped: [] };
  return { ok: true, project_id: projectId, slug, created, linked: ids.length, approved: approval.approved, left_for_review: approval.skipped.length };
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
    if (action === "research_run") {
      await requireIntake(req);
      // Answer pg_cron now; grouping and research keep running in the background.
      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime;
      // Ready units first (no AI cost, runs in every mode), then the research.
      const job = autoApproveRun()
        .catch((error) => console.error("auto_approve", error))
        .then(() => photoSuggestCron())
        .catch((error) => console.error("photo_suggest", error))
        .then(() => researchRun())
        .catch((error) => console.error("research_run", error));
      if (runtime?.waitUntil) runtime.waitUntil(job);
      else await job;
      return reply({ accepted: true });
    }
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
      case "approve_ready": return reply(await approveReady(user, body));
      case "reject": return reply(await reject(user, body));
      case "link_project": return reply(await linkProject(user, body));
      case "groups": return reply(await groups());
      case "group_toggle": return reply(await groupToggle(body));
      case "group_developer": return reply(await groupDeveloper(body));
      case "draft_save": return reply(await draftSave(user, body));
      case "draft_reject": return reply(await draftReject(user, body));
      case "draft_research": return reply(await draftResearch(body));
      case "research_settings": return reply(await researchSettings());
      case "research_settings_save": return reply(await researchSettingsSave(body));
      case "auto_approve_save": return reply(await autoApproveSave(body));
      case "photo_confirm": return reply(await photoConfirm(user, body));
      case "photo_suggest": return reply(await photoSuggest(body));
      case "photo_suggest_approve": return reply(await photoSuggestApprove(user, body));
      case "photo_suggest_reject": return reply(await photoSuggestReject(user, body));
      case "publish_draft": return reply(await publishDraft(user, body));
      default: return reply({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.code }, error.status);
    console.error(error);
    return reply({ error: "server_error" }, 500);
  }
});
