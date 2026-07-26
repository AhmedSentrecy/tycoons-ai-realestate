import { createHash, randomBytes } from "node:crypto";

import {
  inventoryUnitKey,
  loadInventory,
} from "../../src/lib/inventory.ts";
import { searchInventory } from "../../src/lib/propertySearch.ts";

const SITE_URL = "https://tycoons-inv.com";
const WHATSAPP_NUMBER = "201200704344";
const SERVER_NAME = "tycoons-property-search";
const SERVER_VERSION = "1.0.0";
const LATEST_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  "2025-03-26",
  "2025-06-18",
  LATEST_PROTOCOL_VERSION,
]);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_TOOL_RESULTS = 10;

const TOOL_DEFINITIONS = [
  {
    name: "search_properties",
    title: "Search Tycoons properties",
    description:
      "Search the current public Tycoons Investments inventory in Arabic or English. Returns exact matches before clearly labelled alternatives. Availability and commercial terms must be reconfirmed.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          minLength: 2,
          maxLength: 300,
          description:
            "Natural-language buyer request containing any known location, budget, unit type, bedrooms, area, delivery, finishing, down-payment, or installment criteria.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: MAX_TOOL_RESULTS,
          default: 5,
        },
      },
      required: ["query"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_property_details",
    title: "Get property details",
    description:
      "Get the current public details for one Tycoons inventory unit using the stable unit_id returned by search_properties.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        unit_id: {
          type: "string",
          pattern: "^unit_[a-f0-9]{16}$",
        },
      },
      required: ["unit_id"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "compare_properties",
    title: "Compare properties",
    description:
      "Compare two to five Tycoons inventory units on price, area, price per square metre, payment text, delivery, and finishing. This does not rank investment quality.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        unit_ids: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^unit_[a-f0-9]{16}$",
          },
        },
      },
      required: ["unit_ids"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "calculate_payment_plan",
    title: "Calculate payment plan",
    description:
      "Calculate an illustrative equal-installment scenario from a live Tycoons unit_id or a supplied EGP price. This is arithmetic only, not a confirmed developer payment plan.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        unit_id: {
          type: "string",
          pattern: "^unit_[a-f0-9]{16}$",
        },
        price_egp: {
          type: "number",
          minimum: 100000,
          maximum: 10000000000,
        },
        down_payment_percent: {
          type: "number",
          minimum: 0,
          maximum: 100,
          default: 0,
        },
        down_payment_egp: {
          type: "number",
          minimum: 0,
        },
        installment_years: {
          type: "number",
          exclusiveMinimum: 0,
          maximum: 20,
        },
        payments_per_year: {
          type: "integer",
          enum: [1, 2, 4, 12],
          default: 4,
        },
        balloon_payment_egp: {
          type: "number",
          minimum: 0,
          default: 0,
        },
        fees_egp: {
          type: "number",
          minimum: 0,
          default: 0,
        },
      },
      required: ["installment_years"],
      oneOf: [
        { required: ["unit_id"], not: { required: ["price_egp"] } },
        { required: ["price_egp"], not: { required: ["unit_id"] } },
      ],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "create_whatsapp_inquiry",
    title: "Create WhatsApp inquiry link",
    description:
      "Create, but do not open or send, a WhatsApp inquiry link containing up to three selected Tycoons units and an optional buyer request.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        unit_ids: {
          type: "array",
          maxItems: 3,
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^unit_[a-f0-9]{16}$",
          },
        },
        request: {
          type: "string",
          minLength: 2,
          maxLength: 500,
        },
        language: {
          type: "string",
          enum: ["ar", "en"],
          default: "en",
        },
      },
      anyOf: [
        { required: ["unit_ids"] },
        { required: ["request"] },
      ],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
];

function cleanText(value, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function unitId(unit) {
  return `unit_${createHash("sha256")
    .update(inventoryUnitKey(unit))
    .digest("hex")
    .slice(0, 16)}`;
}

function publicUnit(unit, includeMedia = false) {
  const output = {
    unit_id: unitId(unit),
    project: unit.project_name,
    developer: unit.developer,
    location: unit.location,
    unit_type: unit.unit_type,
    bedrooms: unit.bedrooms_text,
    area_sqm: unit.area_sqm,
    starting_price_egp: unit.starting_price,
    down_payment: unit.down_payment_text,
    installments: unit.installments_text,
    delivery: unit.delivery_text,
    finishing: unit.finishing,
    availability: unit.availability_status,
    last_updated_at: unit.last_updated_at || null,
  };

  if (includeMedia) {
    output.description = unit.description || null;
    output.images = unit.images.slice(0, 8);
    output.brochure_url = unit.brochure_url || null;
    output.video_url = unit.video_url || null;
  }

  return output;
}

async function inventoryWithIds() {
  const units = await loadInventory();
  return {
    units,
    byId: new Map(units.map((unit) => [unitId(unit), unit])),
  };
}

function requireObject(value, label = "arguments") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ToolInputError(`${label} must be an object`);
  }
  return value;
}

function requireUnitIds(value, minimum, maximum) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new ToolInputError(`unit_ids must contain between ${minimum} and ${maximum} unique IDs`);
  }

  const ids = value.map((item) => cleanText(item, 64));
  if (
    ids.some((id) => !/^unit_[a-f0-9]{16}$/.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw new ToolInputError("unit_ids contains an invalid or duplicate ID");
  }
  return ids;
}

function resolveUnits(ids, byId) {
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new ToolInputError(
      `Unknown or outdated unit_id: ${missing.join(", ")}. Run search_properties again.`,
    );
  }
  return ids.map((id) => byId.get(id));
}

async function searchProperties(args) {
  const input = requireObject(args);
  const query = cleanText(input.query);
  if (query.length < 2) throw new ToolInputError("query must contain at least 2 characters");

  const limit = boundedInteger(input.limit, 5, 1, MAX_TOOL_RESULTS);
  const units = await loadInventory();
  const result = searchInventory(units, query);
  const matches = [
    ...result.exact.map((item) => ({
      match: "exact",
      ...publicUnit(item.unit),
      reasons: item.matchReasons,
      differences: item.differences,
    })),
    ...result.alternatives.map((item) => ({
      match: "alternative",
      ...publicUnit(item.unit),
      reasons: item.matchReasons,
      differences: item.differences,
    })),
  ].slice(0, limit);

  return {
    query,
    interpreted: result.interpreted,
    exact_count: result.totalExact,
    alternative_count: result.totalAlternatives,
    returned_count: matches.length,
    results: matches,
    notice:
      "Availability, prices, payment plans, delivery, and finishing are time-sensitive and must be reconfirmed with Tycoons Investments.",
  };
}

async function getPropertyDetails(args) {
  const input = requireObject(args);
  const id = cleanText(input.unit_id, 64);
  if (!/^unit_[a-f0-9]{16}$/.test(id)) {
    throw new ToolInputError("unit_id is invalid");
  }

  const { byId } = await inventoryWithIds();
  const unit = byId.get(id);
  if (!unit) {
    throw new ToolInputError("Unknown or outdated unit_id. Run search_properties again.");
  }

  return {
    property: publicUnit(unit, true),
    notice:
      "This is the latest public inventory record. Reconfirm availability and all commercial terms before making a decision.",
  };
}

async function compareProperties(args) {
  const input = requireObject(args);
  const ids = requireUnitIds(input.unit_ids, 2, 5);
  const { byId } = await inventoryWithIds();
  const units = resolveUnits(ids, byId);
  const rows = units.map((unit) => ({
    ...publicUnit(unit),
    price_per_sqm_egp:
      unit.area_sqm && unit.area_sqm > 0
        ? Math.round(unit.starting_price / unit.area_sqm)
        : null,
  }));

  const withArea = rows.filter((row) => row.area_sqm);
  const withPricePerSqm = rows.filter((row) => row.price_per_sqm_egp);
  const cheapest = [...rows].sort(
    (a, b) => a.starting_price_egp - b.starting_price_egp,
  )[0];
  const largest = [...withArea].sort((a, b) => b.area_sqm - a.area_sqm)[0] ?? null;
  const lowestPricePerSqm =
    [...withPricePerSqm].sort(
      (a, b) => a.price_per_sqm_egp - b.price_per_sqm_egp,
    )[0] ?? null;

  return {
    comparison: rows,
    factual_highlights: {
      lowest_starting_price_unit_id: cheapest.unit_id,
      largest_area_unit_id: largest?.unit_id ?? null,
      lowest_price_per_sqm_unit_id: lowestPricePerSqm?.unit_id ?? null,
    },
    notice:
      "These are factual inventory comparisons, not an investment recommendation. Reconfirm current prices and availability.",
  };
}

async function calculatePaymentPlan(args) {
  const input = requireObject(args);
  const suppliedId = cleanText(input.unit_id, 64);
  const suppliedPrice = finiteNumber(input.price_egp);
  if (Boolean(suppliedId) === Boolean(suppliedPrice)) {
    throw new ToolInputError("Provide exactly one of unit_id or price_egp");
  }

  let unit = null;
  let price = suppliedPrice;
  if (suppliedId) {
    if (!/^unit_[a-f0-9]{16}$/.test(suppliedId)) {
      throw new ToolInputError("unit_id is invalid");
    }
    const { byId } = await inventoryWithIds();
    unit = byId.get(suppliedId);
    if (!unit) {
      throw new ToolInputError("Unknown or outdated unit_id. Run search_properties again.");
    }
    price = unit.starting_price;
  }

  const years = finiteNumber(input.installment_years);
  const paymentsPerYear =
    input.payments_per_year === undefined ? 4 : finiteNumber(input.payments_per_year);
  if (!years || years <= 0 || years > 20) {
    throw new ToolInputError("installment_years must be greater than 0 and no more than 20");
  }
  if (!Number.isInteger(paymentsPerYear) || ![1, 2, 4, 12].includes(paymentsPerYear)) {
    throw new ToolInputError("payments_per_year must be 1, 2, 4, or 12");
  }

  const hasPercent = input.down_payment_percent !== undefined;
  const hasAmount = input.down_payment_egp !== undefined;
  if (hasPercent && hasAmount) {
    throw new ToolInputError(
      "Provide down_payment_percent or down_payment_egp, not both",
    );
  }

  const percent = hasPercent ? finiteNumber(input.down_payment_percent) : 0;
  if (percent === null || percent < 0 || percent > 100) {
    throw new ToolInputError("down_payment_percent must be between 0 and 100");
  }

  const downPayment = hasAmount
    ? finiteNumber(input.down_payment_egp)
    : (price * percent) / 100;
  const balloon = finiteNumber(input.balloon_payment_egp ?? 0);
  const fees = finiteNumber(input.fees_egp ?? 0);
  if (
    downPayment === null ||
    downPayment < 0 ||
    balloon === null ||
    balloon < 0 ||
    fees === null ||
    fees < 0
  ) {
    throw new ToolInputError("Payment amounts must be valid non-negative numbers");
  }

  const totalCost = price + fees;
  const financedAcrossInstallments = totalCost - downPayment - balloon;
  if (financedAcrossInstallments < 0) {
    throw new ToolInputError(
      "Down payment plus balloon payment cannot exceed price plus fees",
    );
  }

  const installmentCount = years * paymentsPerYear;
  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    throw new ToolInputError(
      "installment_years × payments_per_year must produce a whole number of payments",
    );
  }

  return {
    source_property: unit
      ? {
          unit_id: suppliedId,
          project: unit.project_name,
          unit_type: unit.unit_type,
        }
      : null,
    currency: "EGP",
    price_egp: Math.round(price),
    fees_egp: Math.round(fees),
    total_cost_egp: Math.round(totalCost),
    down_payment_egp: Math.round(downPayment),
    down_payment_percent: Number(((downPayment / price) * 100).toFixed(4)),
    balloon_payment_egp: Math.round(balloon),
    amount_split_across_installments_egp: Math.round(financedAcrossInstallments),
    installment_years: years,
    payments_per_year: paymentsPerYear,
    installment_count: installmentCount,
    equal_installment_egp: Math.round(financedAcrossInstallments / installmentCount),
    notice:
      "Illustrative arithmetic only. It excludes any unprovided maintenance, club, delivery, or financing charges and is not a confirmed developer payment plan.",
  };
}

async function createWhatsAppInquiry(args) {
  const input = requireObject(args);
  const request = cleanText(input.request, 500);
  const language = input.language === "ar" ? "ar" : "en";
  const ids =
    input.unit_ids === undefined ? [] : requireUnitIds(input.unit_ids, 1, 3);
  if (!ids.length && request.length < 2) {
    throw new ToolInputError("Provide at least one unit_id or a request");
  }

  let selected = [];
  if (ids.length) {
    const { byId } = await inventoryWithIds();
    selected = resolveUnits(ids, byId);
  }

  const trackingId = `wa_mcp_${randomBytes(5).toString("hex")}`;
  const lines =
    language === "ar"
      ? [
          "مرحبًا Tycoons Investments،",
          "أريد تأكيد أحدث توافر وخطة سداد للطلب التالي:",
        ]
      : [
          "Hello Tycoons Investments,",
          "Please confirm the latest availability and payment plan for:",
        ];

  if (request) lines.push("", `Request: ${request}`);
  selected.forEach((unit, index) => {
    lines.push(
      "",
      `Option ${index + 1}: ${unit.project_name}`,
      `Developer: ${unit.developer}`,
      `Unit: ${unit.unit_type} · ${unit.bedrooms_text || "Not specified"} · ${unit.area_sqm ?? "—"} sqm`,
      `Starting price: ${new Intl.NumberFormat("en-EG").format(unit.starting_price)} EGP`,
      `Unit ID: ${unitId(unit)}`,
    );
  });
  lines.push(
    "",
    "Source: mcp",
    `Page: ${SITE_URL}/`,
    `Tracking ID: ${trackingId}`,
  );

  const message = lines.join("\n").slice(0, 1800);
  return {
    url: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    tracking_id: trackingId,
    selected_unit_ids: ids,
    sent: false,
    notice: "The link was created only. No message was opened or sent.",
  };
}

const TOOL_HANDLERS = {
  search_properties: searchProperties,
  get_property_details: getPropertyDetails,
  compare_properties: compareProperties,
  calculate_payment_plan: calculatePaymentPlan,
  create_whatsapp_inquiry: createWhatsAppInquiry,
};

class ToolInputError extends Error {}

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function toolResult(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data),
      },
    ],
    structuredContent: data,
    isError: false,
  };
}

function toolError(error) {
  return {
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : "Tool execution failed",
      },
    ],
    isError: true,
  };
}

function allowedOrigins(request) {
  const requestUrl = new URL(request.url);
  const configured = String(process.env.MCP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([
    requestUrl.origin,
    SITE_URL,
    "https://www.tycoons-inv.com",
    ...configured,
  ]);
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return { ok: true, origin: null };
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) {
    return { ok: true, origin };
  }
  return { ok: allowedOrigins(request).has(origin), origin };
}

function responseHeaders(request, protocolVersion = LATEST_PROTOCOL_VERSION) {
  const origin = request.headers.get("origin");
  const allowed = validateOrigin(request);
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "MCP-Protocol-Version": protocolVersion,
    Vary: "Origin, Accept, MCP-Protocol-Version",
    ...(origin && allowed.ok
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
        }
      : {}),
  };
}

function protocolVersionFor(request, body) {
  if (body?.method === "initialize") {
    const requested = cleanText(body.params?.protocolVersion, 32);
    return SUPPORTED_PROTOCOL_VERSIONS.has(requested)
      ? requested
      : LATEST_PROTOCOL_VERSION;
  }

  const header = request.headers.get("mcp-protocol-version");
  if (!header) return "2025-03-26";
  if (!SUPPORTED_PROTOCOL_VERSIONS.has(header)) return null;
  return header;
}

async function handleRpc(request, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      status: 400,
      body: jsonRpcError(null, -32600, "Invalid Request"),
      protocolVersion: LATEST_PROTOCOL_VERSION,
    };
  }

  const isNotification = body.id === undefined;
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return {
      status: 400,
      body: jsonRpcError(body.id, -32600, "Invalid Request"),
      protocolVersion: LATEST_PROTOCOL_VERSION,
    };
  }

  const protocolVersion = protocolVersionFor(request, body);
  if (!protocolVersion) {
    return {
      status: 400,
      body: jsonRpcError(body.id, -32600, "Unsupported MCP-Protocol-Version"),
      protocolVersion: LATEST_PROTOCOL_VERSION,
    };
  }

  if (body.method === "notifications/initialized" && isNotification) {
    return { status: 202, body: null, protocolVersion };
  }

  if (body.method === "initialize") {
    const capabilities = body.params?.capabilities;
    const clientInfo = body.params?.clientInfo;
    if (
      !body.params ||
      typeof body.params !== "object" ||
      !capabilities ||
      typeof capabilities !== "object" ||
      !clientInfo ||
      typeof clientInfo.name !== "string" ||
      typeof clientInfo.version !== "string"
    ) {
      return {
        status: 400,
        body: jsonRpcError(body.id, -32602, "Invalid initialize parameters"),
        protocolVersion,
      };
    }
    return {
      status: 200,
      body: jsonRpcResult(body.id, {
        protocolVersion,
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: SERVER_NAME,
          title: "Tycoons Property Search",
          version: SERVER_VERSION,
          websiteUrl: SITE_URL,
        },
        instructions:
          "Search exact matches first, label alternatives and their differences, and reconfirm time-sensitive property terms with Tycoons Investments.",
      }),
      protocolVersion,
    };
  }

  if (body.method === "ping") {
    return {
      status: 200,
      body: jsonRpcResult(body.id, {}),
      protocolVersion,
    };
  }

  if (body.method === "tools/list") {
    return {
      status: 200,
      body: jsonRpcResult(body.id, { tools: TOOL_DEFINITIONS }),
      protocolVersion,
    };
  }

  if (body.method === "tools/call") {
    const name = cleanText(body.params?.name, 100);
    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return {
        status: 200,
        body: jsonRpcResult(body.id, toolError(new Error(`Unknown tool: ${name || "missing"}`))),
        protocolVersion,
      };
    }
    try {
      const result = await handler(body.params?.arguments ?? {});
      return {
        status: 200,
        body: jsonRpcResult(body.id, toolResult(result)),
        protocolVersion,
      };
    } catch (error) {
      if (!(error instanceof ToolInputError)) {
        console.error(`[Tycoons MCP] ${name} failed`, error);
      }
      return {
        status: 200,
        body: jsonRpcResult(body.id, toolError(error)),
        protocolVersion,
      };
    }
  }

  if (isNotification) {
    return { status: 202, body: null, protocolVersion };
  }

  return {
    status: 200,
    body: jsonRpcError(body.id, -32601, "Method not found"),
    protocolVersion,
  };
}

export default async function mcp(request) {
  const origin = validateOrigin(request);
  if (!origin.ok) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32600, "Origin not allowed")),
      {
        status: 403,
        headers: responseHeaders(request),
      },
    );
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders(request),
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32600, "Only POST is supported")),
      {
        status: 405,
        headers: {
          ...responseHeaders(request),
          Allow: "POST, OPTIONS",
        },
      },
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32600, "Content-Type must be application/json")),
      {
        status: 415,
        headers: responseHeaders(request),
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32600, "Request body is too large")),
      {
        status: 413,
        headers: responseHeaders(request),
      },
    );
  }

  let text;
  try {
    text = await request.text();
  } catch {
    text = "";
  }
  if (!text || Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32700, text ? "Request body is too large" : "Empty request body")),
      {
        status: text ? 413 : 400,
        headers: responseHeaders(request),
      },
    );
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32700, "Parse error")),
      {
        status: 400,
        headers: responseHeaders(request),
      },
    );
  }

  const result = await handleRpc(request, body);
  return new Response(result.body === null ? null : JSON.stringify(result.body), {
    status: result.status,
    headers: responseHeaders(request, result.protocolVersion),
  });
}

export const config = {
  path: "/mcp",
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
