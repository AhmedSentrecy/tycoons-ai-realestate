"use strict";

// One page, one answer per fact (content audit, Nov 2026 — Bloomfields project page).
const assert = require("node:assert/strict");
const { topicOf, dropCoveredSections, durationMonths, pageNumberConflicts, landAreaClaims } = require("../netlify/functions/_page-consistency.cjs");
const { renderSafeMarkdown } = require("../netlify/functions/_article-render.cjs");
const { renderProjectStatic } = require("./lib/data-pages.cjs");

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1; };

// Section topics: the headings that repeated on the Bloomfields page.
eq(topicOf("الموقع"), "location", "project location heading");
eq(topicOf("موقع كمبوند بلوم فيلدز وإزاي توصله"), "location", "guide location heading");
eq(topicOf("تطوير مصر كمطور"), "developer", "project developer heading");
eq(topicOf("مين المطور وإيه علاقته بالمشروع؟"), "developer", "guide developer heading");
eq(topicOf("قبل ما تحجز في بلوم فيلدز"), "before", "project closing heading");
eq(topicOf("قبل ما تقرر"), "before", "guide closing heading");
eq(topicOf("عيوب Bloomfields أو نقط لازم تعرفها قبل الشراء"), "drawbacks", "drawbacks is never 'before'");
eq(topicOf("أنواع الوحدات في كمبوند بلوم فيلدز"), "units", "unit types heading");
eq(topicOf("الخدمات والمرافق داخل Bloomfields"), "", "services stay");
eq(topicOf("تصور المشروع والمخطط العام والتصميم"), "", "master plan stays");

const guide = [
  "كمبوند بلوم فيلدز مشروع من تطوير مصر.",
  "## نبذة عن كمبوند بلوم فيلدز", "نبذة.",
  "## موقع كمبوند بلوم فيلدز وإزاي توصله", "موقع.", "### أهم نقط الربط", "- طريق",
  "## مين المطور وإيه علاقته بالمشروع؟", "مطور.",
  "## تصور المشروع والمخطط العام والتصميم", "مخطط [المشروع](/projects/bloomfields--tatweer-misr).",
  "## أنواع الوحدات في كمبوند بلوم فيلدز", "- [شقة](/units/55e3ffd7-9927-4455-90c6-0373d691e9c0)",
  "## عيوب Bloomfields أو نقط لازم تعرفها قبل الشراء", "عيوب.",
  "## قبل ما تقرر", "كلمنا.",
].join("\n");
const trimmed = dropCoveredSections(guide, new Set(["overview", "location", "developer", "units", "before"]));
ok(/تصور المشروع/.test(trimmed) && /عيوب/.test(trimmed), "unique sections stay");
ok(!/نبذة عن|موقع كمبوند|أهم نقط الربط|مين المطور|أنواع الوحدات|قبل ما تقرر/.test(trimmed), "covered sections and their ### go");
ok(/^كمبوند بلوم فيلدز مشروع/.test(trimmed), "the opening paragraph stays");

// Old /units/<uuid> links point at the readable URL the unit table uses.
const unitPaths = new Map([["55e3ffd7-9927-4455-90c6-0373d691e9c0", "/units/55e3ffd7-apartment-1-bedroom-bloomfields"]]);
const rendered = renderSafeMarkdown("- [شقة](/units/55e3ffd7-9927-4455-90c6-0373d691e9c0)", { unitPaths });
ok(rendered.includes('href="/units/55e3ffd7-apartment-1-bedroom-bloomfields"') && !rendered.includes("9927-4455"), "readable unit URL");

// Delivery durations.
eq(durationMonths("Delivery within 3 months"), 3, "within 3 months");
eq(durationMonths("استلام in 4.5 سنوات"), 54, "4.5 years");
eq(durationMonths("الاستلام خلال سنة"), 12, "one year");
eq(durationMonths("خلال سنتين"), 24, "two years");
eq(durationMonths("استلام فوري"), 0, "ready to move");

// Number conflicts: the exact Bloomfields case (meta "420 فدان" vs body "420 أكر (حوالي 405 فدان)").
eq(landAreaClaims("حوالي 420 أكر (حوالي 405 فدان)").length, 2, "two area claims");
eq(pageNumberConflicts({ texts: ["حوالي 420 أكر (حوالي 405 فدان)"] }).length, 0, "acre and its feddan conversion agree");
const areaConflict = pageNumberConflicts({ texts: ["420 فدان في مستقبل سيتي", "حوالي 420 أكر (حوالي 405 فدان)"] });
eq(areaConflict.length, 1, "420 feddan vs 405 feddan is a conflict");
eq(areaConflict[0].kind, "land_area", "conflict kind");
eq(pageNumberConflicts({ texts: ["أسعارها بتبدأ من 5,845,000 جنيه"], minPrice: 5845000 }).length, 0, "starting price matches inventory");
const priceConflict = pageNumberConflicts({ texts: ["أسعارها بتبدأ من 5,845,000 جنيه"], minPrice: 6100000 });
eq(priceConflict[0] && priceConflict[0].kind, "starting_price", "stale starting price is reported");

// The project page with its newest guide embedded.
const shell = `<!doctype html><html lang="ar" dir="rtl"><head><title>Home</title><meta name="description" content="home"><link rel="canonical" href="https://tycoons-inv.com/"></head><body><div id="root"></div></body></html>`;
const project = {
  id: "p-bloom", name: "Bloomfields", slug: "bloomfields--tatweer-misr", developer: "Tatweer Misr", location: "Mostakbal City",
  status: "available", seo_description: "دليل بلوم فيلدز: 420 فدان في مستقبل سيتي.", delivery_text: "خلال سنة",
  down_payment_text: "5% + 5% بعد 3 شهور", installments_text: "10 سنوات",
  article_sections: [
    { heading: "بلوم فيلدز في سطور", paragraphs: ["على مساحة حوالي 420 أكر (حوالي 405 فدان)، وأسعارها بتبدأ من 5,845,000 جنيه."] },
    { heading: "الموقع", paragraphs: ["في مستقبل سيتي."] },
    { heading: "تطوير مصر كمطور", paragraphs: ["مشاريع مسلمة."] },
    { heading: "قبل ما تحجز في بلوم فيلدز", paragraphs: ["اسأل عن المرحلة."] },
  ],
  faq: [{ question: "بلوم فيلدز فين؟", answer: "في مستقبل سيتي." }],
};
const units = [
  { id: "55e3ffd7-9927-4455-90c6-0373d691e9c0", project_id: "p-bloom", project_name: "Bloomfields", unit_type: "Apartment", bedrooms_text: "1 Bedroom", area_sqm: 76, starting_price: 5845000, delivery_text: "Delivery in 4.5 years", availability_status: "available", created_at: "2026-06-22T10:00:00Z", last_updated_at: "2026-06-22T10:00:00Z" },
  { id: "9c02bebc-49c7-40c1-977f-e1827a11e00d", project_id: "p-bloom", project_name: "Bloomfields", unit_type: "Duplex", bedrooms_text: "3 Bedrooms", area_sqm: 267, starting_price: 22115000, delivery_text: "within 3 months", availability_status: "available", created_at: "2026-06-22T10:00:00Z", last_updated_at: "2026-10-30T10:00:00Z" },
];
const reported = [];
const html = renderProjectStatic(shell, project, units, [{ slug: "bloomfields-guide", title: "كمبوند بلوم فيلدز في مستقبل سيتي", language: "ar", body_markdown: guide }], {
  unitPaths: new Map([["55e3ffd7-9927-4455-90c6-0373d691e9c0", "/units/55e3ffd7-apartment-1-bedroom-bloomfields"]]),
  reportConflict: (slug, problems) => reported.push({ slug, problems }),
});
ok(html.includes("تصور المشروع والمخطط العام"), "guide's own sections are embedded");
ok(!html.includes("مين المطور") && !html.includes("موقع كمبوند بلوم فيلدز وإزاي توصله") && !html.includes("<h2>قبل ما تقرر</h2>"), "guide does not repeat sections the page has");
ok(!html.includes("عن المطور:"), "no developer bio when the page already has a developer section");
ok(!/<a href="\/projects\/bloomfields--tatweer-misr">/.test(html.split('id="article"')[1] || ""), "embedded guide does not link the page to itself");
ok(html.includes("الاستلام من 3 شهور لـ 4.5 سنين حسب الوحدة"), "sidebar delivery agrees with the unit cards");
ok(!html.includes("الاستلام خلال سنة"), "project's single delivery line is not shown when units differ");
ok(!html.includes("آخر تحديث للسعر"), "unit cards carry no price-update date (Ahmed, Nov 2026)");
ok(html.includes("كمبوند بلوم فيلدز المستقبل سيتي من تطوير مصر"), "H1 carries the searched keyword");
ok(html.includes("Tatweer Misr · المستقبل سيتي"), "hero area in Arabic");
eq(reported.length, 1, "number conflict reported for the page");
ok(reported[0].problems.some((problem) => problem.kind === "land_area"), "the 420 feddan vs 405 feddan conflict");

// Article prompts: one value per fact, majority rule for conflicting physical facts.
const { buildResearchRequest, buildProjectFaqRequest } = require("../netlify/functions/_article-generation.cjs");
const subject = [{ name: "Bloomfields", developer: "Tatweer Misr", location: "Mostakbal City" }];
for (const request of [buildResearchRequest({ language: "ar", topic: "x" }, subject), buildProjectFaqRequest(subject)]) {
  const system = JSON.stringify(request);
  ok(/largest number of independent websites/.test(system) && /Never report two values/.test(system), "research keeps one value per fact");
  ok(!/Keep conflicting claims out|Leave conflicting facts out/.test(system), "conflicts are resolved, not dropped");
}
const draftSource = require("node:fs").readFileSync(require.resolve("../netlify/functions/_article-generation.cjs"), "utf8");
ok(draftSource.includes("One value per fact") && draftSource.includes("come only from Tycoons inventory rows"), "draft rules: no contradictions, inventory-only commercial facts");
ok(draftSource.includes("Mostakbal City → المستقبل سيتي"), "searched spelling of Mostakbal City");

console.log(`Page consistency tests passed (${checks} checks).`);
