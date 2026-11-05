// Rules of the WhatsApp inbox review (server/wa-inbox/review.ts). Run: node --import tsx scripts/test-wa-review.ts
import assert from "node:assert/strict";
import {
  canonicalDeveloper, developersByProject, doubtsFor, groupNameDeveloper, hasProjectName, isUnknownDeveloper, projectKey, resolveDeveloper,
  type ReviewContext, type Row,
} from "../server/wa-inbox/review.ts";

const developers = [
  { name: "Concrete Developments", aliases: [] },
  { name: "Madinet Masr", aliases: ["MNHD", "Madinet Nasr"] },
  { name: "La Vista Developments", aliases: ["Lavista", "La Vista"] },
  { name: "Arab Developers Holding (ADH)", aliases: [] },
];

// Developers: known names are spelled the site's way, unknown ones kept, empty ones from the group.
assert.equal(canonicalDeveloper("Concrete", developers), "Concrete Developments");
assert.equal(canonicalDeveloper("Concrete Development", developers), "Concrete Developments");
assert.equal(canonicalDeveloper("MNHD", developers), "Madinet Masr");
assert.equal(canonicalDeveloper("Lavista", developers), "La Vista Developments");
assert.equal(canonicalDeveloper("Unknown", developers), "");
for (const raw of ["Unknown", "Needs developer name", "Needs Developer", "TAI", "Tai", ""]) assert.ok(isUnknownDeveloper(raw), raw);
assert.ok(!isUnknownDeveloper("Biography Developments"));
assert.deepEqual(resolveDeveloper("Unknown", "Concrete Developments", developers), { developer: "Concrete Developments", from: "group" });
assert.deepEqual(resolveDeveloper("Concrete", "", developers), { developer: "Concrete Developments", from: "message" });
// A sales agency's group posts other developers: the message's developer wins.
assert.deepEqual(resolveDeveloper("PRE Group", "Roya Developments", developers), { developer: "PRE Group", from: "message" });
assert.deepEqual(resolveDeveloper("Needs developer name", "", developers), { developer: "", from: "unknown" });

// Group names -> developer part.
assert.equal(groupNameDeveloper("Concrete 🤝 Tai Tycoons"), "Concrete");
assert.equal(groupNameDeveloper("TAI Tycoons - Kleek 1683"), "Kleek");
assert.equal(groupNameDeveloper("Galleria / Tai Tycoons"), "Galleria");
assert.equal(groupNameDeveloper("Khaled Sabry ♦️ Tai Tycoons"), "Khaled Sabry");
assert.equal(groupNameDeveloper("NAJM &Tai Taycoons"), "NAJM");
assert.equal(groupNameDeveloper("Tai Tycoons  |  ENWAN 00203"), "ENWAN");

// Project names: same project whatever the spelling.
assert.equal(projectKey("The 101"), projectKey("101"));
assert.equal(projectKey("THE 101"), projectKey("101"));
assert.equal(projectKey("KOR New Capital"), projectKey("KOR"));
assert.equal(projectKey("Veln New Cairo"), projectKey("Veln"));
assert.equal(projectKey("GLEN"), projectKey("Glen"));
assert.notEqual(projectKey("Patterns West"), projectKey("Patterns East"));
assert.notEqual(projectKey("La Vista 6"), projectKey("La Vista 7"));
assert.equal(projectKey("Needs project name"), "");
assert.ok(!hasProjectName("Needs project name"));
assert.ok(hasProjectName("Jadie Residence"));

// Readiness.
const complete: Row = {
  id: 1, project_id: "p1", project_name: "X", developer: "Concrete Developments", unit_type: "Apartment", area_sqm: 120, starting_price: 8_000_000,
  down_payment_text: "10%", installments_text: "8 years", delivery_text: "2028", finishing: "Fully Finished",
};
const ctx = (over: Partial<ReviewContext> = {}): ReviewContext => ({
  hasProject: (row) => Boolean(row.project_id), suggested: new Set(), duplicates: {}, rejectedBefore: {},
  developersByKey: new Map(), replacedPrice: new Map(), hasArea: () => true, ...over,
});
assert.deepEqual(doubtsFor(complete, ctx()), []);
assert.deepEqual(doubtsFor({ ...complete, finishing: "" }, ctx()), ["missing_finishing"]);
assert.deepEqual(doubtsFor({ ...complete, installments_text: "" }, ctx()), ["missing_payment"]);
assert.deepEqual(doubtsFor(complete, ctx({ duplicates: { 1: [2] } })), ["duplicate"]);
assert.deepEqual(doubtsFor(complete, ctx({ replacedPrice: new Map([["1", 800_000]]) })), ["price_jump"]);
assert.deepEqual(doubtsFor(complete, ctx({ replacedPrice: new Map([["1", 7_500_000]]) })), []);
const loose: Row = { ...complete, project_id: null, project_name: "Sun Capital", developer: "Arabia Developments" };
const rows = [loose, { ...loose, id: 2, developer: "Landmark Sabbour" }];
assert.deepEqual(doubtsFor(loose, ctx({ developersByKey: developersByProject(rows) })), ["no_project", "dev_conflict"]);
assert.deepEqual(doubtsFor({ ...loose, project_name: "Needs project name", developer: "Unknown" }, ctx()), ["no_name", "dev_unknown"]);
assert.deepEqual(doubtsFor(loose, ctx({ suggested: new Set(["1"]) })), ["suggested_project"]);

console.log("wa review rules: ok");
