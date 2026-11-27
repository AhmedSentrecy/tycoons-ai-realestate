import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import mcpHealth, {
  config as healthConfig,
} from "../netlify/functions/mcp-health.js";
import mcp, { config } from "../netlify/functions/mcp.js";
import {
  hasProjectExpert,
  projectExpertFull,
  projectExpertSummary,
} from "../src/lib/projectExperts.ts";

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

const ICITY_NEW_CAIRO = "mountain-view-icity-new-cairo--mountain-view";

// Expert cards: short in search results, full in get_property_details (no network needed).
function testProjectExpertCards() {
  assert.equal(hasProjectExpert(ICITY_NEW_CAIRO), true);
  assert.equal(projectExpertSummary("unknown-project"), null);
  assert.equal(projectExpertFull(""), null);

  const summary = projectExpertSummary(ICITY_NEW_CAIRO);
  assert.equal(summary.project, "ماونتن فيو آي سيتي التجمع");
  assert.ok(summary.key_facts.length >= 3 && summary.key_facts.length <= 6);
  assert.ok(summary.advantage.length > 0);
  assert.equal(summary.disadvantage.say_only_if_client_asks, true);
  assert.match(summary.notice, /paid until handover/);
  // the short card stays short: no unit lists, rent tables or ask-only answers
  for (const key of ["available_units", "rent", "yield_example", "ask_only_if_client_asks", "payment_plans"]) {
    assert.equal(key in summary, false, `summary should not carry ${key}`);
  }

  const full = projectExpertFull(ICITY_NEW_CAIRO);
  assert.ok(full.available_units.units.length > 0);
  assert.ok(full.rent.segments.some((s) => s.bedrooms === 3 && s.furnished === false && s.average_egp > 0));
  assert.equal(full.yield_example.paid_until_handover_egp, 1861906);
  assert.ok(full.ask_only_if_client_asks.length > 0);
  assert.ok(full.payment_plans.phases.some((p) => p.phase === "Club Park"));
  assert.ok(JSON.stringify(summary).length < JSON.stringify(full).length / 2);
  // the public card never carries internal sources
  assert.doesNotMatch(JSON.stringify(full), /wa_message_log|Tai Tycoons|internal_notes/);
}

async function run() {
  testProjectExpertCards();

  // Sarah is told to search with property criteria only, not the rent/price question words.
  assert.match(readFileSync("netlify/functions/mcp.js", "utf8"), /leave out question words such as rent, yield, price/);

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
    version: "1.1.0",
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
    "get_inventory_summary",
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
  assert.ok(searchData.results.every((unit) => unit.data_provenance.confidence === "high"));
  assert.ok(searchData.results.some((unit) => /aliva/i.test(unit.project)));
  // payment details: the live developer offer reaches the MCP (not only "2%" / "14 years")
  const aliva = searchData.results.find((unit) => /aliva/i.test(unit.project));
  assert.ok(aliva.payment_details, "Aliva result should carry payment_details");
  assert.ok(Array.isArray(aliva.payment_details.current_offer?.plans) && aliva.payment_details.current_offer.plans.length > 0);
  assert.match(aliva.payment_details.notice, /do not convert it into equal installments/);

  // project_expert: Aliva has a reviewed card now; the MCP copy never says how a figure was collected
  assert.ok(aliva.project_expert, "Aliva result should carry project_expert");
  assert.doesNotMatch(JSON.stringify(aliva.project_expert), /اتقفلت|مطلوبة في|listings|confidence|"evidence"/);

  const icitySearch = await rpc(32, "tools/call", {
    name: "search_properties",
    arguments: { query: "Mountain View iCity New Cairo", limit: 10 },
  });
  const icityData = structured(icitySearch.body.result);
  const icityUnit = icityData.results.find((unit) => unit.project_expert);
  assert.ok(icityUnit, "an iCity New Cairo result should carry project_expert");
  assert.equal(icityUnit.project_expert.project, "ماونتن فيو آي سيتي التجمع");
  assert.ok(icityUnit.project_expert.key_facts.length > 0);
  assert.equal(icityUnit.project_expert.disadvantage.say_only_if_client_asks, true);
  assert.equal("available_units" in icityUnit.project_expert, false, "search keeps the card short");

  const icityDetails = await rpc(33, "tools/call", {
    name: "get_property_details",
    arguments: { unit_id: icityUnit.unit_id },
  });
  const icityProperty = structured(icityDetails.body.result).property;
  assert.ok(icityProperty.project_expert, "details should carry the full project_expert card");
  assert.ok(icityProperty.project_expert.available_units.units.length > 0);
  assert.ok(icityProperty.project_expert.yield_example.gross_yield_on_paid.average);
  assert.ok(icityProperty.project_expert.ask_only_if_client_asks.length > 0);

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
  if (/aliva/i.test(detailsData.property.project)) assert.ok(detailsData.property.payment_details);
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
      annual_discount_rate_percent: 20,
    },
  });
  const calculationData = structured(calculation.body.result);
  assert.equal(calculationData.installment_count, 32);
  assert.equal(calculationData.down_payment_percent, 10);
  assert.ok(calculationData.equal_installment_egp > 0);
  assert.ok(calculationData.illustrative_cash_equivalent_egp < calculationData.total_cost_egp);
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
  assert.match(whatsappData.url, /^https:\/\/wa\.me\/201110100025\?text=/);
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
  const summary = await rpc(31, "tools/call", {
    name: "get_inventory_summary",
    arguments: {},
  });
  const summaryData = structured(summary.body.result);
  assert.ok(summaryData.units > 0);
  assert.equal(summaryData.contract_version, "1.1.0");
