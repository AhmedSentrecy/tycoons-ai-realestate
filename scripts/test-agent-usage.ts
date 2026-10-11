// Tests the AI agent usage counter without touching the network:
// every fetch is replaced by a fake that records what would be sent.
import assert from "node:assert/strict";

import { agentResultCount, agentToolCallRow, recordAgentToolCall } from "../src/lib/agentUsage.ts";

type Sent = { url: string; body: Record<string, unknown> };
const sent: Sent[] = [];
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("/rest/v1/agent_tool_calls")) {
    sent.push({ url, body: JSON.parse(String(init?.body)) });
    return new Response(null, { status: 201 });
  }
  // Inventory reads: an empty but valid inventory.
  return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

// 1) Row cleaning: bad tool names, long text, and bad counts are made safe.
const row = agentToolCallRow({
  channel: "webmcp",
  tool: "Search_Properties",
  ok: true,
  query: "  فيلا في التجمع  " + "x".repeat(400),
  resultCount: 3,
  client: 42,
  pagePath: "/",
});
assert.equal(row.channel, "webmcp");
assert.equal(row.tool, "search_properties");
assert.equal(row.query?.length, 300);
assert.ok(row.query?.startsWith("فيلا في التجمع"));
assert.equal(row.result_count, 3);
assert.equal(row.client, null);
assert.equal(agentToolCallRow({ channel: "mcp", tool: "bad tool!", ok: true }).tool, "unknown");
assert.equal(agentToolCallRow({ channel: "mcp", tool: "x", ok: true, resultCount: -1 }).result_count, null);

// 2) Result counting.
assert.equal(agentResultCount({ results: [1, 2] }), 2);
assert.equal(agentResultCount({ comparison: [1, 2, 3] }), 3);
assert.equal(agentResultCount({ property: {} }), 1);
assert.equal(agentResultCount({ total_units: 5 }), null);

// 3) A failing network never throws.
const failed = await recordAgentToolCall({ channel: "mcp", tool: "ping", ok: true }, (async () => {
  throw new Error("offline");
}) as unknown as typeof fetch);
assert.equal(failed, false);

// 4) The public MCP server logs a successful tool call and a failed one.
const { default: mcp } = await import("../netlify/functions/mcp.js");
async function rpc(body: Record<string, unknown>) {
  return mcp(
    new Request("https://tycoons-inv.com/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "TestAgent/1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
    }),
  );
}
sent.length = 0;
const ok = await rpc({ method: "tools/call", params: { name: "get_inventory_summary", arguments: {} } });
assert.equal(ok.status, 200);
const okLog = sent.find((item) => item.body.tool === "get_inventory_summary");
assert.ok(okLog, "MCP success was not logged");
assert.equal(okLog.body.channel, "mcp");
assert.equal(okLog.body.ok, true);
assert.equal(okLog.body.client, "TestAgent/1.0");

sent.length = 0;
await rpc({ method: "tools/call", params: { name: "get_property_details", arguments: { unit_id: "nope" } } });
const failLog = sent.find((item) => item.body.tool === "get_property_details");
assert.ok(failLog, "MCP failure was not logged");
assert.equal(failLog.body.ok, false);

// 5) WebMCP wrapper logs calls and passes results and errors through unchanged.
(globalThis as Record<string, unknown>).window = { location: { pathname: "/search", href: "https://tycoons-inv.com/search" } };
const { withUsageLogging } = await import("../src/lib/webmcp.ts");
sent.length = 0;
const wrapped = withUsageLogging({
  name: "search_properties",
  description: "test",
  inputSchema: {},
  execute: async () => ({ results: [1, 2, 3] }),
});
assert.deepEqual(await wrapped.execute({ query: "شقة" }), { results: [1, 2, 3] });
await new Promise((resolve) => setTimeout(resolve, 20));
const webLog = sent.find((item) => item.body.channel === "webmcp");
assert.ok(webLog, "WebMCP call was not logged");
assert.equal(webLog.body.query, "شقة");
assert.equal(webLog.body.result_count, 3);
assert.equal(webLog.body.page_path, "/search");

const broken = withUsageLogging({
  name: "compare_properties",
  description: "test",
  inputSchema: {},
  execute: async () => {
    throw new Error("bad ids");
  },
});
await assert.rejects(() => Promise.resolve(broken.execute({})), /bad ids/);

globalThis.fetch = realFetch;
console.log("Agent usage counter tests passed");
