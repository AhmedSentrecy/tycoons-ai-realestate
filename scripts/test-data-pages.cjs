"use strict";

const assert = require("node:assert/strict");
const { renderProjectStatic, renderUnitStatic } = require("./lib/data-pages.cjs");
const { indexableUnitIds } = require("../netlify/functions/_unit-indexing.cjs");

const shell = `<!doctype html><html lang="ar" dir="rtl"><head><title>Home</title><meta name="description" content="home"><link rel="canonical" href="https://tycoons-inv.com/"><script type="application/ld+json">{"@type":"FAQPage"}</script></head><body><div id="root"><h1>قارن المشاريع والوحدات العقارية</h1></div><script type="module" src="/assets/app.js"></script></body></html>`;
const project = {
  id: "project-1",
  name: "Project Alpha",
  slug: "project-alpha",
  developer: "Developer One",
  location: "New Cairo",
  status: "available",
  seo_title: "Project Alpha SEO",
  seo_description: "Project Alpha description",
  seo_keywords: ["alpha", "new cairo"],
  article_sections: [{ heading: "About Alpha", paragraphs: ["Alpha only content"] }],
  faq: [{ question: "Alpha question?", answer: "Alpha answer" }],
  image_url: "https://example.com/alpha.jpg",
  gallery_urls: "",
  last_updated_at: "2026-08-03T00:00:00Z",
};
const unit = {
  id: "unit-1",
  project_id: "project-1",
  project_name: "Project Alpha",
  developer: "Developer One",
  location: "New Cairo",
  unit_type: "Apartment",
  bedrooms_text: "2 Bedrooms",
  area_sqm: 120,
  starting_price: 10000000,
  availability_status: "available",
  description: "A complete unit description with enough detail for a useful standalone search result page.",
  finishing: "Core & Shell",
  installments_text: "8 years",
  delivery_text: "3 years",
  image_url: "https://example.com/unit.jpg",
  gallery_urls: "",
  last_updated_at: "2026-08-03T00:00:00Z",
};

const projectHtml = renderProjectStatic(shell, project, [unit]);
assert.match(projectHtml, /<link rel="canonical" href="https:\/\/tycoons-inv\.com\/projects\/project-alpha">/);
assert.match(projectHtml, /hreflang="en" href="https:\/\/tycoons-inv\.com\/en\/projects\/project-alpha">/);
assert.match(projectHtml, /Project Alpha SEO/);
assert.match(projectHtml, /Alpha only content/);
assert.match(projectHtml, /"@type":"RealEstateListing"/);
assert.match(projectHtml, /"@type":"Article"/);
assert.match(projectHtml, /"@type":"FAQPage"/);
assert.match(projectHtml, /"@type":"BreadcrumbList"/);
assert.doesNotMatch(projectHtml, /قارن المشاريع والوحدات العقارية/);
assert.match(projectHtml, /<script type="module" src="\/assets\/app\.js"><\/script>/);

const unitHtml = renderUnitStatic(shell, unit, project);
assert.match(unitHtml, /<link rel="canonical" href="https:\/\/tycoons-inv\.com\/units\/unit-1">/);
assert.match(unitHtml, /Project Alpha/);
assert.match(unitHtml, /href="\/projects\/project-alpha"/);
assert.doesNotMatch(unitHtml, /قارن المشاريع والوحدات العقارية/);
assert.match(unitHtml, /شقة/);
assert.match(unitHtml, /نصف تشطيب/);

const duplicateUnit = { ...unit, id: "unit-2" };
const weakUnit = { ...unit, id: "unit-3", area_sqm: null };
const indexable = indexableUnitIds([unit, duplicateUnit, weakUnit]);
assert.equal(indexable.size, 1);
assert.ok(indexable.has("unit-1"));
const weakHtml = renderUnitStatic(shell, weakUnit, project, { indexable: false });
assert.match(weakHtml, /<meta name="robots" content="noindex,follow">/);

console.log("Data-driven page isolation and canonical validation passed.");
