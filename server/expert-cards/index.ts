// Supabase Edge Function: expert-cards
// Admin API for «كروت الخبير» (public.project_experts). Same login sessions as tycoons-admin
// (x-admin-token -> media_admin_sessions).
//   list -> every card with its project name and status (the internal `sources` stay here, never sent)
//   save -> replaces one card (by slug) and its status; card_version becomes today's date (Cairo)
// Sara reads project_experts_public straight away; the site (search, voice assistant, MCP, project
// pages) picks the change up after «حدّث الموقع».
// Sales text must not say how a figure was collected (that goes in card.evidence, website only),
// so a save whose sales text says «إعلان / اتقفلت / مطلوبة في / listings / confidence» is refused.
// Deploy with verify_jwt = false (the admin token is checked here).
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-admin-token, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
type Json = Record<string, unknown>;
const STATUSES = ["active", "draft", "archived"];
const COLLECTION_WORDS = ["إعلان", "اتقفلت", "مطلوبة في", "listings", "confidence"];
// The two rules that forbid those words mention «إعلان» on purpose; they are instructions, not client text.
const RULES_ALLOWED = [
  "الإيجار: قول المتوسط ومعاه سعر تحت وسعر فوق بس، من غير ما تقول اتجمع إزاي أو من كام إعلان.",
  "متذكرش للعميل أسماء مواقع الإعلانات أو أي مصدر خارجي.",
];

class HttpError extends Error {
  status: number;
  code: string;
  detail?: string;
  constructor(status: number, code: string, detail?: string) {
    super(code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const text = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());
const fail = (error: { message?: string } | null) => { if (error) throw new Error(error.message || "db_error"); };
const sha256 = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const isObject = (value: unknown): value is Json => !!value && typeof value === "object" && !Array.isArray(value);

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

function cairoToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
}

async function list() {
  const { data, error } = await db.from("project_experts").select("slug,project_id,card,card_version,status,updated_at,reviewed_at").order("slug");
  fail(error);
  const ids = (data ?? []).map((row) => row.project_id).filter(Boolean);
  const { data: projects, error: projectError } = ids.length ? await db.from("projects").select("id,name,developer").in("id", ids) : { data: [], error: null };
  fail(projectError);
  const names = new Map((projects ?? []).map((row) => [row.id, row]));
  return {
    cards: (data ?? []).map((row) => ({
      slug: row.slug,
      project_id: row.project_id,
      project_name: text(names.get(row.project_id)?.name) || text((row.card as Json)?.project && ((row.card as Json).project as Json).name_en),
      developer: text(names.get(row.project_id)?.developer) || null,
      card: row.card,
      card_version: row.card_version,
      status: row.status,
      updated_at: row.updated_at,
      reviewed_at: row.reviewed_at,
    })),
  };
}

/** Words in the sales part of the card (everything but evidence) that explain how a figure was collected. */
export function collectionWords(card: Json): string[] {
  const { evidence: _evidence, sources: _sources, ...sales } = card;
  let body = JSON.stringify(sales);
  for (const rule of RULES_ALLOWED) body = body.split(JSON.stringify(rule).slice(1, -1)).join("");
  return COLLECTION_WORDS.filter((word) => body.includes(word));
}

async function save(user: { id: string }, body: Json) {
  const slug = text(body.slug);
  if (!slug) throw new HttpError(400, "slug_required");
  const card = body.card;
  if (!isObject(card) || !isObject(card.project) || !isObject(card.summary) || !Array.isArray((card.summary as Json).key_facts)) {
    throw new HttpError(400, "card_invalid");
  }
  if (text((card.project as Json).slug) !== slug) throw new HttpError(400, "card_slug_mismatch");
  if ("sources" in card) throw new HttpError(400, "sources_not_in_card");
  const words = collectionWords(card);
  if (words.length) throw new HttpError(400, "collection_words_in_sales_text", words.join("، "));
  const status = STATUSES.includes(text(body.status)) ? text(body.status) : "active";
  const version = cairoToday();
  const now = new Date().toISOString();
  const { data, error } = await db.from("project_experts")
    .update({ card: { ...card, card_version: version }, card_version: version, status, updated_at: now, reviewed_at: now, note: `edited in admin by ${user.id}` })
    .eq("slug", slug)
    .select("slug,project_id,card,card_version,status,updated_at,reviewed_at")
    .maybeSingle();
  fail(error);
  if (!data) throw new HttpError(404, "card_not_found");
  return { ok: true, card: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const user = await requireUser(req);
    switch (text(body.action)) {
      case "list": return reply(await list());
      case "save": return reply(await save(user, body));
      default: return reply({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.code, ...(error.detail ? { detail: error.detail } : {}) }, error.status);
    console.error(error);
    return reply({ error: "server_error" }, 500);
  }
});
