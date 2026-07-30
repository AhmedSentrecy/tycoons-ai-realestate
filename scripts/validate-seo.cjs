"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  groupProjects,
  renderDirectory,
  renderProject,
  renderCollection,
  renderGuide,
  renderStaticPage,
  notFound,
  areaFor,
} = require("../netlify/functions/_seo-utils.cjs");

const root = path.resolve(__dirname, "..");
const rows = [
  {
    project_name: "Mountain View Aliva",
    developer: "Mountain View",
    location: "Mostakbal City",
    unit_type: "Standalone Villa",
    bedrooms_text: "3 bedrooms",
    area_sqm: 285,
    starting_price: 57746382,
    down_payment_text: "10%",
    installments_text: "8 years",
    delivery_text: "Delivery in 3 years",
    availability_status: "available",
    image_url: "https://example.com/aliva.jpg",
    last_updated_at: "2026-07-26T00:00:00Z",
  },
  {
    project_name: "Mountain View Aliva",
    developer: "Mountain View",
    location: "Mostakbal City",
    unit_type: "Apartment",
    bedrooms_text: "2 bedrooms",
    area_sqm: 120,
    starting_price: 12460159,
    down_payment_text: "10%",
    installments_text: "8 years",
    delivery_text: "Delivery in 3 years",
    availability_status: "available",
    last_updated_at: "2026-07-26T00:00:00Z",
  },
];

const projects = groupProjects(rows);
const project = renderProject(projects, projects[0].slug, "ar");
const english = renderProject(projects, projects[0].slug, "en");
const directory = renderDirectory(projects, "ar");
const area = renderCollection(projects, "area", "mostakbal-city", "ar");
const guide = renderGuide("off-plan-buying-checklist");
const methodology = renderStaticPage("methodology");
const about = renderStaticPage("about");
const faq = renderStaticPage("faq");
const missing = notFound("ar");

assert.match(project, /<html lang="ar" dir="rtl">/);
assert.match(english, /<html lang="en" dir="ltr">/);
assert.match(project, /https:\/\/tycoons-inv\.com\/ar\/projects\//);
assert.doesNotMatch(project, /tycoons-inv\.de/);
assert.match(project, /BreadcrumbList/);
assert.match(project, /ItemList/);
assert.match(project, /OfferCatalog/);
assert.match(project, /"priceCurrency":"EGP"/);
assert.doesNotMatch(project, /aggregateRating|"review"|"@type":"Product"/);
assert.match(directory, /دليل المشاريع العقارية المحدث/);
assert.match(area, /مستقبل سيتي/);
assert.match(guide, /آخر مراجعة: 26 يوليو 2026/);
assert.match(methodology, /منهجية البيانات والحسابات/);
assert.match(about, /<link rel="canonical" href="https:\/\/tycoons-inv\.com\/about">/);
assert.match(about, /<h1>من نحن<\/h1>/);
assert.doesNotMatch(about, /hreflang="en"/);
assert.match(faq, /"@type":"FAQPage"/);
assert.match(area, /BreadcrumbList/);
assert.match(missing, /noindex,follow/);
assert.equal(areaFor("Mostakbal City, New Cairo").slug, "mostakbal-city");
assert.equal(areaFor("New Alamein, North Coast").slug, "new-alamein");
assert.equal(areaFor("West Cairo").indexable, false);
assert.equal(areaFor("Zayed Central").indexable, false);

const netlify = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");

assert.ok(
  netlify.indexOf('from = "/ar/projects/*"') < netlify.indexOf('from = "/*"'),
  "SEO routes must appear before the 404 catch-all",
);
assert.match(netlify, /https:\/\/tycoons-inv\.de\/\*/);
assert.match(netlify, /status = 404/);
assert.doesNotMatch(
  netlify,
  /from = "\/(?:ar|en)"\s+to = "\/(?:ar|en)\/"\s+status = 301\s+force = true/,
  "Locale slash redirects must stay removed to prevent redirect loops",
);
assert.match(netlify, /from = "\/projects\/\*"\s+to = "\/index\.html"\s+status = 200/);
assert.match(netlify, /from = "\/regions\/\*"\s+to = "\/404\.html"\s+status = 404/);
assert.match(index, /rel="canonical" href="https:\/\/tycoons-inv\.com\/"/);
assert.match(index, /https:\/\/tycoons-inv\.com\/images\/hero\.webp/);
assert.match(index, /<h1>قارن المشاريع والوحدات العقارية/);
assert.match(robots, /OAI-SearchBot/);
assert.match(robots, /https:\/\/tycoons-inv\.com\/sitemap\.xml/);

async function validateRouteRecovery() {
  const handler = require("../netlify/functions/seo-page.cjs").handler;
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => rows,
  });
  try {
    const projectResponse = await handler({
      path: `/ar/projects/${projects[0].slug}`,
      rawUrl: `https://tycoons-inv.com/ar/projects/${projects[0].slug}`,
      queryStringParameters: { lang: "ar" },
    });
    const guideResponse = await handler({
      path: "/guides/off-plan-buying-checklist/",
      rawUrl: "https://tycoons-inv.com/guides/off-plan-buying-checklist/",
      queryStringParameters: { lang: "ar" },
    });
    assert.match(projectResponse.body, /Mountain View Aliva \| Mountain View/);
    assert.match(guideResponse.body, /دليل شراء عقار Off-plan في مصر/);
  } finally {
    global.fetch = originalFetch;
  }
  console.log(`SEO regression validation passed for ${projects[0].slug}`);
}

validateRouteRecovery().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
