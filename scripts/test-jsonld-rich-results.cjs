"use strict";

// Guards the structured-data fixes that make the pages pass Google's Rich Results Test (Nov 2026):
// - reviewedBy lives on the WebPage (mainEntityOfPage), never on Article
// - RealEstateListing has no "address" (WebPage property list) and no "accommodation" (not schema.org)
// - every RealEstateAgent node (a LocalBusiness) carries the required address
// - one FAQPage per page
const assert = require("node:assert/strict");
const {
  groupProjects, renderDirectory, renderProject, renderUnit, renderCollection, renderGuide, renderStaticPage,
} = require("../netlify/functions/_seo-utils.cjs");
const { buildProjectSchemas } = require("../netlify/functions/_project-schema.cjs");
const { GUIDES, ENGLISH_GUIDES } = require("../netlify/functions/_buying-guides.cjs");

const rows = [
  { id: "11111111-1111-1111-1111-111111111111", project_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", project_name: "Mountain View Aliva", developer: "Mountain View", location: "Mostakbal City", unit_type: "Standalone Villa", bedrooms_text: "3 bedrooms", area_sqm: 285, starting_price: 57746382, availability_status: "available", last_updated_at: "2026-07-26T00:00:00Z" },
  { id: "22222222-2222-2222-2222-222222222222", project_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", project_name: "Mountain View Aliva", developer: "Mountain View", location: "Mostakbal City", unit_type: "Apartment", bedrooms_text: "2 bedrooms", area_sqm: 120, starting_price: 12460159, availability_status: "available", last_updated_at: "2026-07-26T00:00:00Z" },
];
const projects = groupProjects(rows);

function blocks(html) {
  return [...String(html).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
}
function typesOf(node) {
  const type = node?.["@type"];
  return Array.isArray(type) ? type : type ? [type] : [];
}
function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const [key, value] of Object.entries(node)) if (key !== "@context") walk(value, visit);
}
function check(label, html) {
  assert.ok(html, `${label}: page rendered`);
  const all = blocks(html);
  let faqPages = 0;
  walk(all, (node) => {
    const types = typesOf(node);
    if (types.includes("FAQPage")) faqPages += 1;
    if (types.includes("Article")) assert.equal(node.reviewedBy, undefined, `${label}: reviewedBy is not valid on Article`);
    if (types.includes("RealEstateListing")) {
      assert.equal(node.address, undefined, `${label}: address is not valid on RealEstateListing`);
      assert.equal(node.accommodation, undefined, `${label}: accommodation is not a schema.org property`);
    }
    if (types.includes("RealEstateAgent")) assert.ok(node.address, `${label}: RealEstateAgent (LocalBusiness) needs an address`);
    if (types.includes("Question")) assert.ok(node.name && String(node.acceptedAnswer?.text || "").trim(), `${label}: Question needs name and answer text`);
  });
  assert.ok(faqPages <= 1, `${label}: only one FAQPage per page (found ${faqPages})`);
}

for (const slug of Object.keys(GUIDES)) check(`guide ${slug}`, renderGuide(slug, "ar"));
for (const slug of Object.keys(ENGLISH_GUIDES || {})) check(`en guide ${slug}`, renderGuide(slug, "en"));
for (const page of ["faq", "about", "privacy", "methodology", "corrections", "contact"]) check(`/${page}`, renderStaticPage(page));
check("/ar/", renderDirectory(projects, "ar"));
check("/en/directory/", renderDirectory(projects, "en"));
check("project ar", renderProject(projects, projects[0].slug, "ar"));
check("project en", renderProject(projects, projects[0].slug, "en"));
check("unit", renderUnit(projects, rows[0].id, "ar"));
check("area", renderCollection(projects, "area", "mostakbal-city", "ar"));

const listing = buildProjectSchemas({ url: "https://tycoons-inv.com/projects/x", name: "X", location: "", units: rows }).find((node) => node["@type"] === "RealEstateListing");
assert.equal(listing.contentLocation.name, undefined, "empty location never becomes an empty Place name");

console.log("JSON-LD rich results checks passed");
