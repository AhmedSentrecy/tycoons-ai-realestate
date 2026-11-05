// New-project research rules (server/wa-inbox/research.ts). Run: node --import tsx scripts/test-wa-research.ts
import assert from "node:assert/strict";
import { checkedValue, developerCheckPrompt, draftDoubts, firstJson, groupingCheckPrompt, projectCheckPrompt, unitSummary, groupingPrompt, siteOf, verifyFacts, verifyGrouping, type DraftState } from "../server/wa-inbox/research.ts";

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
// WhatsApp says one developer, the web another: the web wins only with 2 sites.
const mismatch = { ...base, waDeveloper: "Landmark Sabbour", values: { ...base.values, developer: "Arab Developers Holding" } };
assert.deepEqual(draftDoubts(mismatch), []);
assert.deepEqual(draftDoubts({ ...mismatch, verified: ["name", "area_group", "location"] }), ["missing_developer", "developer_mismatch"]);
assert.deepEqual(draftDoubts({ ...base, waDeveloper: "Biography", values: { ...base.values, developer: "Biography Developments" } }), []);
assert.deepEqual(draftDoubts({ ...base, found: false, verified: [] }), ["not_found", "missing_name", "missing_developer", "missing_area_group", "missing_location"]);

assert.deepEqual(firstJson('Here you go:\n{"found": false}\nDone.'), { found: false });
assert.equal(firstJson("no json"), null);

const prompt = groupingPrompt("Biography Developments", [{ name: "101", count: 44, location: "Mostakbal City" }], [], []);
assert.ok(prompt.includes("- 101 (44 units, Mostakbal City)"));

// Unsure grouping settled on the web: every name once, every project shown by 2 sites (searched, not ours).
const names = ["Wujood Residence", "Wuud Residence"];
const web = new Set(["https://www.nawy.com/w", "https://propertyfinder.eg/w", "https://aqarmap.com.eg/u", "https://tharaa.com/u", "https://tycoons-inv.com/x"]);
const split = verifyGrouping({ projects: [
  { name: "Wujood Residence", wa_names: ["Wujood Residence"], sources: ["https://www.nawy.com/w", "https://propertyfinder.eg/w"] },
  { name: "Wuud", wa_names: ["Wuud Residence"], sources: ["https://aqarmap.com.eg/u", "https://tharaa.com/u"] },
] }, web, names);
assert.deepEqual(split?.map((part) => part.wa_names), [["Wujood Residence"], ["Wuud Residence"]]);
const one = verifyGrouping({ projects: [{ name: "Wujood Residence", wa_names: names, sources: ["https://www.nawy.com/w", "https://aqarmap.com.eg/u"] }] }, web, names);
assert.equal(one?.length, 1);
// One site only, our own site, a name left out, a name twice, an unknown name, or nothing: not settled.
assert.equal(verifyGrouping({ projects: [{ name: "W", wa_names: names, sources: ["https://www.nawy.com/w", "https://nawy.com/w?x=1"] }] }, web, names), null);
assert.equal(verifyGrouping({ projects: [{ name: "W", wa_names: names, sources: ["https://www.nawy.com/w", "https://tycoons-inv.com/x"] }] }, web, names), null);
assert.equal(verifyGrouping({ projects: [{ name: "W", wa_names: ["Wujood Residence"], sources: ["https://www.nawy.com/w", "https://aqarmap.com.eg/u"] }] }, web, names), null);
assert.equal(verifyGrouping({ projects: [
  { name: "A", wa_names: names, sources: ["https://www.nawy.com/w", "https://aqarmap.com.eg/u"] },
  { name: "B", wa_names: ["Wuud Residence"], sources: ["https://www.nawy.com/w", "https://aqarmap.com.eg/u"] },
] }, web, names), null);
assert.equal(verifyGrouping({ projects: [{ name: "W", wa_names: [...names, "Other"], sources: ["https://www.nawy.com/w", "https://aqarmap.com.eg/u"] }] }, web, names), null);
assert.equal(verifyGrouping({ projects: [{ name: "W", wa_names: names, sources: ["https://made-up.org/a", "https://other.org/b"] }] }, web, names), null);
assert.equal(verifyGrouping(null, web, names), null);
assert.ok(groupingCheckPrompt("Tharaa Developments", names).includes('"Wuud Residence"'));

// Unit doubts: one value, kept only with 2 searched sites (not ours).
assert.deepEqual(checkedValue({ developer: { value: "Tharaa Developments", sources: ["https://www.nawy.com/w", "https://aqarmap.com.eg/u"] } }, "developer", web)?.value, "Tharaa Developments");
assert.equal(checkedValue({ developer: { value: "Tharaa", sources: ["https://www.nawy.com/w", "https://tycoons-inv.com/x"] } }, "developer", web), null);
assert.equal(checkedValue({ project: { value: "", sources: [] } }, "project", web), null);
assert.equal(checkedValue(null, "project", web), null);
assert.ok(developerCheckPrompt("Palm Beach", ["Tharaa"]).includes('"Palm Beach"'));
const unitLine = unitSummary({ unit_type: "Apartment", bedrooms_text: "3", area_sqm: 150, starting_price: 9000000, location: "New Cairo" });
assert.equal(unitLine, "Apartment, 3 bedrooms, 150 m2, 9000000 EGP, New Cairo");
assert.ok(projectCheckPrompt("Tharaa Developments", [unitLine], "").includes("Tharaa Developments's projects"));

console.log("wa research rules: ok");
