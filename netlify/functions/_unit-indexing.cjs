"use strict";

function text(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function numberValue(value) {
  const parsed = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function unitIndexKey(unit) {
  return [
    unit.project_id,
    unit.unit_type,
    unit.bedrooms_text,
    unit.area_sqm,
    unit.starting_price,
  ]
    .map((value) => text(value).toLowerCase())
    .join("|");
}

function hasIndexableContent(unit) {
  return Boolean(
    text(unit.project_id) &&
      text(unit.project_name) &&
      text(unit.developer) &&
      text(unit.location) &&
      text(unit.unit_type) &&
      numberValue(unit.area_sqm) > 0 &&
      numberValue(unit.starting_price) > 0 &&
      text(unit.description).length >= 40,
  );
}

function indexableUnitIds(units) {
  const winners = new Map();
  const sorted = [...units].sort((left, right) => {
    const dateOrder = String(right.last_updated_at || "").localeCompare(
      String(left.last_updated_at || ""),
    );
    return dateOrder || String(left.id || "").localeCompare(String(right.id || ""));
  });
  for (const unit of sorted) {
    if (!hasIndexableContent(unit)) continue;
    const key = unitIndexKey(unit);
    if (!winners.has(key)) winners.set(key, String(unit.id));
  }
  return new Set(winners.values());
}

module.exports = { hasIndexableContent, indexableUnitIds, unitIndexKey };
