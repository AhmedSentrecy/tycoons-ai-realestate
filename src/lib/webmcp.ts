import {
  inventoryStats,
  inventoryUnitId,
  loadInventory,
  type InventoryUnit,
} from "@/lib/inventory";
import { searchInventory } from "@/lib/propertySearch";

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

type ModelContext = {
  registerTool?: (
    tool: ToolDefinition,
    options?: { signal?: AbortSignal },
  ) => Promise<void> | void;
  provideContext?: (context: { tools: ToolDefinition[] }) => Promise<void> | void;
};

const WHATSAPP_NUMBER = "201200704344";
let registrationStarted = false;

function text(value: unknown, maxLength = 300): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function publicUnit(unit: InventoryUnit) {
  const sourceOwner = unit.developer || "Tycoons Investments";
  return {
    unit_id: inventoryUnitId(unit),
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
    last_updated_at: unit.last_updated_at,
    data_provenance: {
      data_source: `${sourceOwner} official data`,
      source_type: unit.source_type || "developer_data",
      source_date: unit.last_updated_at || null,
      verification_status: "confirmed",
      confidence: "high",
    },
  };
}

async function unitById(id: string): Promise<InventoryUnit> {
  const unit = (await loadInventory()).find((item) => inventoryUnitId(item) === id);
  if (!unit) throw new Error("Unknown or outdated unit_id. Run search_properties again.");
  return unit;
}

const tools: ToolDefinition[] = [
  {
    name: "get_property_details",
    description: "Get current public details for a unit_id returned by search_properties.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { unit_id: { type: "string", pattern: "^unit_[a-f0-9]{16}$" } },
      required: ["unit_id"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      const unit = await unitById(text(input.unit_id, 64));
      return {
        property: {
          ...publicUnit(unit),
          description: unit.description || null,
          images: unit.images.slice(0, 8),
          brochure_url: unit.brochure_url || null,
          video_url: unit.video_url || null,
        },
        notice: "Reconfirm availability and all commercial terms before making a decision.",
      };
    },
  },
  {
    name: "compare_properties",
    description:
      "Compare two to five returned unit IDs on price, area, price per square metre, payment text, delivery, and finishing.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        unit_ids: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          uniqueItems: true,
          items: { type: "string", pattern: "^unit_[a-f0-9]{16}$" },
        },
      },
      required: ["unit_ids"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      if (!Array.isArray(input.unit_ids) || input.unit_ids.length < 2 || input.unit_ids.length > 5) {
        throw new Error("unit_ids must contain between 2 and 5 IDs");
      }
      const units = await Promise.all(input.unit_ids.map((id) => unitById(text(id, 64))));
      const comparison = units.map((unit) => ({
        ...publicUnit(unit),
        price_per_sqm_egp:
          unit.area_sqm && unit.area_sqm > 0
            ? Math.round(unit.starting_price / unit.area_sqm)
            : null,
      }));
      return {
        comparison,
        notice:
          "Factual inventory comparison only, not an investment recommendation. Reconfirm current prices and availability.",
      };
    },
  },
  {
    name: "calculate_payment_plan",
    description:
      "Calculate an illustrative equal-installment scenario from a live unit_id. This is arithmetic, not a confirmed developer plan.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        unit_id: { type: "string", pattern: "^unit_[a-f0-9]{16}$" },
        down_payment_percent: { type: "number", minimum: 0, maximum: 100, default: 0 },
        installment_years: { type: "number", exclusiveMinimum: 0, maximum: 20 },
        payments_per_year: { type: "integer", enum: [1, 2, 4, 12], default: 4 },
        annual_discount_rate_percent: {
          type: "number",
          minimum: 0,
          maximum: 100,
          default: 0,
        },
      },
      required: ["unit_id", "installment_years"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    async execute(input) {
      const unit = await unitById(text(input.unit_id, 64));
      const years = Number(input.installment_years);
      const paymentsPerYear = Number(input.payments_per_year ?? 4);
      const percent = Number(input.down_payment_percent ?? 0);
      const annualDiscountRate = Number(input.annual_discount_rate_percent ?? 0);
      if (!(years > 0 && years <= 20) || ![1, 2, 4, 12].includes(paymentsPerYear)) {
        throw new Error("Invalid installment duration or cadence");
      }
      if (!(percent >= 0 && percent <= 100)) throw new Error("Invalid down payment percent");
      if (!(annualDiscountRate >= 0 && annualDiscountRate <= 100)) {
        throw new Error("Invalid annual discount rate");
      }
      const downPayment = (unit.starting_price * percent) / 100;
      const count = years * paymentsPerYear;
      const equalInstallment = (unit.starting_price - downPayment) / count;
      const periodicRate =
        annualDiscountRate === 0
          ? 0
          : Math.pow(1 + annualDiscountRate / 100, 1 / paymentsPerYear) - 1;
      const installmentsPresentValue =
        periodicRate === 0
          ? unit.starting_price - downPayment
          : equalInstallment * ((1 - Math.pow(1 + periodicRate, -count)) / periodicRate);
      return {
        source_property: {
          unit_id: inventoryUnitId(unit),
          project: unit.project_name,
          unit_type: unit.unit_type,
        },
        currency: "EGP",
        price_egp: Math.round(unit.starting_price),
        down_payment_egp: Math.round(downPayment),
        down_payment_percent: percent,
        installment_years: years,
        payments_per_year: paymentsPerYear,
        installment_count: count,
        equal_installment_egp: Math.round(equalInstallment),
        average_monthly_commitment_egp: Math.round(
          (unit.starting_price - downPayment) / (years * 12),
        ),
        annual_discount_rate_percent: annualDiscountRate,
        illustrative_cash_equivalent_egp: Math.round(
          downPayment + installmentsPresentValue,
        ),
        notice:
          "Illustrative arithmetic only. It is not the confirmed developer payment plan and excludes unprovided fees.",
      };
    },
  },
  {
    name: "search_properties",
    description:
      "Search Tycoons Investments' current developer-direct Egyptian property inventory using natural-language criteria. This is read-only and does not submit a lead.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          minLength: 2,
          maxLength: 300,
          description:
            "Natural-language request with any combination of location, budget, unit type, bedrooms, area, delivery, finishing, down payment, or installments.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 8,
          default: 5,
          description: "Maximum number of combined exact and alternative results.",
        },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      const query = text(input.query);
      const limit = Math.min(8, Math.max(1, Number(input.limit) || 5));
      if (query.length < 2) throw new Error("query must contain at least 2 characters");

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
        results: matches,
        notice:
          "Availability, prices, payment plans, delivery, and finishing are time-sensitive and must be reconfirmed with Tycoons Investments.",
      };
    },
  },
  {
    name: "get_inventory_summary",
    description:
      "Return a read-only summary of the current public Tycoons Investments inventory coverage.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute() {
      const units = await loadInventory();
      const latestUpdate = units
        .map((unit) => unit.last_updated_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;
      return {
        ...inventoryStats(units),
        latest_update: latestUpdate,
        currency: "EGP",
        market: "Egypt",
        availability_policy: "Only units marked available are included.",
      };
    },
  },
  {
    name: "create_whatsapp_inquiry",
    description:
      "Create, but do not open or send, a WhatsApp inquiry link for Tycoons Investments. This tool has no network or messaging side effect.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        request: {
          type: "string",
          minLength: 2,
          maxLength: 500,
          description: "The buyer's property request or the project and unit they want to ask about.",
        },
      },
      required: ["request"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      const request = text(input.request, 500);
      if (request.length < 2) throw new Error("request must contain at least 2 characters");
      const message = [
        "Hello Tycoons Investments,",
        "I need the latest availability and payment plan for this request:",
        "",
        request,
        "",
        "Source: webmcp",
        `Page: ${window.location.href}`,
      ].join("\n");
      return {
        url: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
        sent: false,
        notice: "The link was created only. No message was opened or sent.",
      };
    },
  },
];

export async function registerWebMcpTools(): Promise<void> {
  if (registrationStarted || typeof document === "undefined" || typeof navigator === "undefined") return;

  const modern = (document as Document & { modelContext?: ModelContext }).modelContext;
  const legacy = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  const context = modern ?? legacy;
  if (!context) return;

  registrationStarted = true;
  try {
    if (typeof context.registerTool === "function") {
      const controller = new AbortController();
      window.addEventListener("pagehide", () => controller.abort(), { once: true });
      await Promise.all(
        tools.map((tool) => Promise.resolve(context.registerTool?.(tool, { signal: controller.signal }))),
      );
      return;
    }

    if (typeof context.provideContext === "function") {
      await context.provideContext({ tools });
    }
  } catch (error) {
    registrationStarted = false;
    console.warn("[Tycoons] WebMCP registration failed", error);
  }
}
