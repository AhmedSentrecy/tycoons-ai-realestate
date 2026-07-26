import { useCallback, useMemo, useState } from "react";
import { useInventory } from "@/lib/inventory";
import { searchInventory, type SearchOutput } from "@/lib/propertySearch";

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
    bedrooms: null,
    areaMin: null,
    areaMax: null,
    immediateDelivery: false,
    deliveryYearsMax: null,
    installmentsYearsMin: null,
    downPaymentMax: null,
    finishing: "",
    freeTokens: [],
  },
};

export function usePropertySearch() {
  const inventory = useInventory();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = useMemo(
    () => (submitted.trim() && inventory.units.length ? searchInventory(inventory.units, submitted) : EMPTY_RESULTS),
    [inventory.units, submitted],
  );

  const search = useCallback(
    (value?: string): SearchOutput | null => {
      const finalQuery = (value ?? query).trim();
      if (!finalQuery) return null;
      setQuery(finalQuery);
      setSubmitted(finalQuery);
      return inventory.units.length ? searchInventory(inventory.units, finalQuery) : null;
    },
    [inventory.units, query],
  );

  const clear = useCallback(() => {
    setQuery("");
    setSubmitted("");
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
