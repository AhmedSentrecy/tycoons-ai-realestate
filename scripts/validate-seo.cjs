"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  groupProjects,
  renderDirectory,
  renderProject,
  renderUnit,
  renderCollection,
  renderGuide,
  renderStaticPage,
  notFound,
  areaFor,
} = require("../netlify/functions/_seo-utils.cjs");

const root = path.resolve(__dirname, "..");
const rows = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    project_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
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
    id: "22222222-2222-2222-2222-222222222222",
    project_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
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
const unit = renderUnit(projects, rows[0].id, "ar");
const unitSibling = renderUnit(projects, rows[1].id, "ar");

assert.match(project, /<html lang="ar" dir="rtl">/);
assert.match(english, /<html lang="en" dir="ltr">/);
assert.match(project, /<link rel="canonical" href="https:\/\/tycoons-inv\.com\/projects\//);
assert.match(project, /hreflang="en" href="https:\/\/tycoons-inv\.com\/en\/projects\//);
assert.match(english, /hreflang="ar-EG" href="https:\/\/tycoons-inv\.com\/projects\//);
assert.doesNotMatch(project, /tycoons-inv\.de/);
assert.match(project, /BreadcrumbList/);
assert.match(project, /ItemList/);
assert.match(project, /OfferCatalog/);
assert.match(project, /"priceCurrency":"EGP"/);
assert.doesNotMatch(project, /aggregateRating|"review"|"@type":"Product"/);
assert.match(directory, /دليل المشاريع العقارية المحدث/);
assert.match(area, /مستقبل سيتي/);
assert.match(area, /"@type":"FAQPage"/, "area collection page must render FAQ schema with real area content");
assert.match(area, /غالبية المشاريع هنا لسه تحت الإنشاء/, "area page must include the area-context/buyer-note copy, not just a generic template");
assert.match(area, /<h1>مستقبل سيتي<\/h1>/);
assert.match(area, /موقع مستقبل سيتي فين؟/, "Mostakbal City must answer the location query seen in Search Console");
assert.match(area, /خريطة مشاريع مستقبل سيتي والمطورين/, "Mostakbal City must cover project-map intent without claiming a geographic map");
assert.match(area, /هل الاستثمار العقاري في مستقبل سيتي مناسب؟/, "Mostakbal City must cover investment intent with a non-guaranteed answer");
assert.match(area, /مشاريع مستقبل سيتي 2026 — الخريطة والأسعار/, "Mostakbal title must reflect the strongest Search Console intents");
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

assert.ok(unit, "renderUnit must return HTML for a known unit id");
assert.match(unit, /<link rel="canonical" href="https:\/\/tycoons-inv\.com\/units\//);
assert.match(unit, /"@type":"RealEstateListing"/);
assert.match(unit, /"@type":"FAQPage"/);
assert.match(unit, /BreadcrumbList/);
assert.match(unit, /مستقبل سيتي/, "unit page must include area context copy");
assert.doesNotMatch(
  unit,
  /Standalone Villa في Mountain View Aliva من Mountain View، في Mostakbal City، بمساحة تبدأ من/,
  "unit intro must not reuse the old single-sentence boilerplate template verbatim",
);
assert.notEqual(
  unit.match(/<p class="lead">.*?<\/p>/)?.[0],
  unitSibling.match(/<p class="lead">.*?<\/p>/)?.[0],
  "two different units in the same project must not render an identical intro paragraph",
);
assert.equal(renderUnit(projects, "does-not-exist", "ar"), null);

// Regression test for the /en/projects/* 404 bug: units.project_name/developer are free-text
// copies that can drift from the canonical projects table after a rename or merge (this
// happened for real with "Mindset Residences" -> "Mindset"). groupProjects must key off the
// real projects.slug via project_id, not text derived from the unit row, and must still create
// a page for projects with zero currently-available units instead of making them disappear.
const projectsMeta = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "Mountain View Aliva", slug: "mountain-view-aliva--mountain-view", developer: "Mountain View", location: "Mostakbal City" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", name: "Skyline Residences", slug: "skyline-residences--skyline-dev", developer: "Skyline Dev", location: "New Cairo" },
];
const driftedRows = [
  ...rows,
  // Same project_id as the first project, but the unit's own project_name text has drifted
  // (e.g. renamed in the projects table without updating this row) — must still resolve to
  // the canonical slug from projectsMeta, not a slug computed from this stale text.
  {
    id: "33333333-3333-3333-3333-333333333333",
    project_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    project_name: "Aliva Old Name",
    developer: "Mountain View",
    location: "Mostakbal City",
    unit_type: "Apartment",
    bedrooms_text: "1 bedroom",
    area_sqm: 90,
    starting_price: 8000000,
    availability_status: "available",
    last_updated_at: "2026-07-26T00:00:00Z",
  },
];
const projectsWithMeta = groupProjects(driftedRows, projectsMeta);
assert.equal(
  projectsWithMeta.find((p) => p.name === "Mountain View Aliva")?.slug,
  "mountain-view-aliva--mountain-view",
  "a unit's stale project_name text must not override the canonical projects.slug",
);
const zeroUnitProject = projectsWithMeta.find((p) => p.slug === "skyline-residences--skyline-dev");
assert.ok(zeroUnitProject, "a project with zero currently-available units must still get a group instead of disappearing");
assert.equal(zeroUnitProject.units.length, 0);
const zeroUnitEnglish = renderProject(projectsWithMeta, "skyline-residences--skyline-dev", "en");
assert.ok(zeroUnitEnglish, "renderProject must not return null for a project with zero available units");
assert.match(zeroUnitEnglish, /Contact us for the latest price|No units with detailed pricing are published/);
assert.doesNotMatch(zeroUnitEnglish, /NaN|Infinity/);

const netlify = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "netlify/functions/sitemap.cjs"), "utf8");
const projectPage = fs.readFileSync(path.join(root, "src/pages/ProjectPage.tsx"), "utf8");
const hero = fs.readFileSync(path.join(root, "src/sections/Hero.tsx"), "utf8");
const homeSeo = fs.readFileSync(path.join(root, "src/lib/homeSeo.ts"), "utf8");
const regionPage = fs.readFileSync(path.join(root, "src/pages/RegionPage.tsx"), "utf8");
const projectsSection = fs.readFileSync(path.join(root, "src/sections/Projects.tsx"), "utf8");

assert.ok(
  netlify.indexOf('from = "/ar/projects/*"') < netlify.indexOf('from = "/*"'),
  "SEO routes must appear before the 404 catch-all",
);
assert.match(
  netlify,
  /from = "\/ar\/projects\/\*"\s+to = "\/projects\/:splat"\s+status = 301\s+force = true/,
  "Arabic legacy project routes must redirect to the primary Arabic project URL",
);
assert.match(netlify, /https:\/\/tycoons-inv\.de\/\*/);
assert.match(netlify, /status = 404/);
assert.doesNotMatch(
  netlify,
  /from = "\/(?:ar|en)"\s+to = "\/(?:ar|en)\/"\s+status = 301\s+force = true/,
  "Locale slash redirects must stay removed to prevent redirect loops",
);
assert.equal(
  (netlify.match(/from = "\/en\/"\s+to = "\/\.netlify\/functions\/seo-page\?lang=en&type=home"\s+status = 200/g) || []).length,
  1,
  "The English homepage must have exactly one internal 200 rewrite",
);
assert.match(netlify, /from = "\/projects\/\*"\s+to = "\/404\.html"\s+status = 404/);
assert.match(
  netlify,
  /from = "\/regions\/\*"\s+to = "\/ar\/areas\/:splat"\s+status = 301\s+force = true/,
  "Retired region URLs must 301 to their canonical area pages, never 404",
);
assert.match(netlify, /from = "\/regions\/sahel"\s+to = "\/ar\/areas\/north-coast"\s+status = 301/);
assert.match(netlify, /from = "\/regions\/capital"\s+to = "\/ar\/areas\/new-capital"\s+status = 301/);
assert.match(index, /rel="canonical" href="https:\/\/tycoons-inv\.com\/"/);
assert.match(index, /https:\/\/tycoons-inv\.com\/images\/hero\.webp/);
assert.match(index, /<h1>ابحث بصوتك/);
const lead = homeSeo.match(/HOME_H1_LEAD = "([^"]+)"/)?.[1];
const accent = homeSeo.match(/HOME_H1_ACCENT = "([^"]+)"/)?.[1];
const staticH1 = index.match(/<h1>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
assert.ok(lead && accent, "Homepage H1 copy must stay defined in src/lib/homeSeo.ts");
assert.equal(staticH1, `${lead}${accent}`.trim(), "Static and hydrated homepage H1 copy must match");
assert.match(hero, /HOME_H1_LEAD/);
assert.match(hero, /HOME_H1_ACCENT/);
assert.doesNotMatch(regionPage, /to=\{`\/regions\//, "Region cards must link directly to canonical area pages");
assert.doesNotMatch(projectsSection, /`\/regions\//, "Project fallbacks must link directly to canonical area pages");
assert.match(index, /<h2>قارن المشاريع والوحدات العقارية/);
assert.match(robots, /OAI-SearchBot/);
assert.match(robots, /https:\/\/tycoons-inv\.com\/sitemap\.xml/);
assert.match(sitemap, /SITE_URL}\/projects\/\${projectSlug}/);
assert.match(sitemap, /SITE_URL}\/units\/\${unit\.id}/);
assert.match(projectPage, /loadProjectPage\(slug\)/);
assert.match(
  netlify,
  /from = "\/units\/\*"\s+to = "\/\.netlify\/functions\/seo-page\?lang=ar&type=unit&slug=:splat"\s+status = 200/,
  "Unit URLs must be server-rendered through seo-page, not 404'd",
);
assert.doesNotMatch(
  projectPage,
  /const title = "Hyde Park|عن Hyde Park New Cairo|hyde-park-faq/,
  "project pages must not hard-code one project's SEO content",
);

async function validateRouteRecovery() {
  const handler = require("../netlify/functions/seo-page.cjs").handler;
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => rows,
  });
  try {
    const projectResponse = await handler({
      path: `/en/projects/${projects[0].slug}`,
      rawUrl: `https://tycoons-inv.com/en/projects/${projects[0].slug}`,
      queryStringParameters: { lang: "en" },
    });
    const guideResponse = await handler({
      path: "/guides/off-plan-buying-checklist/",
      rawUrl: "https://tycoons-inv.com/guides/off-plan-buying-checklist/",
      queryStringParameters: { lang: "ar" },
    });
    const unitResponse = await handler({
      path: `/units/${rows[0].id}`,
      rawUrl: `https://tycoons-inv.com/units/${rows[0].id}`,
      queryStringParameters: {},
    });
    assert.match(projectResponse.body, /Mountain View Aliva \| Mountain View/);
    assert.match(projectResponse.body, /hreflang="ar-EG" href="https:\/\/tycoons-inv\.com\/projects\//);
    assert.match(guideResponse.body, /دليل شراء عقار Off-plan في مصر/);
    assert.equal(unitResponse.statusCode, 200);
    assert.match(unitResponse.body, /Standalone Villa/);
  } finally {
    global.fetch = originalFetch;
  }
  console.log(`SEO regression validation passed for ${projects[0].slug}`);
}

validateRouteRecovery().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
