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
const { developerContent } = require("../netlify/functions/_developer-content.cjs");
const { unitPath: readableUnitPath, parseUnitParam } = require("../netlify/functions/_unit-url.cjs");
const developerBatch = require("../content/developer-articles.source.json");

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
const englishPaymentGuide = renderGuide("payment-plan-comparison", "en");
const newCairoProjects = groupProjects(rows.map((row) => ({ ...row, location: "New Cairo" })));
const newCairoArea = renderCollection(newCairoProjects, "area", "new-cairo", "en");
const developerFixtures = [
  ...projects.map((project) => ({ ...project, developer: "Upwyde" })),
  ...projects.map((project) => ({ ...project, id: `${project.id}-tameer`, slug: `${project.slug}-tameer`, developer: "Tameer" })),
];
for (const [slug, lang, title] of [
  ["upwyde", "ar", "أب وايد Upwyde"],
  ["upwyde", "en", "Upwyde Developments"],
  ["tameer", "ar", "تعمير TAMEER"],
  ["tameer", "en", "TAMEER Egypt"],
]) {
  const html = renderCollection(developerFixtures, "developer", slug, lang);
  assert.match(html, new RegExp(title));
  assert.match(html, new RegExp(`canonical" href="https://tycoons-inv\\.com/${lang}/developers/${slug}`));
  assert.match(html, new RegExp(`hreflang="${lang === "ar" ? "en" : "ar-EG"}"`));
  assert.match(html, /href="\/(?:en\/)?projects\//);
  assert.doesNotMatch(html, /<script[^>]*>.*body_html|javascript:/s);
}
const normalizeDeveloperText = (value) => String(value).replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const compactDeveloperText = (value) => normalizeDeveloperText(value).replace(/\s/g, "");
for (const article of developerBatch.articles) {
  const slug = String(article.entity).toLowerCase();
  const mapped = developerContent(slug, article.locale);
  const mappedText = mapped.sections.flatMap((section) => [section.heading, ...section.blocks.flatMap((block) => block.type === "subheading" ? [block.text] : block.type === "ordered_list" ? block.items.map((item) => item.map((segment) => segment.text).join("")) : [block.content.map((segment) => segment.text).join("")])]).join(" ");
  assert.equal(compactDeveloperText(mappedText), compactDeveloperText(article.body_html), `${slug}/${article.locale} full text`);
}
const icityRows = rows.map((row, index) => ({
  ...row,
  id: `44444444-4444-4444-4444-44444444444${index}`,
  project_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  project_name: "Mountain View iCity October",
  developer: "Mountain View",
  location: "6th of October",
}));
const icityProjects = groupProjects(icityRows);
const icity = renderProject(icityProjects, "mountain-view-icity-october--mountain-view", "ar");
{
  // English project page: same showcase block, in English, with the offer and calculator as page text.
  const gallery = Array.from({ length: 11 }, (_, index) => `https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/property-images/x/p${index}.webp`);
  const withPhotos = icityProjects.map((item) => ({ ...item, image_url: gallery[0], gallery_urls: gallery.slice(1).join(",") }));
  const icityEn = renderProject(withPhotos, "mountain-view-icity-october--mountain-view", "en");
  if (process.env.SHOWCASE_EN_OUT) fs.writeFileSync(process.env.SHOWCASE_EN_OUT, icityEn);
  assert.match(icityEn, /<div class="tsc" dir="ltr" lang="en" data-showcase>/, "The English project page carries the showcase block");
  assert.match(icityEn, /Mountain View iCity October payment plans in the current offer/, "English page: the offer's payment plans are a heading in the page");
  assert.match(icityEn, /How much is the down payment at Mountain View iCity October\?/, "English page: the down-payment question is a heading in the page");
  assert.equal((icityEn.match(/<article class="tsc-plan/g) || []).length, 3, "English page: three payment plans");
  assert.match(icityEn, /<script src="\/showcase\.js" defer><\/script>/, "English page loads the walk-through script from the site itself");
  const block = icityEn.slice(icityEn.indexOf('data-showcase>'), icityEn.indexOf('id="down-payment"') + 3000);
  assert.doesNotMatch(block, /[؀-ۿ]/, "No Arabic text is left inside the English block");
  assert.doesNotMatch(icityEn, /31 December|end of the year|until the end/i, "English page: the offer's end date is never printed");
  assert.doesNotMatch(icity, /data-showcase/, "The server-rendered Arabic fallback does not repeat the block of the pre-rendered Arabic page");
}
const methodology = renderStaticPage("methodology");
const about = renderStaticPage("about");
{
  const aboutHtml = typeof about === "string" ? about : JSON.stringify(about);
  assert.match(aboutHtml, /id="ahmed-mahmoud"/, "About keeps the author anchor used by every guide byline");
  assert.match(aboutHtml, /طريقة شغلنا/);
  assert.match(aboutHtml, /Hyde Park Business District/);
  const faqHtml = JSON.stringify(renderStaticPage("faq"));
  assert.ok((faqHtml.match(/Question\\?"/g) || []).length >= 12, "FAQ page answers at least 12 questions");
  const investGuide = JSON.stringify(renderGuide("real-estate-investment-egypt"));
  assert.match(investGuide, /href=\\"\/guides\/payment-plan-comparison\/\\"/, "Guides link the guides they mention");
}
const faq = renderStaticPage("faq");
const missing = notFound("ar");
const unit = renderUnit(projects, rows[0].id, "ar");
const unitSibling = renderUnit(projects, rows[1].id, "ar");

const localizedProjects = groupProjects(rows, [{
  id: rows[0].project_id,
  name: "PRK Vie",
  slug: "prk-vie--upwyde",
  developer: "Upwyde",
  location: "New Cairo",
  targeting: { localized_content: {
    ar: { seo_title: "عنوان بارك في", seo_description: "وصف عربي موثق", article_sections: [{ key: "overview", heading: "عن بارك في", blocks: [{ type: "paragraph", content: [{ text: "راجع " }, { text: "مشروعات القاهرة الجديدة", href: "/ar/areas/new-cairo" }, { text: " والمصدر" }, { text: " الرسمي", href: "https://upwyde.com/project/prk-vie/" }, { text: " js", href: "javascript:alert(1)" }, { text: " slash", href: "//evil.example/x" }, { text: " backslash", href: "/\\evil.example/x" }, { text: " encoded", href: "/%5cevil.example/x" }, { text: " encoded slash", href: "/%2f%2fevil.example/x" }, { text: " control", href: "/safe\u0001bad" }] }, { type: "subheading", text: "قبل الاختيار" }, { type: "ordered_list", items: [[{ text: "راجع الاستخدام" }], [{ text: "أكد التوفر" }]] }] }], faq: [{ question: "هل التوفر مؤكد؟", answer: "يؤكد عند الطلب." }] },
    en: { seo_title: "PRK Vie project guide", seo_description: "A sourced English description", article_sections: [{ key: "overview", heading: "About PRK Vie", blocks: [{ type: "paragraph", content: [{ text: "Read the " }, { text: "New Cairo guide", href: "/en/areas/new-cairo" }] }] }], faq: [{ question: "Is availability current?", answer: "It is reconfirmed on request." }] },
  } },
}]);
const localizedAr = renderProject(localizedProjects, "prk-vie--upwyde", "ar");
const localizedEn = renderProject(localizedProjects, "prk-vie--upwyde", "en");
assert.match(localizedAr, /عنوان بارك في/);
assert.match(localizedAr, /href="\/ar\/areas\/new-cairo"/);
// Standing rule: no external websites on the site. External hrefs render as plain text.
assert.doesNotMatch(localizedAr, /<a [^>]*href="https?:\/\/(?!(?:www\.)?tycoons-inv\.com|wa\.me\/)/);
assert.match(localizedAr, / الرسمي/);
assert.match(localizedAr, /<h3>قبل الاختيار<\/h3>/);
assert.match(localizedAr, /<ol><li>راجع الاستخدام<\/li><li>أكد التوفر<\/li><\/ol>/);
assert.doesNotMatch(localizedAr, /javascript:/);
assert.doesNotMatch(localizedAr, /href="\/\\evil/i);
assert.doesNotMatch(localizedAr, /href="\/%5c/i);
assert.doesNotMatch(localizedAr, /href="\/%2f%2f/i);
assert.doesNotMatch(localizedAr, /href="\/safe/i);
assert.match(localizedAr, /راجع <a[^>]+>مشروعات القاهرة الجديدة<\/a> والمصدر/);
assert.match(localizedEn, /PRK Vie project guide/);
assert.match(localizedEn, /A sourced English description/);
assert.match(localizedEn, /href="\/en\/areas\/new-cairo"/);

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
assert.match(project, new RegExp(`https://tycoons-inv\\.com/units/${rows[0].id.slice(0, 8)}-[a-z0-9-]+"`), "project unit schema must point to the readable unit URL");
assert.match(project, new RegExp(`href="/units/${rows[0].id.slice(0, 8)}-[a-z0-9-]+"`), "project unit card must point to the readable unit URL");
assert.doesNotMatch(project, new RegExp(`/units/${rows[0].id}`), "no UUID unit links remain");
assert.doesNotMatch(project, /aggregateRating|"review"|"@type":"Product"/);
assert.match(directory, /دليل الكمبوندات والمشاريع العقارية في مصر 2026/);
assert.match(directory, /id="areas"/, "directory must expose the #areas anchor used by the header");
assert.match(directory, /id="developers"/, "directory must expose the #developers anchor used by the header");
assert.match(directory, /<header class="site">/, "every SSR page uses the shared site header");
assert.match(area, /مستقبل سيتي/);
assert.match(area, /"@type":"FAQPage"/, "area collection page must render FAQ schema with real area content");
assert.match(area, /وسجل تسليم المطور أهم من سعر البداية/, "area page must include the area-context/buyer-note copy, not just a generic template");
assert.match(area, /<h1>مستقبل سيتي<\/h1>/);
assert.match(area, /موقع مستقبل سيتي فين؟/, "Mostakbal City must answer the location query seen in Search Console");
assert.match(area, /خريطة مشاريع المستقبل سيتي والمطورين/, "Mostakbal City must cover project-map intent without claiming a geographic map");
assert.match(area, /هل الاستثمار العقاري في مستقبل سيتي مناسب؟/, "Mostakbal City must cover investment intent with a non-guaranteed answer");
assert.match(area, /الماستر بلان ومراحل مستقبل سيتي/, "Mostakbal City must cover the master-plan intent seen in Search Console");
assert.match(area, /google\.com\/maps\?q=Mostakbal%20City/, "Mostakbal City must embed a real map for the map intent");
assert.match(area, /"@type":"Place"/, "Mostakbal City must describe the city as a Place");
assert.match(area, /مشاريع المستقبل سيتي 2026 — الخريطة والأسعار/, "Mostakbal title must reflect the strongest Search Console intents");
assert.match(guide, /آخر مراجعة: 30 أكتوبر 2026/);
assert.match(guide, /"@type":"FAQPage"/, "Buyer guides carry their FAQ as FAQPage");
assert.equal(renderGuide("new-cairo-property-prices"), null, "The merged New Cairo price guide must not render");
assert.equal(renderGuide("north-coast-chalet-guide"), null, "The merged chalet guide must not render");
assert.match(englishPaymentGuide, /<html lang="en" dir="ltr">/);
assert.match(englishPaymentGuide, /canonical" href="https:\/\/tycoons-inv\.com\/en\/guides\/payment-plan-comparison\//);
assert.match(englishPaymentGuide, /hreflang="ar-EG" href="https:\/\/tycoons-inv\.com\/guides\/payment-plan-comparison\//);
assert.match(englishPaymentGuide, /Cash needed in the first two years/);
assert.match(newCairoArea, /<title>New Cairo Projects 2026 — Prices &amp; /);
assert.match(newCairoArea, /How to compare New Cairo property prices/);
assert.match(newCairoArea, /New Cairo projects by developer/);
const areaGuide = (slug, location, lang) => renderCollection(groupProjects(rows.map((row) => ({ ...row, location }))), "area", slug, lang);
const newCairoAr = areaGuide("new-cairo", "New Cairo", "ar");
assert.match(newCairoAr, /<title>مشاريع التجمع الخامس 2026 — الأسعار/);
assert.match(newCairoAr, /مونوريل شرق النيل/, "New Cairo guide must cover the monorail");
assert.match(newCairoAr, /google\.com\/maps\?q=New%20Cairo/);
const northCoastAr = areaGuide("north-coast", "North Coast", "ar");
assert.match(northCoastAr, /<title>مشاريع الساحل الشمالي 2026 — أسعار الشاليهات/);
assert.match(northCoastAr, /رأس الحكمة/);
assert.match(areaGuide("north-coast", "North Coast", "en"), /Ras El Hekma city project/);
const zayedAr = areaGuide("sheikh-zayed", "Sheikh Zayed", "ar");
assert.match(zayedAr, /<title>كمبوندات الشيخ زايد 2026 — الأسعار/);
assert.match(zayedAr, /زايد الجديدة/);
assert.match(areaGuide("sheikh-zayed", "Sheikh Zayed", "en"), /Old Sheikh Zayed vs New Zayed/);
for (const html of [newCairoAr, northCoastAr, zayedAr]) assert.match(html, /"@type":"FAQPage"/);
// The repo guide (content/project-articles.source.json) now owns this page: its title and H1 win.
assert.match(icity, /<title>ماونتن فيو آي سيتي أكتوبر 2026/);
assert.match(icity, /<h1[^>]*>[^<]*آي سيتي أكتوبر/);
assert.doesNotMatch(icity, /\{\{min_price\}\}/);
assert.doesNotMatch(icity, /October أكتوبر/);
assert.match(icity, /6th of October/);
assert.match(icity, /نادي الرماية/); // landmark from the repo guide body
assert.match(icity, /"@type":"FAQPage"/);
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
assert.match(unit, /href="\/ar\/areas\/mostakbal-city"/, "Arabic unit must link its verified area page");
assert.match(unit, /href="\/ar\/developers\/mountain-view"/, "Arabic unit must link its internal developer page");
assert.match(unit, new RegExp(`href="/units/${rows[1].id.slice(0, 8)}-[a-z0-9-]+"`), "related unit must link to its own readable page");
const englishUnit = renderUnit(projects, rows[0].id, "en");
assert.match(englishUnit, /href="\/en\/areas\/mostakbal-city"/, "English unit must stay in the English area hierarchy");
assert.match(englishUnit, /href="\/en\/developers\/mountain-view"/, "English unit must stay in the English developer hierarchy");
assert.match(englishUnit, /href="\/en\/projects\/mountain-view-aliva--mountain-view"/, "English unit must link its English project page");
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
assert.match(zeroUnitEnglish, /<meta name="robots" content="noindex,follow">/);
assert.doesNotMatch(zeroUnitEnglish, /NaN|Infinity/);

const unpricedAvailableProject = {
  slug: "price-on-request--developer-two",
  name: "Price on Request Project",
  developer: "Developer Two",
  location: "New Cairo",
  units: [{ ...rows[0], project_id: "price-on-request", starting_price: null }],
};
const pricedNewCairoOnly = renderCollection([
  ...newCairoProjects,
  zeroUnitProject,
  unpricedAvailableProject,
], "area", "new-cairo", "en");
assert.ok(pricedNewCairoOnly, "New Cairo collection must remain available when priced inventory exists");
assert.match(pricedNewCairoOnly, /Price on Request Project/);
assert.doesNotMatch(pricedNewCairoOnly, /Skyline Residences/);
assert.match(pricedNewCairoOnly, /12,460,159/);
assert.doesNotMatch(pricedNewCairoOnly, /starting from Price on request/);

const mixedDirectory = renderDirectory([zeroUnitProject, unpricedAvailableProject], "en");
assert.match(mixedDirectory, /Price on Request Project/);
assert.doesNotMatch(mixedDirectory, /Skyline Residences/);
assert.match(mixedDirectory, /Compare 1 projects/);

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
  (netlify.match(/from = "\/en\/"\s+to = "\/en\/index\.html"\s+status = 200/g) || []).length,
  1,
  "The English homepage must have exactly one internal 200 rewrite",
);
assert.match(
  netlify,
  /from = "\/projects\/\*"\s+to = "\/\.netlify\/functions\/seo-page\?lang=ar&type=project&slug=:splat"\s+status = 200/,
  "Missing static project files must fall back to the same DB-backed renderer used by the sitemap",
);
assert.match(
  netlify,
  /from = "\/regions\/\*"\s+to = "\/ar\/areas\/:splat"\s+status = 301\s+force = true/,
  "Retired region URLs must 301 to their canonical area pages, never 404",
);
assert.match(netlify, /from = "\/regions\/sahel"\s+to = "\/ar\/areas\/north-coast"\s+status = 301/);
assert.match(netlify, /from = "\/regions\/capital"\s+to = "\/ar\/areas\/new-capital"\s+status = 301/);
assert.match(
  netlify,
  /from = "\/en\/guides\/new-cairo-property-prices"\s+to = "\/en\/areas\/new-cairo"\s+status = 301/,
  "The merged English New Cairo guide must 301 to the English New Cairo area guide",
);
assert.ok(
  netlify.indexOf('from = "/en/guides/new-cairo-property-prices/*"') < netlify.indexOf('from = "/en/guides/*"') && netlify.indexOf('from = "/guides/north-coast-chalet-guide/*"') < netlify.indexOf('from = "/guides/*"'),
  "Merged-guide redirects must appear before the generic guide rewrites",
);
assert.match(
  netlify,
  /from = "\/en\/guides\/payment-plan-comparison"\s+to = "\/\.netlify\/functions\/seo-page\?lang=en&type=guide&slug=payment-plan-comparison"\s+status = 200/,
  "The slashless English canonical variant must rewrite directly; redirecting it to a slash loops on Netlify",
);
assert.match(index, /rel="canonical" href="https:\/\/tycoons-inv\.com\/"/, "The voice-search homepage is self-canonical: its content differs from /ar/, so Google indexed it separately anyway");
assert.match(index, /hreflang="en" href="https:\/\/tycoons-inv\.com\/en\/"/, "The voice-search homepage declares its English twin");
assert.match(netlify, /from = "\/assets\/search-widget\.js"\s+to = "\/widget\/search-widget\.js"\s+status = 301/, "The old search widget address must redirect to the new one for cached pages");
assert.match(index, /<script src="\/voice-cta\.js" defer><\/script>/, "Every page loads the sitewide voice button");
assert.match(index, /<script src="\/img-fallback\.js" defer><\/script>/, "Every page loads the photo fallback, so a failed resize never leaves an empty image box");
assert.ok(fs.existsSync(path.join(root, "public/img-fallback.js")), "The photo fallback script must ship with the site");
assert.match(index, /https:\/\/tycoons-inv\.com\/images\/hero\.webp/);
assert.match(index, /<h1>كل عقارات المطوّرين في مصر/);
assert.match(fs.readFileSync(path.join(root, "src/widget/searchWidget.tsx"), "utf8"), /host\.style\.minHeight/, "The search box keeps its height while it is upgraded, so the page below does not jump");
// Project showcase block (photo walk-through, current offer, down-payment calculator).
{
  const { showcaseHtml } = require("../netlify/functions/_project-showcase.cjs");
  const showcaseSlug = "mountain-view-icity-october--mountain-view";
  const showcaseImages = Array.from({ length: 11 }, (_, index) => `https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/property-images/x/p${index}.webp`);
  const showcaseUnits = [{ unit_type: "I-Apartment", bedrooms_text: "2 bedrooms", area_sqm: 115, starting_price: 8507289 }, { unit_type: "Sky Loft", bedrooms_text: "4 bedrooms", area_sqm: 260, starting_price: 15637381 }];
  const live = showcaseHtml({ slug: showcaseSlug, images: showcaseImages, units: showcaseUnits, now: Date.parse("2026-11-16T12:00:00+02:00") });
  assert.equal((live.match(/class="tsc-shot"/g) || []).length, 6, "The showcase walk-through shows its six photos");
  assert.equal((live.match(/<article class="tsc-plan/g) || []).length, 3, "The showcase lists the three payment systems of the offer");
  assert.match(live, /14<\/span> سنة/, "The 14-year plan is in the page text");
  assert.match(live, /12<\/span> سنة/, "The 12-year plan of the 15% discount is in the page text");
  assert.match(live, /170,146/, "The calculator is pre-filled with 2% of the cheapest home");
  assert.doesNotMatch(live + fs.readFileSync(path.join(root, "public/showcase.js"), "utf8"), /is-live/, "The walk-through gets its height from CSS, not from the script, so the page does not shift while it loads");
  assert.doesNotMatch(fs.readFileSync(path.join(root, "src/components/ProjectShowcase.tsx"), "utf8"), /dangerouslySetInnerHTML=/, "The showcase markup is written once per change, so a page re-render does not reset the walk-through");
  for (const pageFile of ["ProjectPage", "UnitPage", "GuidePage"]) {
    const pageSource = fs.readFileSync(path.join(root, `src/pages/${pageFile}.tsx`), "utf8");
    assert.doesNotMatch(pageSource, /scrollTo\(/, `${pageFile} does not jump to the top when its data arrives: the visitor may already be scrolling the server-sent page`);
    assert.match(pageSource, /useScrollTopOnNavigation\(/, `${pageFile} starts at the top only after a move inside the site`);
  }
  assert.match(fs.readFileSync(path.join(root, "src/hooks/useScrollTopOnNavigation.ts"), "utf8"), /navigationType !== "POP"/, "A page opened directly is not scrolled to the top");
  assert.match(live, /data-wa-source="project-showcase-calculator"/, "The showcase WhatsApp button is tracked");
  assert.doesNotMatch(live, /2026-12-31|31 ديسمبر|آخر السنة|نهاية السنة|ساري لحد|<script/, "The offer's end date is never printed, and the block carries no inline script");
  const expired = showcaseHtml({ slug: showcaseSlug, images: showcaseImages, units: showcaseUnits, now: Date.parse("2027-01-01T00:30:00+02:00") });
  assert.doesNotMatch(expired, /tsc-plan"|data-tsc-calc|tsc-facts"/, "After the offer ends, its terms and calculator are no longer shown");
  assert.match(expired, /class="tsc-shot"/, "The photo walk-through stays after the offer ends");
  assert.equal(showcaseHtml({ slug: "some-other-project", images: showcaseImages, units: showcaseUnits }), "", "Projects without a showcase get nothing");
  // Projects without a confirmed offer: plans and calculator come from the live units' own payment data.
  const unit = (type, price, down, term) => ({ unit_type: type, bedrooms_text: "3 bedrooms", area_sqm: 150, starting_price: price, down_payment_text: down, installments_text: term });
  const vague = "المقدمات تبدأ من 3% في بعض المشاريع، حسب المشروع وموعد الاستلام.";
  const ownUnits = [unit("Apartment", 6909058, "5% down payment", "Installments over 8 years"), unit("iVilla", 15000000, "5% down payment + 5% after 3 months", "6 years"), unit("Villa", 30000000, vague, "الأقساط قد تصل إلى 12 سنة، حسب المشروع وموعد الاستلام.")];
  const own = showcaseHtml({ slug: "mountain-view-creek-view--mountain-view", images: Array.from({ length: 20 }, (_, index) => `https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/property-images/x/c${index}.webp`), units: ownUnits });
  assert.match(own, /<h2 class="tsc-h">أنظمة السداد في ماونتن فيو كريك فيو<\/h2>/, "Inventory plans: the payment-plans heading carries the project's searched name");
  assert.equal((own.match(/<article class="tsc-plan/g) || []).length, 2, "Inventory plans: one card per distinct plan on the live units");
  assert.equal((own.match(/<option /g) || []).length, 2, "Inventory plans: a unit with a vague plan text is left out of the calculator");
  assert.match(own, /345,453/, "Inventory plans: the calculator shows 5% of the cheapest home");
  assert.match(own.replace(/<[^>]+>/g, ""), /المقدم على دفعتين: 5% \+ 5% بعد 3 شهور/, "Inventory plans: a split down payment is spelled out");
  assert.doesNotMatch(own, /عرض المطور|خصم/, "Inventory plans: no offer or discount is claimed for a project without a confirmed offer");
  const walkOnly = showcaseHtml({ slug: "mountain-view-kingsway--mountain-view", images: showcaseImages, units: [ownUnits[2]] });
  assert.ok(/data-tsc-walk/.test(walkOnly) && !/class="tsc-plan|data-tsc-calc|class="tsc-facts"/.test(walkOnly), "Only vague plan texts: the photo walk-through shows, and no payment numbers");
  const aliva = showcaseHtml({ slug: "mountain-view-aliva--mountain-view", images: showcaseImages, units: showcaseUnits, now: Date.parse("2026-11-17T12:00:00+02:00") });
  assert.match(aliva, /أنظمة السداد في عرض ماونتن فيو أليفا/, "Aliva carries the offer's three systems");
  assert.equal((aliva.match(/<article class="tsc-plan/g) || []).length, 3, "Aliva: three payment systems");
  const lvls = showcaseHtml({ slug: "mountain-view-lvls--mountain-view", images: Array.from({ length: 20 }, (_, index) => `https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/property-images/x/l${index}.webp`), units: showcaseUnits, now: Date.parse("2026-11-17T12:00:00+02:00") }).replace(/<[^>]+>/g, " ");
  assert.ok(/أنظمة السداد في عرض ماونتن فيو ليفلز/.test(lvls) && /15%\s+خصم[\s\S]*للملاك الحاليين بس/.test(lvls) && !/45%/.test(lvls), "LVLS: the offer's owner discount is 15%, not the 45% of Aliva and iCity October");
  const chill = showcaseHtml({ slug: "mountain-view-chillout--mountain-view", images: Array.from({ length: 20 }, (_, index) => `https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/property-images/x/h${index}.webp`), units: [unit("One Villa", 16700000, "3%", "10 years"), unit("Townhouse", 21000000, "10% + 5% after 6 months", "7 years")] });
  assert.equal((chill.match(/<article class="tsc-plan/g) || []).length, 3, "Chillout: the two plans on its live units plus the launch plan from the developer's announcement");
  assert.match(chill.replace(/<[^>]+>/g, ""), /مقدم 10% وتقسيط 8 سنين/, "Chillout: the launch plan is on the page");
  // A plan confirmed by Ahmed for the whole project replaces the text stored on its units.
  const jirian = showcaseHtml({ slug: "mountain-view-jirian--mountain-view", images: Array.from({ length: 20 }, (_, index) => `https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/property-images/x/j${index}.webp`), units: [unit("Apartment", 8681153, "3% down payment", "Installments over 12 years"), unit("Villa", 30000000, vague, "x")] }).replace(/<style>[\s\S]*?<\/style>/, "");
  assert.ok(/مقدم <span class="tsc-n">5%<\/span> وتقسيط <span class="tsc-n">8<\/span> سنين/.test(jirian) && (jirian.match(/<article class="tsc-plan/g) || []).length === 1, "Jirian: one plan, 5% over 8 years");
  assert.ok(/434,058/.test(jirian) && (jirian.match(/<option /g) || []).length === 2 && !/>3%<|12<\/span> سنة/.test(jirian), "Jirian: the calculator uses 5% for every home, and the old 3% / 12 years is gone from the block");
  const config = require("../content/project-showcase.json").projects;
  for (const [slug, entry] of Object.entries(config)) {
    assert.ok(entry.name_ar && entry.name_en, `${slug}: the showcase needs an Arabic and an English name`);
    // A project with too few photos gets no walk-through; its plans and calculator still show.
    if (entry.walk === undefined) continue;
    assert.ok(Array.isArray(entry.walk?.photos) && entry.walk.photos.length >= 5 && !entry.walk.photos.includes(0) && new Set(entry.walk.photos).size === entry.walk.photos.length, `${slug}: the walk-through needs at least five different photos, none of them the page's main photo`);
  }
  assert.match(fs.readFileSync(path.join(root, "src/pages/ProjectPage.tsx"), "utf8"), /<ProjectShowcase /, "The browser project page shows the same showcase block");
}
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
assert.match(sitemap, /SITE_URL}\$\{unitPath\(\{ \.\.\.unit, project_slug/, "sitemap lists readable unit URLs");
assert.match(sitemap, /SITE_URL}\/en\/guides\/\${guideSlug}/);
assert.match(projectPage, /loadProjectPage\(slug\)/);
assert.match(projectPage, /mountain-view-icity-october--mountain-view/);
assert.match(projectPage, /master plan.*رسمي/s);
const dataPages = fs.readFileSync(path.join(root, "scripts/lib/data-pages.cjs"), "utf8");
assert.match(dataPages, /mountain-view-icity-october--mountain-view/);
assert.match(dataPages, /موقع \$\{project\.name\} والـmaster plan/);
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
  global.fetch = async (url) => {
    if (String(url).includes("/projects?")) throw new Error("temporary projects metadata failure");
    return {
      ok: true,
      json: async () => rows,
    };
  };
  try {
    const upstreamFailureResponse = await handler({
      path: `/projects/${projects[0].slug}`,
      rawUrl: `https://tycoons-inv.com/projects/${projects[0].slug}`,
      queryStringParameters: { lang: "ar", type: "project", slug: projects[0].slug },
    });
    assert.equal(upstreamFailureResponse.statusCode, 503);
    assert.equal(upstreamFailureResponse.headers["x-robots-tag"], "noindex, follow");

    global.fetch = async (url) => ({
    ok: true,
      json: async () => String(url).includes("/projects?") ? projectsMeta : rows,
    });
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
    const englishGuideResponse = await handler({
      path: "/en/guides/payment-plan-comparison/",
      rawUrl: "https://tycoons-inv.com/en/guides/payment-plan-comparison/",
      queryStringParameters: { lang: "en" },
    });
    const legacyUnitResponse = await handler({
      path: `/units/${rows[0].id}`,
      rawUrl: `https://tycoons-inv.com/units/${rows[0].id}`,
      queryStringParameters: {},
    });
    assert.equal(legacyUnitResponse.statusCode, 301, "legacy UUID unit URLs must 301 to the readable URL");
    const readableUnit = legacyUnitResponse.headers.location;
    assert.match(readableUnit, new RegExp(`^/units/${rows[0].id.slice(0, 8)}-[a-z0-9-]+$`));
    assert.deepEqual(parseUnitParam(readableUnit.replace("/units/", "")), { prefix: rows[0].id.slice(0, 8) });
    const unitResponse = await handler({
      path: readableUnit,
      rawUrl: `https://tycoons-inv.com${readableUnit}`,
      queryStringParameters: {},
    });
    const staleWordsResponse = await handler({
      path: `/units/${rows[0].id.slice(0, 8)}-old-words`,
      rawUrl: `https://tycoons-inv.com/units/${rows[0].id.slice(0, 8)}-old-words`,
      queryStringParameters: {},
    });
    assert.equal(staleWordsResponse.statusCode, 301);
    assert.equal(staleWordsResponse.headers.location, readableUnit);
    assert.equal(typeof readableUnitPath, "function");
    const englishDirectoryResponse = await handler({
      path: "/en/directory/",
      rawUrl: "https://tycoons-inv.com/en/directory/",
      queryStringParameters: {},
    });
    const unknownProjectResponse = await handler({
      path: "/projects/not-a-published-project",
      rawUrl: "https://tycoons-inv.com/projects/not-a-published-project",
      queryStringParameters: { lang: "ar", type: "project", slug: "not-a-published-project" },
    });
    const synthesizedProjectResponse = await handler({
      path: "/projects/aliva-old-name--mountain-view",
      rawUrl: "https://tycoons-inv.com/projects/aliva-old-name--mountain-view",
      queryStringParameters: { lang: "ar", type: "project", slug: "aliva-old-name--mountain-view" },
    });
    assert.match(projectResponse.body, /<title>Mountain View Aliva(: الأسعار وأنظمة السداد| Prices &amp; Payment Plans) 2026/);
    assert.match(projectResponse.body, /hreflang="ar-EG" href="https:\/\/tycoons-inv\.com\/projects\//);
    assert.match(guideResponse.body, /دليل شراء عقار تحت الإنشاء \(Off-plan\) في مصر/);
    assert.equal(englishGuideResponse.statusCode, 200);
    assert.match(englishGuideResponse.body, /How to Compare Property Payment Plans in Egypt/);
    assert.match(englishGuideResponse.body, /canonical" href="https:\/\/tycoons-inv\.com\/en\/guides\/payment-plan-comparison\//);
    assert.equal(unitResponse.statusCode, 200);
    assert.match(unitResponse.body, /Standalone Villa/);
    assert.equal(englishDirectoryResponse.statusCode, 200);
    assert.equal(englishDirectoryResponse.headers["content-language"], "en");
    assert.match(englishDirectoryResponse.body, /<html lang="en" dir="ltr">/);
    assert.match(englishDirectoryResponse.body, /canonical" href="https:\/\/tycoons-inv\.com\/en\/directory\//);
    assert.equal(unknownProjectResponse.statusCode, 404);
    assert.equal(unknownProjectResponse.headers["x-robots-tag"], "noindex, follow");
    assert.equal(synthesizedProjectResponse.statusCode, 404);
    assert.equal(synthesizedProjectResponse.headers["x-robots-tag"], "noindex, follow");
    // Production drops the rewrite's query string: an unknown Arabic project slug must
    // still 404 from its path alone, never render the directory with 200 (soft 404).
    const pathOnlyUnknownProject = await handler({
      path: "/projects/mountain-view-icity",
      rawUrl: "https://tycoons-inv.com/projects/mountain-view-icity",
      queryStringParameters: {},
    });
    assert.equal(pathOnlyUnknownProject.statusCode, 404, "unknown /projects/<slug> must be a real 404");
    assert.equal(pathOnlyUnknownProject.headers["x-robots-tag"], "noindex, follow");
  } finally {
    global.fetch = originalFetch;
  }
  console.log(`SEO regression validation passed for ${projects[0].slug}`);
}

validateRouteRecovery().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
