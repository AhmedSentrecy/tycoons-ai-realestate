"use strict";

// Readable unit URLs: /units/<first 8 hex of the UUID>-<type>-<bedrooms>-<project>
// e.g. /units/3f2a9c1d-apartment-3-bedrooms-mountain-view-aliva
// The 8-hex prefix is unique across all units (checked in Supabase) and is what
// resolves the page; the words are for people and search engines. Old /units/<uuid>
// URLs 301 to the readable one. Keep in sync with src/lib/unitUrl.ts.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function latinWords(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unitSlug(unit) {
  const id = String(unit?.id || "").toLowerCase();
  if (!UUID.test(id)) return id;
  const projectWords = latinWords(String(unit.project_slug || "").split("--")[0] || unit.project_name);
  const words = [latinWords(unit.unit_type).split("-").slice(0, 4).join("-"), latinWords(unit.bedrooms_text), projectWords]
    .filter(Boolean)
    .join("-")
    .split("-")
    .filter((word, index, list) => word && list.indexOf(word) === index)
    .reduce((kept, word) => (kept.length + word.length + 1 <= 70 ? (kept ? `${kept}-${word}` : word) : kept), "");
  return words ? `${id.slice(0, 8)}-${words}` : id.slice(0, 8);
}

function unitPath(unit) {
  return `/units/${unitSlug(unit)}`;
}

// "<uuid>" -> { uuid }, "<8hex>-words" or "<8hex>" -> { prefix }, anything else -> null
function parseUnitParam(param) {
  const value = decodeURIComponent(String(param || "")).trim().toLowerCase().replace(/\/+$/, "");
  if (UUID.test(value)) return { uuid: value, prefix: value.slice(0, 8) };
  const match = value.match(/^([0-9a-f]{8})(?:-[a-z0-9-]*)?$/);
  return match ? { prefix: match[1] } : null;
}

function findUnitByParam(units, param) {
  const parsed = parseUnitParam(param);
  if (!parsed) return null;
  if (parsed.uuid) return units.find((unit) => String(unit.id).toLowerCase() === parsed.uuid) || null;
  const matches = units.filter((unit) => String(unit.id).toLowerCase().startsWith(parsed.prefix));
  return matches.length === 1 ? matches[0] : null;
}

module.exports = { unitSlug, unitPath, parseUnitParam, findUnitByParam, UUID };
