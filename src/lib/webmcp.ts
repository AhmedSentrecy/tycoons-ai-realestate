import { inventoryStats, loadInventory, type InventoryUnit } from "@/lib/inventory";
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
  return {
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
  };
}

const tools: ToolDefinition[] = [
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
    name: "create_whatsapp_inquiry_link",
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
