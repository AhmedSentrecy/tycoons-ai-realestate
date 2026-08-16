import { useCallback, useMemo, useState } from "react";
import { useInventory } from "@/lib/inventory";
import { searchInventory, type RankedInventoryUnit, type SearchOutput } from "@/lib/propertySearch";

const EMPTY_RESULTS: SearchOutput = {
  query: "",
  interpreted: "",
  exact: [],
  alternatives: [],
  totalExact: 0,
  totalAlternatives: 0,
  criteria: {
    regionLabel: "",
    regionTerms: [],
    unitType: "",
    typeAliases: [],
    budgetMax: null,
    budgetMode: "max",
    bedrooms: null,
    areaMin: null,
    areaMax: null,
    immediateDelivery: false,
    deliveryYearsMax: null,
    installmentsYearsMin: null,
    downPaymentMax: null,
    downPaymentCashMax: null,
    monthlyInstallmentMax: null,
    finishing: "",
    freeTokens: [],
  },
};

let lastVoicePayload: Record<string, unknown> = {
  exact_count: 0,
  alternative_count: 0,
  options: [],
};

function promoteStructuredMatches(result: SearchOutput): SearchOutput {
  const promoted = result.alternatives.filter((item) => item.differences.length === 0);
  if (!promoted.length) return result;
  const promotedKeys = new Set(promoted.map((item) => item.unit.project_name + item.unit.unit_type + item.unit.starting_price));
  return {
    ...result,
    exact: [...result.exact, ...promoted.map((item) => ({ ...item, exact: true }))].slice(0, 16),
    alternatives: result.alternatives.filter(
      (item) => !promotedKeys.has(item.unit.project_name + item.unit.unit_type + item.unit.starting_price),
    ),
    totalExact: result.totalExact + promoted.length,
    totalAlternatives: Math.max(0, result.totalAlternatives - promoted.length),
  };
}

function optionPayload(item: RankedInventoryUnit) {
  return {
    match: item.exact ? "exact" : "alternative",
    project: item.unit.project_name,
    developer: item.unit.developer,
    location: item.unit.location,
    unit_type: item.unit.unit_type,
    bedrooms: item.unit.bedrooms_text,
    area_sqm: item.unit.area_sqm,
    starting_price_egp: item.unit.starting_price,
    delivery: item.unit.delivery_text,
    finishing: item.unit.finishing,
    reasons: item.matchReasons,
    differences: item.differences,
    estimated_monthly_installment_egp: item.paymentEstimate?.monthlyInstallment ?? null,
    estimated_down_payment_egp: item.paymentEstimate?.downPaymentValue ?? null,
  };
}

function voicePayload(result: SearchOutput): Record<string, unknown> {
  const options = [...result.exact, ...result.alternatives].slice(0, 3).map(optionPayload);
  return {
    search_request: result.query,
    exact_count: result.totalExact,
    alternative_count: result.totalAlternatives,
    options,
    instruction: options.length
      ? "Mention only these options and clearly distinguish exact matches from alternatives."
      : "No close result was found. Ask the client to continue on WhatsApp.",
  };
}

function runSearch(units: ReturnType<typeof useInventory>["units"], query: string): SearchOutput {
  return promoteStructuredMatches(searchInventory(units, query));
}

export function getLastSearchVoicePayload(): Record<string, unknown> {
  return lastVoicePayload;
}

export function usePropertySearch() {
  const inventory = useInventory();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = useMemo(
    () => (submitted.trim() && inventory.units.length ? runSearch(inventory.units, submitted) : EMPTY_RESULTS),
    [inventory.units, submitted],
  );

  const search = useCallback(
    (value?: string): SearchOutput | null => {
      const finalQuery = (value ?? query).trim();
      if (!finalQuery) return null;
      setQuery(finalQuery);
      setSubmitted(finalQuery);
      if (!inventory.units.length) return null;
      const result = runSearch(inventory.units, finalQuery);
      lastVoicePayload = voicePayload(result);
      return result;
    },
    [inventory.units, query],
  );

  const clear = useCallback(() => {
    setQuery("");
    setSubmitted("");
    lastVoicePayload = { exact_count: 0, alternative_count: 0, options: [] };
  }, []);

  return {
    query,
    setQuery,
    results,
    hasSearched: submitted.trim().length > 0,
    search,
    clear,
    inventory,
  };
}
