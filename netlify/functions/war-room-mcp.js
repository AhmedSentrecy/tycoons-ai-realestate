// Private MCP server for the Sales War Room + website inventory.
//
// URL:  https://tycoons-inv.com/mcp/war-room/<secret-key>
// Works in Claude (custom connector) and ChatGPT (custom MCP server, "No authentication"),
// because the secret key lives in the URL itself.
//
// Netlify environment variables:
//   SUPABASE_SERVICE_ROLE_KEY   already used by other functions
//   SUPABASE_URL                optional, defaults to the Tycoons project
//   WAR_ROOM_MCP_KEYS           JSON object: { "<secret>": "owner", "<secret>": "<agent-slug>" }
//                               "owner" sees and edits every agent. An agent slug
//                               (e.g. "mostafa-amr") sees and edits only that agent's cards.
//
// Writes follow the same rules as the sales-war-room-pipeline-v2 Edge Function:
// stage history, activity log, follow-up log and pipeline snapshot on every change.

import { createHash, timingSafeEqual } from "node:crypto";

import { inventoryUnitId, loadInventory } from "../../src/lib/inventory.ts";
import { searchInventory } from "../../src/lib/propertySearch.ts";

const SERVER_NAME = "tycoons-sales-war-room";
const SERVER_VERSION = "1.0.0";
const DEFAULT_SUPABASE_URL = "https://coqnjymekrkoausiiytm.supabase.co";
const LATEST_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-03-26", "2025-06-18", LATEST_PROTOCOL_VERSION]);
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_ORIGINS = new Set(["https://claude.ai", "https://chatgpt.com", "https://chat.openai.com"]);

export const STAGES = [
  "New Lead",
  "Contacted",
  "Cold",
  "Warm",
  "Hot / Very Potential",
  "Hold",
  "Meeting Scheduled",
  "Meeting Held",
  "Negotiation / Closing",
  "Won",
  "Lost / Dead",
];
const CLOSED_STAGES = new Set(["Won", "Lost / Dead"]);
const LOST_REASONS = ["Price", "Location", "Delivery date", "Payment plan", "Bought elsewhere", "Not reachable", "Not serious", "Other"];
const MEETING_LOCATIONS = ["Office", "Site", "Online", "Developer office"];

class ToolInputError extends Error {}

// ---------------------------------------------------------------- tool list

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

const agentProp = {
  type: "string",
  description: "Agent slug or name (e.g. mostafa-amr, مصطفى). Owner link only; agent links always use their own agent.",
};

const TOOL_DEFINITIONS = [
  {
    name: "list_agents",
    title: "List sales agents",
    description: "List the Sales War Room agents with their slugs and how many open, overdue and today follow-ups each has.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "search_leads",
    title: "Search leads and feedback",
    description:
      "Search every Sales War Room lead by client name, phone, notes, next action, or any word written inside the lead's feedback history (Arabic or English). Example: 'سراي', 'مقدم مليون', 'Mountain View', '0100 123'.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 2, description: "Words to find" },
        agent: agentProp,
        stage: { type: "string", enum: STAGES },
        include_closed: { type: "boolean", description: "Include Won and Lost leads. Default true." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "get_lead",
    title: "Get one lead with its full feedback",
    description: "Return one lead card and its full activity timeline (feedback, stage changes, follow-ups). Find it by lead_id or phone.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        phone: { type: "string" },
        activity_limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
      },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "list_followups",
    title: "List follow-ups",
    description: "List open leads by their next follow-up date: overdue, today, the next 7 days, or all open leads without a date.",
    inputSchema: {
      type: "object",
      properties: {
        when: { type: "string", enum: ["overdue", "today", "next_7_days", "no_date", "all_open"], default: "overdue" },
        agent: agentProp,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
      },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "add_war_room_card",
    title: "Add a lead card",
    description:
      "Add a new client card under an agent in the Sales War Room. If the same phone already has a card under that agent, the existing card is returned instead of a duplicate.",
    inputSchema: {
      type: "object",
      properties: {
        agent: agentProp,
        client_name: { type: "string", minLength: 1 },
        phone: { type: "string" },
        budget: { type: "string" },
        stage: { type: "string", enum: STAGES, default: "New Lead" },
        notes: { type: "string", description: "First feedback for the card" },
        next_action: { type: "string" },
        next_action_date: { type: "string", description: "YYYY-MM-DD (Cairo date)" },
        next_action_time: { type: "string", description: "HH:MM 24h (Cairo time)" },
        campaign: { type: "string" },
      },
      required: ["client_name"],
      additionalProperties: false,
    },
    annotations: WRITE,
  },
  {
    name: "update_feedback",
    title: "Add feedback / update a lead",
    description:
      "Add a feedback line to a lead and optionally change its stage and next follow-up. Warm needs a next action with a date. Lost needs lost_reason. Meeting Scheduled needs meeting date, time and location.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        feedback: { type: "string" },
        stage: { type: "string", enum: STAGES },
        next_action: { type: "string" },
        next_action_date: { type: "string", description: "YYYY-MM-DD, or empty string to clear" },
        next_action_time: { type: "string", description: "HH:MM 24h" },
        lost_reason: { type: "string", enum: LOST_REASONS },
        meeting_date: { type: "string", description: "YYYY-MM-DD" },
        meeting_time: { type: "string", description: "HH:MM 24h" },
        meeting_location: { type: "string", enum: MEETING_LOCATIONS },
      },
      required: ["lead_id"],
      additionalProperties: false,
    },
    annotations: WRITE,
  },
  {
    name: "search_units",
    title: "Search website units",
    description:
      "Search the tycoons-inv.com inventory in Arabic or English, e.g. 'شقة 3 غرف التجمع تحت 10 مليون'. Returns exact matches first, then close alternatives.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 2 },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
];

// ---------------------------------------------------------------- helpers

function cleanText(value, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedInteger(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const ARABIC_DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d])
    .replace(/[ً-ْـ]/g, "") // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function digitsOnly(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d])
    .replace(/\D/g, "");
}

// Phone match ignores spaces, +20 / 0 prefixes.
function phoneCore(value) {
  let d = digitsOnly(value);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("20") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

function cairoToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function validDate(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const v = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
    throw new ToolInputError(`${label} must be YYYY-MM-DD`);
  }
  return v;
}

function validTime(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const v = cleanText(value, 8);
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) throw new ToolInputError(`${label} must be HH:MM (24h)`);
  return v.length === 5 ? `${v}:00` : v;
}

function snippet(text, query, radius = 70) {
  const raw = String(text || "");
  const n = normalizeText(raw);
  const q = normalizeText(query);
  const i = q ? n.indexOf(q) : -1;
  if (i < 0) return raw.slice(0, radius * 2);
  // normalizeText keeps length except for removed tashkeel/space runs; close enough for a preview.
  const start = Math.max(0, i - radius);
  return `${start > 0 ? "…" : ""}${raw.slice(start, i + q.length + radius)}${i + q.length + radius < raw.length ? "…" : ""}`;
}

// ---------------------------------------------------------------- supabase

function supabaseConfig() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on Netlify");
  return { base: `${process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL}/rest/v1`, key };
}

async function rest(path, { method = "GET", body, prefer, range } = {}) {
  const { base, key } = supabaseConfig();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  if (range) headers.Range = range;
  const response = await fetch(`${base}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]} failed (${response.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// Reads past the 1000-row API cap.
async function restAll(path, pageSize = 1000, maxRows = 20000) {
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const page = await rest(path, { range: `${from}-${from + pageSize - 1}` });
    rows.push(...(page || []));
    if (!page || page.length < pageSize) break;
  }
  return rows;
}

const inList = (ids) => `in.(${ids.map((id) => `"${String(id).replace(/"/g, "")}"`).join(",")})`;

// ---------------------------------------------------------------- access

function keyMap() {
  const raw = process.env.WAR_ROOM_MCP_KEYS || "";
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    console.error("[War Room MCP] WAR_ROOM_MCP_KEYS is not valid JSON");
    return {};
  }
}

const hash = (value) => createHash("sha256").update(String(value)).digest();

export function resolveAccess(secret) {
  const given = cleanText(secret, 200);
  if (given.length < 24) return null;
  const givenHash = hash(given);
  let match = null;
  for (const [key, role] of Object.entries(keyMap())) {
    if (String(key).length < 24) continue;
    if (timingSafeEqual(hash(key), givenHash)) match = String(role || "").trim();
  }
  if (!match) return null;
  return match === "owner" ? { role: "owner" } : { role: "agent", agentSlug: match };
}

async function loadAgents() {
  return (await rest("sales_agents?select=id,slug,name_en,name_ar,active&order=name_en.asc")) || [];
}

function findAgent(agents, value) {
  const q = normalizeText(value);
  if (!q) return null;
  return (
    agents.find((a) => a.slug === q) ||
    agents.find((a) => normalizeText(a.name_en) === q || normalizeText(a.name_ar) === q) ||
    agents.find((a) => normalizeText(a.name_en).includes(q) || normalizeText(a.name_ar).includes(q) || a.slug.includes(q)) ||
    null
  );
}

// Which agents may this caller read / write? Returns agent rows.
async function scopeAgents(access, requested) {
  const agents = await loadAgents();
  if (access.role === "agent") {
    const self = agents.find((a) => a.slug === access.agentSlug && a.active);
    if (!self) throw new ToolInputError("This link's agent is not active");
    return { agents, scope: [self], self };
  }
  if (requested) {
    const one = findAgent(agents, requested);
    if (!one) throw new ToolInputError(`Unknown agent "${requested}". Agents: ${agents.map((a) => a.slug).join(", ")}`);
    return { agents, scope: [one] };
  }
  return { agents, scope: agents };
}

function actorFor(access, agentId) {
  return access.role === "owner" ? { actor_type: "owner", actor_agent_id: null } : { actor_type: "agent", actor_agent_id: agentId };
}

function cardView(row, agentsById) {
  const agent = agentsById.get(row.agent_id);
  return {
    lead_id: row.id,
    client_name: row.client_name,
    phone: row.phone,
    agent: agent ? agent.slug : row.agent_id,
    agent_name: agent ? agent.name_ar || agent.name_en : null,
    stage: row.stage,
    budget: row.budget || null,
    next_action: row.next_action || null,
    next_action_date: row.next_action_date || null,
    next_action_time: row.next_action_time || null,
    campaign: row.campaign || null,
    crm_lead_id: row.crm_lead_id || null,
    last_crm_feedback_at: row.crm_last_feedback_at_cairo || null,
    updated_at: row.updated_at,
  };
}

const PIPELINE_FIELDS =
  "id,agent_id,client_name,phone,budget,stage,next_action,next_action_date,next_action_time,next_action_trigger,notes,campaign,crm_lead_id,crm_last_feedback_at_cairo,lost_reason,meeting_date,meeting_time,meeting_location,created_at,updated_at";

async function loadPipeline(scope) {
  const filter = `agent_id=${inList(scope.map((a) => a.id))}`;
  return restAll(`sales_pipeline?select=${PIPELINE_FIELDS}&${filter}&order=updated_at.desc`);
}

async function snapshot(agentId) {
  const rows = (await rest(`sales_pipeline?select=stage&agent_id=eq.${agentId}`)) || [];
  await rest("sales_pipeline_snapshots", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      agent_id: agentId,
      warm_count: rows.filter((r) => r.stage === "Warm").length,
      hot_count: rows.filter((r) => r.stage === "Hot / Very Potential").length,
      active_count: rows.filter((r) => !CLOSED_STAGES.has(r.stage)).length,
    },
  });
}

async function logActivity(access, agentId, pipelineId, type, extra = {}) {
  await rest("sales_pipeline_activity", {
    method: "POST",
    prefer: "return=minimal",
    body: { pipeline_id: pipelineId, agent_id: agentId, activity_type: type, ...actorFor(access, agentId), ...extra },
  });
}

// ---------------------------------------------------------------- tools

async function listAgents(_args, access) {
  const { scope } = await scopeAgents(access);
  const rows = await loadPipeline(scope);
  const today = cairoToday();
  return {
    today_cairo: today,
    agents: scope.map((a) => {
      const mine = rows.filter((r) => r.agent_id === a.id && !CLOSED_STAGES.has(r.stage));
      return {
        slug: a.slug,
        name_ar: a.name_ar,
        name_en: a.name_en,
        active: a.active,
        open_leads: mine.length,
        overdue: mine.filter((r) => r.next_action_date && r.next_action_date < today).length,
        today: mine.filter((r) => r.next_action_date === today).length,
      };
    }),
  };
}

async function searchLeads(args, access) {
  const query = cleanText(args.query, 200);
  if (normalizeText(query).length < 2) throw new ToolInputError("query must contain at least 2 characters");
  const limit = boundedInteger(args.limit, 20, 1, 50);
  const includeClosed = args.include_closed !== false;
  const stage = args.stage ? cleanText(args.stage, 40) : "";
  if (stage && !STAGES.includes(stage)) throw new ToolInputError(`stage must be one of: ${STAGES.join(", ")}`);

  const { agents, scope } = await scopeAgents(access, args.agent);
  const agentsById = new Map(agents.map((a) => [a.id, a]));
  const [pipeline, activity] = await Promise.all([
    loadPipeline(scope),
    restAll(
      `sales_pipeline_activity?select=pipeline_id,body,created_at,activity_type&agent_id=${inList(scope.map((a) => a.id))}&body=not.is.null&order=created_at.desc`,
    ),
  ]);

  const q = normalizeText(query);
  const qPhone = phoneCore(query);
  const isPhoneQuery = qPhone.length >= 5 && qPhone.length >= q.replace(/\s/g, "").length - 2;
  const hits = new Map(); // lead id -> { fields, feedback: [] }

  const keep = (row) => (!stage || row.stage === stage) && (includeClosed || !CLOSED_STAGES.has(row.stage));
  const byId = new Map(pipeline.map((r) => [r.id, r]));

  for (const row of pipeline) {
    if (!keep(row)) continue;
    const fields = [];
    if (normalizeText(row.client_name).includes(q)) fields.push("client_name");
    if (isPhoneQuery && phoneCore(row.phone).includes(qPhone)) fields.push("phone");
    if (normalizeText(row.notes).includes(q)) fields.push("notes");
    if (normalizeText(row.next_action).includes(q)) fields.push("next_action");
    if (normalizeText(row.budget).includes(q)) fields.push("budget");
    if (normalizeText(row.campaign).includes(q)) fields.push("campaign");
    if (fields.length) hits.set(row.id, { fields, feedback: [] });
  }

  for (const a of activity) {
    const row = byId.get(a.pipeline_id);
    if (!row || !keep(row)) continue;
    if (!normalizeText(a.body).includes(q)) continue;
    const hit = hits.get(row.id) || { fields: [], feedback: [] };
    if (!hit.fields.includes("feedback")) hit.fields.push("feedback");
    if (hit.feedback.length < 3) hit.feedback.push({ at: a.created_at, type: a.activity_type, text: snippet(a.body, query) });
    hits.set(row.id, hit);
  }

  const results = [...hits.entries()]
    .map(([id, hit]) => ({ ...cardView(byId.get(id), agentsById), matched_in: hit.fields, matching_feedback: hit.feedback }))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  return { query, total_matches: results.length, returned: Math.min(limit, results.length), results: results.slice(0, limit) };
}

async function findLeadInScope(args, access) {
  const { agents, scope } = await scopeAgents(access);
  const agentsById = new Map(agents.map((a) => [a.id, a]));
  const allowed = new Set(scope.map((a) => a.id));
  const leadId = cleanText(args.lead_id, 60);
  let row = null;
  if (leadId) {
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) throw new ToolInputError("lead_id must be a lead UUID from search_leads");
    row = (await rest(`sales_pipeline?select=${PIPELINE_FIELDS}&id=eq.${leadId}`))?.[0] || null;
  } else if (cleanText(args.phone, 40)) {
    const core = phoneCore(args.phone);
    if (core.length < 7) throw new ToolInputError("phone is too short");
    const rows = (await loadPipeline(scope)).filter((r) => phoneCore(r.phone) === core || phoneCore(r.phone).endsWith(core));
    if (rows.length > 1) {
      return { many: rows.map((r) => cardView(r, agentsById)) };
    }
    row = rows[0] || null;
  } else {
    throw new ToolInputError("Give lead_id or phone");
  }
  if (!row || !allowed.has(row.agent_id)) throw new ToolInputError("Lead not found");
  return { row, agentsById };
}

async function getLead(args, access) {
  const found = await findLeadInScope(args, access);
  if (found.many) return { message: "More than one card has this phone. Call get_lead again with one lead_id.", cards: found.many };
  const { row, agentsById } = found;
  const limit = boundedInteger(args.activity_limit, 50, 1, 200);
  const activity =
    (await rest(
      `sales_pipeline_activity?select=created_at,activity_type,body,from_stage,to_stage,actor_type,metadata&pipeline_id=eq.${row.id}&order=created_at.desc&limit=${limit}`,
    )) || [];
  return {
    lead: {
      ...cardView(row, agentsById),
      notes: row.notes || null,
      lost_reason: row.lost_reason || null,
      meeting: row.meeting_date ? { date: row.meeting_date, time: row.meeting_time, location: row.meeting_location } : null,
      created_at: row.created_at,
    },
    timeline: activity.map((a) => ({
      at: a.created_at,
      type: a.activity_type,
      text: a.body || null,
      from_stage: a.from_stage || undefined,
      to_stage: a.to_stage || undefined,
      by: a.metadata?.crm_feedback_author || a.actor_type,
    })),
  };
}

async function listFollowups(args, access) {
  const when = ["overdue", "today", "next_7_days", "no_date", "all_open"].includes(args.when) ? args.when : "overdue";
  const limit = boundedInteger(args.limit, 50, 1, 100);
  const { agents, scope } = await scopeAgents(access, args.agent);
  const agentsById = new Map(agents.map((a) => [a.id, a]));
  const today = cairoToday();
  const weekEnd = addDays(today, 7);
  const open = (await loadPipeline(scope)).filter((r) => !CLOSED_STAGES.has(r.stage));
  const pick = {
    overdue: (r) => r.next_action_date && r.next_action_date < today,
    today: (r) => r.next_action_date === today,
    next_7_days: (r) => r.next_action_date && r.next_action_date >= today && r.next_action_date <= weekEnd,
    no_date: (r) => !r.next_action_date,
    all_open: () => true,
  }[when];
  const rows = open
    .filter(pick)
    .sort(
      (a, b) =>
        String(a.next_action_date || "9999").localeCompare(String(b.next_action_date || "9999")) ||
        String(a.next_action_time || "").localeCompare(String(b.next_action_time || "")),
    );
  return { when, today_cairo: today, total: rows.length, returned: Math.min(limit, rows.length), leads: rows.slice(0, limit).map((r) => cardView(r, agentsById)) };
}

const warmValid = (nextAction, nextDate, trigger) =>
  Boolean(String(nextAction || "").trim() && (String(nextDate || "").trim() || String(trigger || "").trim()));

async function addCard(args, access) {
  const clientName = cleanText(args.client_name, 200);
  if (!clientName) throw new ToolInputError("client_name is required");
  const stage = args.stage ? cleanText(args.stage, 40) : "New Lead";
  if (!STAGES.includes(stage)) throw new ToolInputError(`stage must be one of: ${STAGES.join(", ")}`);
  const phone = cleanText(args.phone, 40);
  const nextAction = cleanText(args.next_action, 500);
  const nextDate = validDate(args.next_action_date, "next_action_date") ?? null;
  const nextTime = nextDate ? validTime(args.next_action_time, "next_action_time") ?? null : null;
  if (stage === "Warm" && !warmValid(nextAction, nextDate, "")) throw new ToolInputError("Warm needs next_action and next_action_date");
  if (stage === "Lost / Dead") throw new ToolInputError("Add the card first, then use update_feedback to mark it Lost with a lost_reason");
  if (stage === "Meeting Scheduled") throw new ToolInputError("Add the card first, then use update_feedback with meeting date, time and location");

  const { agents, scope, self } = await scopeAgents(access, args.agent);
  if (access.role === "owner" && !args.agent) throw new ToolInputError(`Choose the agent: ${agents.map((a) => a.slug).join(", ")}`);
  const agent = self || scope[0];
  const agentsById = new Map(agents.map((a) => [a.id, a]));

  if (phone) {
    const core = phoneCore(phone);
    const existing = (await loadPipeline([agent])).find((r) => core.length >= 7 && phoneCore(r.phone) === core);
    if (existing) {
      return { duplicate: true, message: "This client already has a card under this agent. Use update_feedback on it.", lead: cardView(existing, agentsById) };
    }
  }

  const notes = cleanText(args.notes, 4000);
  const submissionKey = createHash("sha256")
    .update(`${agent.id}|${digitsOnly(phone)}|${clientName.toLowerCase()}|${Math.floor(Date.now() / 30000)}`)
    .digest("hex");
  const [card] = await rest("sales_pipeline", {
    method: "POST",
    prefer: "return=representation",
    body: {
      agent_id: agent.id,
      client_name: clientName,
      phone,
      budget: cleanText(args.budget, 200),
      stage,
      next_action: nextAction,
      next_action_date: nextDate,
      next_action_time: nextTime,
      next_action_trigger: "",
      notes,
      campaign: cleanText(args.campaign, 200) || null,
      submission_key: submissionKey,
    },
  });

  const [history] =
    (await rest("sales_pipeline_history", {
      method: "POST",
      prefer: "return=representation",
      body: { pipeline_id: card.id, agent_id: agent.id, from_stage: null, to_stage: stage },
    })) || [];
  await logActivity(access, agent.id, card.id, "created", { to_stage: stage, metadata: { initial_stage: stage, source: "mcp" } });
  await logActivity(access, agent.id, card.id, "stage_change", {
    from_stage: null,
    to_stage: stage,
    metadata: { history_id: history?.id || null, initial: true, source: "mcp" },
  });
  if (notes) await logActivity(access, agent.id, card.id, "feedback", { body: notes, metadata: { source: "mcp" } });
  if (nextAction || nextDate) {
    await logActivity(access, agent.id, card.id, "followup_change", {
      body: nextAction,
      metadata: { source: "mcp", from: null, to: { next_action: nextAction, next_action_date: nextDate, next_action_time: nextTime, next_action_trigger: "" } },
    });
  }
  await snapshot(agent.id);
  return { created: true, lead: cardView(card, agentsById) };
}

async function updateFeedback(args, access) {
  const found = await findLeadInScope({ lead_id: args.lead_id }, access);
  const { row: old, agentsById } = found;
  const feedback = cleanText(args.feedback, 4000);
  const patch = {};

  if (args.stage !== undefined) {
    const stage = cleanText(args.stage, 40);
    if (!STAGES.includes(stage)) throw new ToolInputError(`stage must be one of: ${STAGES.join(", ")}`);
    if (stage !== old.stage) patch.stage = stage;
  }
  if (args.next_action !== undefined) patch.next_action = cleanText(args.next_action, 500);
  const nextDate = validDate(args.next_action_date, "next_action_date");
  if (nextDate !== undefined) {
    patch.next_action_date = nextDate;
    if (!nextDate) patch.next_action_time = null;
  }
  const nextTime = validTime(args.next_action_time, "next_action_time");
  if (nextTime !== undefined && (patch.next_action_date ?? old.next_action_date)) patch.next_action_time = nextTime;
  if (args.lost_reason !== undefined) {
    if (!LOST_REASONS.includes(args.lost_reason)) throw new ToolInputError(`lost_reason must be one of: ${LOST_REASONS.join(", ")}`);
    patch.lost_reason = args.lost_reason;
  }
  const meetingDate = validDate(args.meeting_date, "meeting_date");
  if (meetingDate !== undefined) patch.meeting_date = meetingDate;
  const meetingTime = validTime(args.meeting_time, "meeting_time");
  if (meetingTime !== undefined) patch.meeting_time = meetingTime;
  if (args.meeting_location !== undefined) {
    if (!MEETING_LOCATIONS.includes(args.meeting_location)) throw new ToolInputError(`meeting_location must be one of: ${MEETING_LOCATIONS.join(", ")}`);
    patch.meeting_location = args.meeting_location;
  }

  if (!feedback && !Object.keys(patch).length) throw new ToolInputError("Nothing to update: give feedback, stage or a next follow-up");

  const merged = { ...old, ...patch };
  if (merged.stage === "Warm" && !warmValid(merged.next_action, merged.next_action_date, merged.next_action_trigger)) {
    throw new ToolInputError("Warm needs next_action and next_action_date");
  }
  if (patch.stage === "Lost / Dead" && !merged.lost_reason) throw new ToolInputError(`Lost needs lost_reason: ${LOST_REASONS.join(", ")}`);
  if (merged.stage === "Meeting Scheduled" && (patch.stage || meetingDate !== undefined) && (!merged.meeting_date || !merged.meeting_time || !merged.meeting_location)) {
    throw new ToolInputError("Meeting Scheduled needs meeting_date, meeting_time and meeting_location");
  }

  let updated = old;
  if (Object.keys(patch).length) {
    [updated] = await rest(`sales_pipeline?id=eq.${old.id}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  } else {
    [updated] = await rest(`sales_pipeline?id=eq.${old.id}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: { updated_at: new Date().toISOString() },
    });
  }

  if (feedback) await logActivity(access, old.agent_id, old.id, "feedback", { body: feedback, metadata: { source: "mcp" } });

  if (patch.stage) {
    const [history] =
      (await rest("sales_pipeline_history", {
        method: "POST",
        prefer: "return=representation",
        body: { pipeline_id: old.id, agent_id: old.agent_id, from_stage: old.stage, to_stage: patch.stage },
      })) || [];
    await logActivity(access, old.agent_id, old.id, "stage_change", {
      from_stage: old.stage,
      to_stage: patch.stage,
      metadata: {
        source: "mcp",
        history_id: history?.id || null,
        lost_reason: patch.stage === "Lost / Dead" ? updated.lost_reason || null : undefined,
        meeting:
          patch.stage === "Meeting Scheduled"
            ? { date: updated.meeting_date, time: updated.meeting_time, location: updated.meeting_location }
            : undefined,
      },
    });
  }

  const followKeys = ["next_action", "next_action_date", "next_action_time"];
  if (followKeys.some((k) => k in patch && String(old[k] ?? "") !== String(updated[k] ?? ""))) {
    await logActivity(access, old.agent_id, old.id, "followup_change", {
      body: String(updated.next_action || "").trim(),
      metadata: {
        source: "mcp",
        from: { next_action: old.next_action, next_action_date: old.next_action_date, next_action_time: old.next_action_time, next_action_trigger: old.next_action_trigger },
        to: { next_action: updated.next_action, next_action_date: updated.next_action_date, next_action_time: updated.next_action_time, next_action_trigger: updated.next_action_trigger },
      },
    });
  }

  await snapshot(old.agent_id);
  return { updated: true, feedback_added: Boolean(feedback), stage_changed: Boolean(patch.stage), lead: cardView(updated, agentsById) };
}

async function searchUnits(args) {
  const query = cleanText(args.query, 300);
  if (query.length < 2) throw new ToolInputError("query must contain at least 2 characters");
  const limit = boundedInteger(args.limit, 8, 1, 20);
  const units = await loadInventory();
  const result = searchInventory(units, query);
  const view = (item, match) => ({
    match,
    unit_id: inventoryUnitId(item.unit),
    project: item.unit.project_name,
    developer: item.unit.developer,
    location: item.unit.location,
    unit_type: item.unit.unit_type,
    bedrooms: item.unit.bedrooms_text,
    area_sqm: item.unit.area_sqm,
    starting_price_egp: item.unit.starting_price,
    down_payment: item.unit.down_payment_text,
    installments: item.unit.installments_text,
    delivery: item.unit.delivery_text,
    finishing: item.unit.finishing,
    availability: item.unit.availability_status,
    differences: item.differences,
  });
  const results = [...result.exact.map((i) => view(i, "exact")), ...result.alternatives.map((i) => view(i, "alternative"))].slice(0, limit);
  return { query, interpreted: result.interpreted, exact_count: result.totalExact, alternative_count: result.totalAlternatives, results };
}

const TOOL_HANDLERS = {
  list_agents: listAgents,
  search_leads: searchLeads,
  get_lead: getLead,
  list_followups: listFollowups,
  add_war_room_card: addCard,
  update_feedback: updateFeedback,
  search_units: searchUnits,
};

// ---------------------------------------------------------------- JSON-RPC

const jsonRpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const jsonRpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const toolResult = (data) => ({ content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, isError: false });
const toolError = (error) => ({
  content: [{ type: "text", text: error instanceof ToolInputError ? error.message : "Tool failed. Try again or check the Netlify function log." }],
  isError: true,
});

function headers(protocolVersion = LATEST_PROTOCOL_VERSION, origin = null) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "MCP-Protocol-Version": protocolVersion,
    ...(origin
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
        }
      : {}),
  };
}

async function handleRpc(body, access, protocolHeader) {
  if (!body || typeof body !== "object" || Array.isArray(body) || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return { status: 400, body: jsonRpcError(body?.id, -32600, "Invalid Request") };
  }
  const isNotification = body.id === undefined;
  let protocolVersion = LATEST_PROTOCOL_VERSION;
  if (body.method === "initialize") {
    const requested = cleanText(body.params?.protocolVersion, 32);
    protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requested) ? requested : LATEST_PROTOCOL_VERSION;
  } else if (protocolHeader) {
    if (!SUPPORTED_PROTOCOL_VERSIONS.has(protocolHeader)) {
      return { status: 400, body: jsonRpcError(body.id, -32600, "Unsupported MCP-Protocol-Version") };
    }
    protocolVersion = protocolHeader;
  }

  if (isNotification) return { status: 202, body: null, protocolVersion };

  if (body.method === "initialize") {
    return {
      status: 200,
      protocolVersion,
      body: jsonRpcResult(body.id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, title: "Tycoons Sales War Room", version: SERVER_VERSION },
        instructions:
          access.role === "owner"
            ? "Owner access: every agent. Search leads before adding a card to avoid duplicates. Dates are Cairo time. Confirm with the user before add_war_room_card or update_feedback."
            : `Agent access for ${access.agentSlug}: only this agent's cards. Search leads before adding a card. Dates are Cairo time. Confirm with the user before writing.`,
      }),
    };
  }
  if (body.method === "ping") return { status: 200, protocolVersion, body: jsonRpcResult(body.id, {}) };
  if (body.method === "tools/list") return { status: 200, protocolVersion, body: jsonRpcResult(body.id, { tools: TOOL_DEFINITIONS }) };
  if (body.method === "tools/call") {
    const name = cleanText(body.params?.name, 100);
    const handler = TOOL_HANDLERS[name];
    if (!handler) return { status: 200, protocolVersion, body: jsonRpcResult(body.id, toolError(new ToolInputError(`Unknown tool: ${name || "missing"}`))) };
    const args = body.params?.arguments && typeof body.params.arguments === "object" ? body.params.arguments : {};
    try {
      return { status: 200, protocolVersion, body: jsonRpcResult(body.id, toolResult(await handler(args, access))) };
    } catch (error) {
      if (!(error instanceof ToolInputError)) console.error(`[War Room MCP] ${name} failed`, error);
      return { status: 200, protocolVersion, body: jsonRpcResult(body.id, toolError(error)) };
    }
  }
  return { status: 200, protocolVersion, body: jsonRpcError(body.id, -32601, "Method not found") };
}

export default async function warRoomMcp(request, context) {
  const origin = request.headers.get("origin");
  const originOk = !origin || ALLOWED_ORIGINS.has(origin) || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
  const corsOrigin = origin && originOk ? origin : null;
  if (!originOk) return new Response(JSON.stringify(jsonRpcError(null, -32600, "Origin not allowed")), { status: 403, headers: headers() });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(undefined, corsOrigin) });

  const secret = context?.params?.key || new URL(request.url).pathname.split("/").filter(Boolean).pop();
  const access = resolveAccess(secret);
  if (!access) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: headers(undefined, corsOrigin) });

  if (request.method !== "POST") {
    return new Response(JSON.stringify(jsonRpcError(null, -32600, "Only POST is supported")), {
      status: 405,
      headers: { ...headers(undefined, corsOrigin), Allow: "POST, OPTIONS" },
    });
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return new Response(JSON.stringify(jsonRpcError(null, -32600, "Content-Type must be application/json")), { status: 415, headers: headers(undefined, corsOrigin) });
  }
  const text = await request.text().catch(() => "");
  if (!text || Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return new Response(JSON.stringify(jsonRpcError(null, -32700, text ? "Request body is too large" : "Empty request body")), {
      status: text ? 413 : 400,
      headers: headers(undefined, corsOrigin),
    });
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify(jsonRpcError(null, -32700, "Parse error")), { status: 400, headers: headers(undefined, corsOrigin) });
  }
  const result = await handleRpc(body, access, request.headers.get("mcp-protocol-version"));
  return new Response(result.body === null ? null : JSON.stringify(result.body), {
    status: result.status,
    headers: headers(result.protocolVersion, corsOrigin),
  });
}

export const config = {
  path: "/mcp/war-room/:key",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
