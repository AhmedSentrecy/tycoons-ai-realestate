// Offline test for netlify/functions/war-room-mcp.js.
// Replaces fetch with a tiny in-memory PostgREST, so nothing touches the real database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const OWNER_KEY = "owner_test_key_0123456789abcdef";
const AGENT_KEY = "agent_test_key_0123456789abcdef";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.SUPABASE_URL = "https://db.test";
process.env.WAR_ROOM_MCP_KEYS = JSON.stringify({ [OWNER_KEY]: "owner", [AGENT_KEY]: "mostafa-amr" });

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const AHMED = randomUUID();
const MOSTAFA = randomUUID();
const L1 = randomUUID();
const L2 = randomUUID();
const L3 = randomUUID();

const db = {
  sales_agents: [
    { id: AHMED, slug: "ahmed-yehia", name_en: "Ahmed Yehia", name_ar: "أحمد يحيى", active: true },
    { id: MOSTAFA, slug: "mostafa-amr", name_en: "Mostafa Amr", name_ar: "مصطفى عمرو", active: true },
  ],
  sales_pipeline: [
    { id: L1, agent_id: AHMED, client_name: "دكتورة نورة", phone: "+20 100 123 4567", stage: "Warm", next_action: "call", next_action_date: "2020-01-01", next_action_time: null, next_action_trigger: "", notes: "", budget: "", updated_at: "2026-11-23T10:00:00Z" },
    { id: L2, agent_id: MOSTAFA, client_name: "Hany Daoud", phone: "+966 55 111 2222", stage: "Contacted", next_action: "", next_action_date: today, next_action_time: "17:00:00", next_action_trigger: "", notes: "", budget: "", updated_at: "2026-11-22T10:00:00Z" },
    { id: L3, agent_id: MOSTAFA, client_name: "Old buyer", phone: "+20 111 000 9999", stage: "Lost / Dead", next_action: "", next_action_date: null, next_action_time: null, next_action_trigger: "", notes: "", budget: "", updated_at: "2026-11-01T10:00:00Z" },
  ],
  sales_pipeline_activity: [
    { id: randomUUID(), pipeline_id: L1, agent_id: AHMED, activity_type: "feedback", body: "عايزة تنقل، معاها مليون مقدم واستقرينا على سراي", created_at: "2026-11-23T12:24:00Z", actor_type: "system", metadata: { crm_feedback_author: "Ahmed Yehya", crm_feedback_at_cairo: `${today} 14:24` } },
    { id: randomUUID(), pipeline_id: L2, agent_id: MOSTAFA, activity_type: "feedback", body: "na", created_at: "2026-11-22T12:30:00Z", actor_type: "system", metadata: { crm_feedback_author: "Ahmed Yehya", crm_feedback_at_cairo: "2020-01-01 10:00" } },
    { id: randomUUID(), pipeline_id: L2, agent_id: MOSTAFA, activity_type: "feedback", body: "interested in Mountain View iCity", created_at: "2026-11-22T12:00:00Z", actor_type: "system", metadata: {} },
  ],
  sales_pipeline_history: [],
  sales_pipeline_snapshots: [],
  units: [],
  projects: [],
};

function parseValue(v) {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [key, value] of params) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (value.startsWith("eq.")) out = out.filter((r) => String(r[key]) === String(parseValue(value.slice(3))));
    else if (value.startsWith("in.(")) {
      const ids = value.slice(4, -1).split(",").map((s) => s.replace(/^"|"$/g, ""));
      out = out.filter((r) => ids.includes(String(r[key])));
    } else if (value === "not.is.null") out = out.filter((r) => r[key] !== null && r[key] !== undefined);
  }
  return out;
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const table = url.pathname.split("/").pop();
  const rows = db[table];
  if (!rows) return new Response("[]", { status: 200 });
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  if (method === "GET") {
    let out = applyFilters(rows, url.searchParams);
    const order = url.searchParams.get("order");
    if (order) {
      const [col, dir] = order.split(".");
      out = [...out].sort((a, b) => String(a[col] ?? "").localeCompare(String(b[col] ?? "")) * (dir === "desc" ? -1 : 1));
    }
    const range = headers.get("range");
    if (range) {
      const [from, to] = range.split("-").map(Number);
      out = out.slice(from, to + 1);
    }
    const limit = url.searchParams.get("limit");
    if (limit) out = out.slice(0, Number(limit));
    return new Response(JSON.stringify(out), { status: 200 });
  }
  if (method === "POST") {
    const body = JSON.parse(init.body);
    const row = { id: table === "sales_pipeline_history" ? rows.length + 1 : randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...body };
    rows.push(row);
    return new Response(headers.get("prefer")?.includes("representation") ? JSON.stringify([row]) : "", { status: 201 });
  }
  if (method === "PATCH") {
    const body = JSON.parse(init.body);
    const targets = applyFilters(rows, url.searchParams);
    targets.forEach((r) => Object.assign(r, body));
    return new Response(JSON.stringify(targets), { status: 200 });
  }
  return new Response("unsupported", { status: 500 });
};

const { default: warRoomMcp, config, resolveAccess, normalizeText } = await import("../netlify/functions/war-room-mcp.js");

let rpcId = 0;
async function call(key, method, params = {}) {
  const response = await warRoomMcp(
    new Request(`https://tycoons-inv.com/mcp/war-room/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "MCP-Protocol-Version": "2025-11-25" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    }),
    { params: { key } },
  );
  return { status: response.status, body: response.status === 202 || response.status === 404 ? null : await response.json() };
}
const tool = async (key, name, args = {}) => (await call(key, "tools/call", { name, arguments: args })).body.result;
const ok = (result) => {
  assert.equal(result.isError, false, result.content?.[0]?.text);
  return result.structuredContent;
};

// --- routing and access
assert.equal(config.path, "/mcp/war-room/:key");
assert.equal(resolveAccess("wrong"), null);
assert.deepEqual(resolveAccess(OWNER_KEY), { role: "owner" });
assert.deepEqual(resolveAccess(AGENT_KEY), { role: "agent", agentSlug: "mostafa-amr" });
assert.equal((await call("not-a-real-key-000000000000000", "tools/list")).status, 404);
assert.equal(normalizeText("دكتورة إيمان ٠١٠"), "دكتوره ايمان 010");

// --- protocol
const init = await call(OWNER_KEY, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
assert.equal(init.status, 200);
assert.equal(init.body.result.protocolVersion, "2025-06-18");
const list = await call(OWNER_KEY, "tools/list");
assert.deepEqual(
  list.body.result.tools.map((t) => t.name),
  ["list_agents", "search_leads", "get_lead", "agent_report", "list_followups", "add_war_room_card", "update_feedback", "search_units"],
);

// --- list_agents
const agents = ok(await tool(OWNER_KEY, "list_agents"));
assert.equal(agents.agents.length, 2);
assert.equal(agents.agents.find((a) => a.slug === "ahmed-yehia").overdue, 1);
assert.equal(ok(await tool(AGENT_KEY, "list_agents")).agents.length, 1);

// --- search_leads: inside feedback, with Arabic spelling variants
let found = ok(await tool(OWNER_KEY, "search_leads", { query: "علي سراي" }));
assert.equal(found.total_matches, 1);
assert.equal(found.results[0].lead_id, L1);
assert.deepEqual(found.results[0].matched_in, ["feedback"]);
found = ok(await tool(OWNER_KEY, "search_leads", { query: "دكتوره نوره" }));
assert.equal(found.results[0].lead_id, L1);
found = ok(await tool(OWNER_KEY, "search_leads", { query: "01001234567" }));
assert.equal(found.results[0].lead_id, L1, "phone search ignores spaces and +20");
found = ok(await tool(OWNER_KEY, "search_leads", { query: "mountain view" }));
assert.equal(found.results[0].lead_id, L2);
// agent link cannot see another agent's leads
assert.equal(ok(await tool(AGENT_KEY, "search_leads", { query: "سراي" })).total_matches, 0);
assert.equal(ok(await tool(OWNER_KEY, "search_leads", { query: "buyer", include_closed: false })).total_matches, 0);

// --- get_lead
const lead = ok(await tool(OWNER_KEY, "get_lead", { phone: "0100 123 4567" }));
assert.equal(lead.lead.lead_id, L1);
assert.equal(lead.timeline[0].by, "Ahmed Yehya");
assert.equal((await tool(AGENT_KEY, "get_lead", { lead_id: L1 })).isError, true);

// --- list_followups
assert.equal(ok(await tool(OWNER_KEY, "list_followups", { when: "overdue" })).total, 1);
assert.equal(ok(await tool(OWNER_KEY, "list_followups", { when: "today" })).leads[0].lead_id, L2);
assert.equal(ok(await tool(OWNER_KEY, "list_followups", { when: "today", agent: "أحمد" })).total, 0);

// --- add_war_room_card
assert.equal((await tool(OWNER_KEY, "add_war_room_card", { client_name: "X" })).isError, true, "owner must choose agent");
const dup = ok(await tool(OWNER_KEY, "add_war_room_card", { agent: "mostafa", client_name: "Hany", phone: "00966551112222" }));
assert.equal(dup.duplicate, true, "00966 and +966 are the same phone");
const dup2 = ok(await tool(OWNER_KEY, "add_war_room_card", { agent: "mostafa", client_name: "Hany again", phone: "+966 55 111 2222" }));
assert.equal(dup2.duplicate, true);
assert.equal((await tool(OWNER_KEY, "add_war_room_card", { agent: "mostafa", client_name: "W", stage: "Warm" })).isError, true);
const created = ok(
  await tool(AGENT_KEY, "add_war_room_card", {
    agent: "ahmed-yehia", // ignored: agent links always add under themselves
    client_name: "عميل جديد",
    phone: "01234567890",
    notes: "عايز فيلا في الشيخ زايد",
    next_action: "ابعتله البروشور",
    next_action_date: today,
    next_action_time: "18:30",
  }),
);
assert.equal(created.lead.agent, "mostafa-amr");
const newId = created.lead.lead_id;
const acts = db.sales_pipeline_activity.filter((a) => a.pipeline_id === newId).map((a) => a.activity_type);
assert.deepEqual(acts, ["created", "stage_change", "feedback", "followup_change"]);
assert.equal(db.sales_pipeline_activity.find((a) => a.pipeline_id === newId).actor_type, "agent");
assert.equal(db.sales_pipeline_history.length, 1);
assert.ok(db.sales_pipeline_snapshots.length >= 1);
assert.equal(ok(await tool(OWNER_KEY, "search_leads", { query: "الشيخ زايد" })).results[0].lead_id, newId);

// --- update_feedback
assert.equal((await tool(OWNER_KEY, "update_feedback", { lead_id: newId })).isError, true, "nothing to update");
assert.equal((await tool(OWNER_KEY, "update_feedback", { lead_id: newId, stage: "Lost / Dead" })).isError, true, "lost needs reason");
assert.equal((await tool(OWNER_KEY, "update_feedback", { lead_id: newId, stage: "Meeting Scheduled" })).isError, true);
const upd = ok(
  await tool(OWNER_KEY, "update_feedback", {
    lead_id: newId,
    feedback: "اتفقنا على زيارة الموقع",
    stage: "Meeting Scheduled",
    meeting_date: today,
    meeting_time: "12:00",
    meeting_location: "Site",
  }),
);
assert.equal(upd.stage_changed, true);
assert.equal(db.sales_pipeline.find((r) => r.id === newId).stage, "Meeting Scheduled");
assert.equal(db.sales_pipeline_history.length, 2);
const lastActs = db.sales_pipeline_activity.filter((a) => a.pipeline_id === newId).slice(-2);
assert.deepEqual(lastActs.map((a) => [a.activity_type, a.actor_type]), [["feedback", "owner"], ["stage_change", "owner"]]);
assert.equal((await tool(AGENT_KEY, "update_feedback", { lead_id: L1, feedback: "x" })).isError, true, "agent cannot edit others");
assert.equal((await tool(OWNER_KEY, "update_feedback", { lead_id: L2, next_action_date: "23-11-2026" })).isError, true);
ok(await tool(OWNER_KEY, "update_feedback", { lead_id: L2, next_action: "كلمه بكرة", next_action_date: "" }));
assert.equal(db.sales_pipeline.find((r) => r.id === L2).next_action_date, null);

// --- search_leads with no query lists leads
const listed = ok(await tool(OWNER_KEY, "search_leads", { agent: "mostafa", stage: "Contacted" }));
assert.equal(listed.mode, "list");
assert.ok(listed.results.every((r) => r.agent === "mostafa-amr" && r.stage === "Contacted"));
assert.equal(ok(await tool(AGENT_KEY, "search_leads", {})).results.every((r) => r.agent === "mostafa-amr"), true);
assert.equal((await tool(OWNER_KEY, "search_leads", { query: "x" })).isError, true, "one letter is still refused");

// --- agent_report
const team = ok(await tool(OWNER_KEY, "agent_report"));
assert.equal(team.mode, "team");
const ahmedRow = team.team.find((r) => r.agent === "ahmed-yehia");
assert.equal(ahmedRow.feedback_written_30d, 1, "CRM author 'Ahmed Yehya' matches agent 'Ahmed Yehia'; the 2020 line is outside 30 days");
const rep = ok(await tool(OWNER_KEY, "agent_report", { agent: "أحمد يحيى" }));
assert.equal(rep.mode, "agent");
assert.equal(rep.numbers.agent, "ahmed-yehia");
assert.equal(rep.numbers.open_leads, 1);
assert.equal(rep.numbers.overdue, 1);
assert.equal(rep.numbers.open_untouched_30d, 0);
assert.equal(rep.last_feedback_on_open_leads.real_conversation, 1);
assert.equal(rep.weekly_feedback.length, 12);
assert.equal(rep.weekly_feedback.reduce((n, w) => n + w.feedback_lines, 0), 1);
assert.equal(rep.call_first[0].lead_id, L1);
assert.equal(rep.call_first[0].followup_status, "overdue");
const mine = ok(await tool(AGENT_KEY, "agent_report", { agent: "ahmed-yehia" }));
assert.equal(mine.numbers.agent, "mostafa-amr", "agent links always report on themselves");

// --- search_units responds (empty inventory in this offline test)
assert.equal(ok(await tool(OWNER_KEY, "search_units", { query: "شقة التجمع" })).results.length, 0);

console.log("war-room-mcp: all checks passed");
