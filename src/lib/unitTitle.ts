import { priceShortAr } from "./fitTitle";

// Same title as the pre-rendered unit page (scripts/lib/data-pages.cjs unitTitle) so Google
// sees one title before and after JavaScript runs. Bedrooms only when it is a real count.
export function bedroomsLabel(raw: string | null | undefined): string {
  const value = String(raw || "");
  const match = value.match(/(\d+)\s*(?:bed|br\b|bedroom|غرف|غرفة)/i) || value.trim().match(/^(\d+)(?:\.0+)?$/);
  const count = match ? Number(match[1]) : 0;
  if (!count || count > 12) return "";
  if (count === 1) return "غرفة نوم";
  if (count === 2) return "غرفتين نوم";
  return count <= 10 ? `${count} غرف نوم` : `${count} غرفة نوم`;
}

export function unitTitle(unitType: string, bedroomsRaw: string | null | undefined, areaSqm: number | string | null | undefined, projectName: string, price?: number | string | null): string {
  // Skip when the type already says it ("1 Bedroom", "4BD", "CLEO 3B") or is a studio.
  const beds = /ستوديو|studio|غرف|غرفة|\d\s*(?:b|bd|br|bed|bedrooms?)\b/i.test(unitType) ? "" : bedroomsLabel(bedroomsRaw);
  const area = Number(areaSqm) > 0 ? ` ${Number(areaSqm)} م²` : "";
  // The price tells apart units of the same type and size (and earns the click).
  const priceLabel = priceShortAr(price);
  return `${unitType}${beds ? ` ${beds}` : ""}${area} في ${projectName}${priceLabel ? ` بـ ${priceLabel}` : ""} | Tycoons`;
}
