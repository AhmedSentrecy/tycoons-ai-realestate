// Readable unit URLs. Keep in sync with netlify/functions/_unit-url.cjs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UnitLike = { id?: unknown; unit_type?: unknown; bedrooms_text?: unknown; project_name?: unknown; project_slug?: unknown };

function latinWords(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function unitSlug(unit: UnitLike) {
  const id = String(unit?.id ?? "").toLowerCase();
  if (!UUID.test(id)) return id;
  const projectWords = latinWords(String(unit.project_slug ?? "").split("--")[0] || unit.project_name);
  const words = [latinWords(unit.unit_type).split("-").slice(0, 4).join("-"), latinWords(unit.bedrooms_text), projectWords]
    .filter(Boolean)
    .join("-")
    .split("-")
    .filter((word, index, list) => word && list.indexOf(word) === index)
    .reduce((kept: string, word: string) => (kept.length + word.length + 1 <= 70 ? (kept ? `${kept}-${word}` : word) : kept), "");
  return words ? `${id.slice(0, 8)}-${words}` : id.slice(0, 8);
}

export function unitPath(unit: UnitLike) {
  return `/units/${unitSlug(unit)}`;
}

/** "<uuid>" -> { uuid, prefix }; "<8hex>-words" -> { prefix }; otherwise null. */
export function parseUnitParam(param: string): { uuid?: string; prefix: string } | null {
  let value = String(param || "");
  try { value = decodeURIComponent(value); } catch { /* keep raw */ }
  value = value.trim().toLowerCase().replace(/\/+$/, "");
  if (UUID.test(value)) return { uuid: value, prefix: value.slice(0, 8) };
  const match = value.match(/^([0-9a-f]{8})(?:-[a-z0-9-]*)?$/);
  return match ? { prefix: match[1] } : null;
}
