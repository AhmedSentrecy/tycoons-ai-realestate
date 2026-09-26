import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
  .map((x) => x.toString(16).padStart(2, "0")).join("");

type Incoming = {
  crm_id?: unknown; name?: unknown; phone?: unknown; agent?: unknown;
  last_feedback?: unknown; last_feedback_at?: unknown; all_feedback?: unknown;
  source_sheet?: unknown;
};
type Feedback = { body: string; at: string; author: string; key: string };

function normalizePhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^0[0-9]{10}$/.test(digits)) digits = `20${digits.slice(1)}`;
  return digits;
}

function agentSlug(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[^a-z\u0600-\u06ff]+/g, " ").replace(/\s+/g, " ");
  const names: Record<string, string> = {
    "ahmed yehya": "ahmed-yehia", "ahmed yehia": "ahmed-yehia", "أحمد يحيى": "ahmed-yehia",
    "nour mohamed": "nour-mohamed", "نور محمد": "nour-mohamed",
    "mostafa amr": "mostafa-amr", "مصطفى عمرو": "mostafa-amr",
    "ahmed sentrecy": "ahmed-sentrecy", "أحمد سنتريسي": "ahmed-sentrecy",
  };
  return names[normalized] || "";
}

async function feedbacks(row: Incoming, crmId: string, since: number): Promise<Feedback[]> {
  const lines = String(row.all_feedback ?? "").replace(/\r/g, "").split("\n");
  const parts: Array<{ body: string; at: string; author: string }> = [];
  const pattern = /^(\d{4}-\d\d-\d\d \d\d:\d\d)(?:\s+—)?\s+([^:]+):\s*(.*)$/;
  for (const line of lines) {
    const match = pattern.exec(line);
    if (match) parts.push({ at: match[1], author: match[2].trim(), body: match[3] });
    else if (parts.length) parts[parts.length - 1].body += `\n${line}`;
  }
  if (!parts.length && String(row.last_feedback ?? "").trim()) {
    parts.push({ at: String(row.last_feedback_at ?? "").trim(), author: String(row.agent ?? "").trim(), body: String(row.last_feedback) });
  }
  const unique = new Map<string, Feedback>();
  for (const part of parts) {
    const body = part.body.trim();
    if (!body) continue;
    if (since && !part.at) continue;
    // Source dates in these two sheets are in Africa/Cairo. The date filter is applied
    // as local wall-clock text, so no daylight-saving offset is guessed.
    if (since && part.at && part.at < new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(since)).replace("T", " ")) continue;
    const key = await digest(`${crmId}\u0000${part.at}\u0000${part.author.toLowerCase()}\u0000${body}`);
    unique.set(key, { body, at: part.at, author: part.author, key });
  }
  return [...unique.values()];
}

async function ingest(row: Incoming, since: number, agents: Map<string, string>) {
  const crmId = String(row.crm_id ?? "").trim();
  const name = String(row.name ?? "").trim();
  if (!/^\d{1,20}$/.test(crmId) || !name) return { status: "invalid_row", crm_id: crmId };
  const comments = await feedbacks(row, crmId, since);
  if (!comments.length) return { status: "no_feedback", crm_id: crmId };
  if (comments.some((c) => c.body.length > 5000)) return { status: "feedback_too_long", crm_id: crmId };
  const slug = agentSlug(row.agent);
  const agentId = agents.get(slug);
  if (!agentId) return { status: "unknown_agent", crm_id: crmId };

  let { data: lead, error: lookupError } = await db.from("sales_pipeline")
    .select("id,agent_id,crm_lead_id").eq("crm_lead_id", crmId).maybeSingle();
  if (lookupError) throw lookupError;
  let wasCreated = false;
  const phone = normalizePhone(row.phone);
  if (!lead && phone) {
    const { data: candidates, error } = await db.from("sales_pipeline")
      .select("id,agent_id,crm_lead_id,phone").eq("agent_id", agentId);
    if (error) throw error;
    const matching = (candidates || []).filter((x: any) => normalizePhone(x.phone) === phone && !x.crm_lead_id);
    if (matching.length > 1) return { status: "ambiguous_phone", crm_id: crmId };
    if (matching.length === 1) {
      const claimed = await db.from("sales_pipeline").update({ crm_lead_id: crmId })
        .eq("id", matching[0].id).is("crm_lead_id", null).select("id,agent_id,crm_lead_id").maybeSingle();
      if (claimed.error) throw claimed.error;
      lead = claimed.data;
    }
  }
  if (!lead) {
    const created = await db.from("sales_pipeline").insert({
      crm_lead_id: crmId, agent_id: agentId, client_name: name, phone: phone || "",
      budget: "", stage: "New Lead", next_action: "", next_action_trigger: "", notes: "",
    }).select("id,agent_id,crm_lead_id").single();
    if (created.error?.code === "23505") {
      const existing = await db.from("sales_pipeline").select("id,agent_id,crm_lead_id")
        .eq("crm_lead_id", crmId).maybeSingle();
      if (existing.error) throw existing.error;
      lead = existing.data;
    } else if (created.error) throw created.error;
    else { lead = created.data; wasCreated = true; }
  }
  if (!lead) throw new Error("lead_lookup_failed");
  if (lead.agent_id !== agentId) return { status: "owner_conflict", crm_id: crmId };
  if (wasCreated) {
    const event = await db.from("sales_pipeline_activity").insert({
      pipeline_id: lead.id, agent_id: agentId, activity_type: "created", body: "",
      actor_type: "system", actor_agent_id: null,
      metadata: { source: "crm_google_sheet", crm_lead_id: crmId },
    });
    if (event.error) throw event.error;
  }
  let added = 0;
  for (const c of comments) {
    const inserted = await db.from("sales_pipeline_activity").insert({
      pipeline_id: lead.id, agent_id: agentId, activity_type: "feedback", body: c.body,
      actor_type: "system", actor_agent_id: null, external_feedback_key: c.key,
      metadata: { source: "crm_google_sheet", source_sheet: String(row.source_sheet ?? ""),
        crm_lead_id: crmId, crm_feedback_at_cairo: c.at, crm_feedback_author: c.author },
    });
    if (inserted.error?.code === "23505") continue;
    if (inserted.error) throw inserted.error;
    added++;
  }
  if (added) {
    const updated = await db.from("sales_pipeline").update({ updated_at: new Date().toISOString() }).eq("id", lead.id);
    if (updated.error) throw updated.error;
  }
  if (wasCreated) {
    const { data: current, error } = await db.from("sales_pipeline").select("stage").eq("agent_id", agentId);
    if (error) throw error;
    const entries = current || [];
    const snap = await db.from("sales_pipeline_snapshots").insert({
      agent_id: agentId, warm_count: entries.filter((x: any) => x.stage === "Warm").length,
      hot_count: entries.filter((x: any) => x.stage === "Hot / Very Potential").length,
      active_count: entries.filter((x: any) => !["Won", "Lost / Dead"].includes(x.stage)).length,
    });
    if (snap.error) throw snap.error;
  }
  return { status: added ? "imported" : "already_synced", crm_id: crmId, feedbacks_added: added };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("x-war-room-sync-token") || "";
    if (token.length < 40) return reply({ error: "unauthorized" }, 401);
    const { data: credential, error: authError } = await db.from("sales_war_room_sync_keys")
      .select("name").eq("name", "google_sheets").eq("token_sha256", await digest(token))
      .eq("active", true).maybeSingle();
    if (authError) throw authError;
    if (!credential) return reply({ error: "unauthorized" }, 401);
    const payload = await req.json();
    if (!Array.isArray(payload.rows) || payload.rows.length > 50 || typeof payload.since !== "string")
      return reply({ error: "invalid_payload" }, 400);
    const since = Date.parse(payload.since);
    if (!Number.isFinite(since)) return reply({ error: "invalid_since" }, 400);
    const { data: agentRows, error } = await db.from("sales_agents").select("id,slug").eq("active", true);
    if (error) throw error;
    const agents = new Map((agentRows || []).map((a: any) => [a.slug, a.id]));
    const results = [];
    for (const row of payload.rows as Incoming[]) {
      try { results.push(await ingest(row, since, agents)); }
      catch (cause) { results.push({ status: "error", crm_id: String(row?.crm_id ?? ""),
        message: String((cause as Error).message || cause) }); }
    }
    return reply({ results });
  } catch (cause) { return reply({ error: String((cause as Error).message || cause) }, 500); }
});
