import assert from "node:assert/strict";

import mcpHealth, {
  config as healthConfig,
} from "../netlify/functions/mcp-health.js";
import mcp, { config } from "../netlify/functions/mcp.js";

const ENDPOINT = "https://tycoons-inv.com/mcp";
const PROTOCOL_VERSION = "2025-11-25";

async function rpc(id, method, params = {}, headers = {}) {
  const response = await mcp(
    new Request(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": PROTOCOL_VERSION,
        ...headers,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  const body = response.status === 202 ? null : await response.json();
  return { response, body };
}

function structured(result) {
  assert.equal(result?.isError, false, result?.content?.[0]?.text);
  return result.structuredContent;
}

async function run() {
  assert.deepEqual(config.rateLimit, {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  });
  assert.equal(config.path, "/mcp");
  assert.equal(healthConfig.path, "/mcp/health");

  const health = await mcpHealth(new Request("https://tycoons-inv.com/mcp/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true,
    service: "tycoons-property-search",
    version: "1.0.0",
    transport: "streamable-http",
    endpoint: "https://tycoons-inv.com/mcp",
    authentication: "none",
  });

  const initialize = await rpc(1, "initialize", {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "tycoons-test", version: "1.0.0" },
  });
  assert.equal(initialize.response.status, 200);
  assert.equal(initialize.body.result.protocolVersion, PROTOCOL_VERSION);
  assert.equal(initialize.body.result.serverInfo.name, "tycoons-property-search");
  assert.deepEqual(initialize.body.result.capabilities, {
    tools: { listChanged: false },
  });

  const initialized = await mcp(
    new Request(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "MCP-Protocol-Version": PROTOCOL_VERSION,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    }),
  );
  assert.equal(initialized.status, 202);

  const list = await rpc(2, "tools/list");
  const toolNames = list.body.result.tools.map((tool) => tool.name);
  assert.deepEqual(toolNames, [
    "search_properties",
    "get_property_details",
    "compare_properties",
    "calculate_payment_plan",
    "create_whatsapp_inquiry",
  ]);
  assert.ok(
    list.body.result.tools.every((tool) => tool.annotations.readOnlyHint),
  );

  const search = await rpc(3, "tools/call", {
    name: "search_properties",
    arguments: { query: "Mountain View Aliva", limit: 4 },
  });
  const searchData = structured(search.body.result);
  assert.ok(searchData.results.length > 1);
  assert.ok(searchData.results.length <= 4);
  assert.ok(searchData.results.every((unit) => /^unit_[a-f0-9]{16}$/.test(unit.unit_id)));
  assert.ok(searchData.results.some((unit) => /aliva/i.test(unit.project)));

  const firstId = searchData.results[0].unit_id;
  const secondId = searchData.results[1].unit_id;

  const details = await rpc(4, "tools/call", {
    name: "get_property_details",
    arguments: { unit_id: firstId },
  });
  const detailsData = structured(details.body.result);
  assert.equal(detailsData.property.unit_id, firstId);
  assert.ok(detailsData.property.starting_price_egp > 0);
  assert.ok(Array.isArray(detailsData.property.images));
  assert.equal("source_reference" in detailsData.property, false);
  assert.equal("internal_notes" in detailsData.property, false);

  const comparison = await rpc(5, "tools/call", {
    name: "compare_properties",
    arguments: { unit_ids: [firstId, secondId] },
  });
  const comparisonData = structured(comparison.body.result);
  assert.equal(comparisonData.comparison.length, 2);
  assert.ok(comparisonData.factual_highlights.lowest_starting_price_unit_id);

  const calculation = await rpc(6, "tools/call", {
    name: "calculate_payment_plan",
    arguments: {
      unit_id: firstId,
      down_payment_percent: 10,
      installment_years: 8,
      payments_per_year: 4,
    },
  });
  const calculationData = structured(calculation.body.result);
  assert.equal(calculationData.installment_count, 32);
  assert.equal(calculationData.down_payment_percent, 10);
  assert.ok(calculationData.equal_installment_egp > 0);
  assert.match(calculationData.notice, /Illustrative/);

  const invalidCadence = await rpc(61, "tools/call", {
    name: "calculate_payment_plan",
    arguments: {
      price_egp: 10_000_000,
      installment_years: 8,
      payments_per_year: 20,
    },
  });
  assert.equal(invalidCadence.body.result.isError, true);

  const whatsapp = await rpc(7, "tools/call", {
    name: "create_whatsapp_inquiry",
    arguments: {
      unit_ids: [firstId, secondId],
      request: "Please send the latest payment plans",
      language: "en",
    },
  });
  const whatsappData = structured(whatsapp.body.result);
  assert.match(whatsappData.url, /^https:\/\/wa\.me\/201200704344\?text=/);
  assert.equal(whatsappData.sent, false);
  assert.match(whatsappData.tracking_id, /^wa_mcp_[a-f0-9]{10}$/);

  const invalidTool = await rpc(8, "tools/call", {
    name: "delete_inventory",
    arguments: {},
  });
  assert.equal(invalidTool.body.result.isError, true);

  const invalidOrigin = await rpc(
    9,
    "ping",
    {},
    { Origin: "https://attacker.example" },
  );
  assert.equal(invalidOrigin.response.status, 403);

  const oversized = await mcp(
    new Request(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(70 * 1024),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 10, method: "ping" }),
    }),
  );
  assert.equal(oversized.status, 413);

  console.log(
    `MCP server tests passed: ${toolNames.length} tools, ${searchData.results.length} live search results`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
