// New-project research rules (server/wa-inbox/research.ts). Run: node --import tsx scripts/test-wa-research.ts
import assert from "node:assert/strict";
import { draftDoubts, firstJson, groupingPrompt, siteOf, verifyFacts, type DraftState } from "../server/wa-inbox/research.ts";

assert.equal(siteOf("https://www.nawy.com/compound/1"), "nawy.com");
assert.equal(siteOf("https://ar.propertyfinder.eg/x"), "propertyfinder.eg");
assert.equal(siteOf("not a url"), "");

const searched = new Set(["https://www.nawy.com/a", "https://propertyfinder.eg/b", "https://tycoons-inv.com/c", "https://dev.example.com/d"]);
const raw = {
  found: true,
  facts: {
    name: { value: "The 101", sources: ["https://www.nawy.com/a", "https://propertyfinder.eg/b"] },
    area_group: { value: "mostakbal city", sources: ["https://www.nawy.com/a", "https://dev.example.com/d"] },
    location: { value: "Mostakbal City", sources: ["https://www.nawy.com/a", "https://www.nawy.com/a?x=1"] }, // one site only
    finishing: { value: "Fully Finished", sources: ["https://www.nawy.com/a", "https://tycoons-inv.com/c"] }, // ours does not count
    delivery_text: { value: "2029", sources: ["https://www.nawy.com/a", "https://made-up.example.org/z"] }, // not searched
    developer: { value: "", sources: [] },
  },
  conflicts: [{ field: "delivery_text", values: ["2028", "2029"] }, { field: "price", values: [] }],
};
const checked = verifyFacts(raw, searched);
assert.deepEqual(Object.keys(checked.facts).sort(), ["area_group", "name"]);
assert.equal(checked.facts.area_group?.value, "Mostakbal City");
assert.deepEqual(checked.weak.sort(), ["delivery_text", "finishing", "location"]);
assert.deepEqual(checked.conflicts, ["delivery_text"]);
assert.ok(checked.found);
assert.equal(verifyFacts({ facts: { area_group: { value: "Cairo", sources: ["https://www.nawy.com/a", "https://propertyfinder.eg/b"] } } }, searched).facts.area_group, undefined);

const base: DraftState = {
  values: { name: "The 101", developer: "Biography Developments", area_group: "Mostakbal City", location: "Mostakbal City" },
  verified: ["name", "developer", "area_group", "location"], confirmed: [], weak: [], conflicts: [], found: true, groupingSure: true, waDeveloper: "Biography Developments",
};
assert.deepEqual(draftDoubts(base), []);
// Payment, delivery and finishing are "if found": missing ones do not hold the project.
assert.deepEqual(draftDoubts({ ...base, verified: ["name", "developer", "area_group"] }), ["missing_location"]);
assert.deepEqual(draftDoubts({ ...base, verified: ["name", "developer", "area_group"], confirmed: ["location"] }), []);
assert.deepEqual(draftDoubts({ ...base, weak: ["finishing"] }), ["weak_finishing"]);
assert.deepEqual(draftDoubts({ ...base, weak: ["finishing"], confirmed: ["finishing"] }), []);
assert.deepEqual(draftDoubts({ ...base, conflicts: ["delivery_text"] }), ["conflict_delivery_text"]);
assert.deepEqual(draftDoubts({ ...base, groupingSure: false }), ["grouping_unsure"]);
assert.deepEqual(draftDoubts({ ...base, waDeveloper: "Landmark Sabbour", values: { ...base.values, developer: "Arab Developers Holding" } }), ["developer_mismatch"]);
assert.deepEqual(draftDoubts({ ...base, waDeveloper: "Biography", values: { ...base.values, developer: "Biography Developments" } }), []);
assert.deepEqual(draftDoubts({ ...base, found: false, verified: [] }), ["not_found", "missing_name", "missing_developer", "missing_area_group", "missing_location"]);

assert.deepEqual(firstJson('Here you go:\n{"found": false}\nDone.'), { found: false });
assert.equal(firstJson("no json"), null);

const prompt = groupingPrompt("Biography Developments", [{ name: "101", count: 44, location: "Mostakbal City" }], [], []);
assert.ok(prompt.includes("- 101 (44 units, Mostakbal City)"));

console.log("wa research rules: ok");
