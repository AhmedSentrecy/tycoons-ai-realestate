import type { InventoryUnit } from "@/lib/inventory";

const WHATSAPP_NUMBER = "201200704344";

function clean(value: string, fallback = "Not specified"): string {
  return value?.trim() || fallback;
}

function price(value: number): string {
  return `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(value)} EGP`;
}

function trackingId(): string {
  return `wa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pageUrl(): string {
  return typeof window === "undefined" ? "https://tycoons-inv.de/" : window.location.href;
}

function openMessage(message: string): void {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function buildUnitWhatsAppMessage(
  unit: InventoryUnit,
  searchRequest: string,
  currentPageUrl: string,
): string {
  const preferredUrl = unit.image_url || unit.brochure_url || currentPageUrl;
  const lines = [
    "Hello Tycoons Investments,",
    "I am interested in this available unit:",
    "",
    `Project: ${clean(unit.project_name)}`,
    `Developer: ${clean(unit.developer)}`,
    `Location: ${clean(unit.location)}`,
    `Unit type: ${clean(unit.unit_type)}`,
    `Bedrooms: ${clean(unit.bedrooms_text)}`,
    `Area: ${unit.area_sqm ? `${unit.area_sqm} sqm` : "Not specified"}`,
    `Starting price: ${price(unit.starting_price)}`,
    `Down payment: ${clean(unit.down_payment_text)}`,
    `Installments: ${clean(unit.installments_text)}`,
    `Delivery: ${clean(unit.delivery_text)}`,
    `Finishing: ${clean(unit.finishing)}`,
    "",
    `Search request: ${clean(searchRequest)}`,
    `URL: ${preferredUrl}`,
    ...(unit.brochure_url ? [`Brochure: ${unit.brochure_url}`] : []),
    "",
    "Please send me the latest availability and payment plan.",
    "",
    "Source: ai_search_result",
    `Page: ${currentPageUrl}`,
    `Tracking ID: ${trackingId()}`,
  ];
  return lines.join("\n");
}

export function openUnitWhatsApp(unit: InventoryUnit, searchRequest: string): void {
  openMessage(buildUnitWhatsAppMessage(unit, searchRequest, pageUrl()));
}

export function openSearchWhatsApp(searchRequest: string): void {
  const currentPageUrl = pageUrl();
  openMessage(
    [
      "Hello Tycoons Investments,",
      "I could not find a complete match on the website and need help with this request:",
      "",
      `Search request: ${clean(searchRequest)}`,
      "",
      "Please send me the closest available options and payment plans.",
      "",
      "Source: ai_search_no_match",
      `Page: ${currentPageUrl}`,
      `Tracking ID: ${trackingId()}`,
    ].join("\n"),
  );
}
