"use strict";

// Reviewed page copy kept in the repo (content/*.source.json) must follow the site rules
// (Nov 2026): one value per fact, land area in feddan only, no prices in prose except the live
// {{min_price}} token, no outbound links, and enough depth to rank.
const assert = require("node:assert/strict");
const projects = require("../content/project-articles.source.json").projects || {};
const developers = require("../content/developer-articles.source.json").articles || [];

let checks = 0;
const problems = [];
const ok = (value, message) => { checks += 1; if (!value) problems.push(message); };

const INTERNAL = /^\/(?:(?:ar|en)\/)?(?:projects|areas|developers|guides)\/[a-z0-9-]+\/?$/;
// "464 Acre" (capital A, singular) is SODIC's project name, not a unit.
const ACRE = /(?<![\u0600-\u06FF])[وب]?(?:أكر|اكر)(?![\u0600-\u06FF])|\b[Aa]cres\b|\bacre\b/; // whole word, so «أكروبوليس» passes
const MONEY = /(?<![A-Za-z\d])\d[\d,.]*\s*(?:جنيه|ج\.م|مليون|ألف|EGP|million|M\b)|(?:EGP|جنيه)\s*\d|\d+\s*%|\d+\s*(?:سنين|سنوات|سنة|years?)\b(?=.*(?:تقسيط|installment|قسط))/i;
const words = (text) => String(text || "").split(/\s+/).filter((word) => /\p{L}/u.test(word)).length;
const segmentsText = (segments) => (segments || []).map((segment) => segment.text || "").join("");
const blockText = (block) => block.type === "paragraph" ? segmentsText(block.content)
  : block.type === "subheading" ? block.text || ""
    : (block.items || []).map(segmentsText).join(" ");
const hrefsOf = (blocks) => blocks.flatMap((block) => (block.type === "paragraph" ? [block.content] : block.items || []).flat().map((segment) => segment && segment.href).filter(Boolean));

for (const [slug, locales] of Object.entries(projects)) {
  ok(/^[a-z0-9-]+--[a-z0-9-]+$/.test(slug), `${slug}: slug format`);
  for (const lang of ["ar", "en"]) {
    const page = locales[lang];
    ok(page, `${slug}/${lang}: missing`);
    if (!page) continue;
    const tag = `${slug}/${lang}`;
    ok(page.h1 && page.h1.length <= 120, `${tag}: h1`);
    ok(page.seo_title && page.seo_title.length <= 65, `${tag}: seo_title ≤ 65 chars (${(page.seo_title || "").length})`);
    ok(page.seo_description && page.seo_description.length >= 100 && page.seo_description.length <= 165, `${tag}: seo_description 100–165 chars (${(page.seo_description || "").length})`);
    const sections = page.article_sections || [];
    ok(sections.length >= 6, `${tag}: at least 6 sections`);
    const opening = sections[0] ? sections[0].blocks.map(blockText).join(" ") : "";
    ok(opening.includes("{{min_price}}"), `${tag}: opening carries the live price token`);
    const body = sections.map((section) => `${section.heading} ${section.blocks.map(blockText).join(" ")}`).join("\n");
    const faqText = (page.faq || []).map((item) => `${item.question} ${item.answer}`).join("\n");
    const all = `${page.h1}\n${page.seo_title}\n${page.seo_description}\n${body}\n${faqText}`;
    ok(words(body) >= (lang === "ar" ? 800 : 500), `${tag}: body words ${words(body)}`);
    ok((page.faq || []).length >= 4, `${tag}: at least 4 FAQ`);
    ok(!ACRE.test(all), `${tag}: land area in feddan only`);
    ok(!MONEY.test(all.replaceAll("{{min_price}}", "")), `${tag}: no prices, percentages or payment terms in prose (${(all.replaceAll("{{min_price}}", "").match(MONEY) || [""])[0]})`);
    ok(!/\{\{(?!min_price\}\})/.test(all), `${tag}: only the {{min_price}} token`);
    ok(!/\b20\d\d\b/.test(`${body}\n${faqText}`.replace(/\b2026\b/g, "")), `${tag}: no dates in the body`);
    const hrefs = hrefsOf(sections.flatMap((section) => section.blocks));
    ok(hrefs.every((href) => INTERNAL.test(href)), `${tag}: internal links only (${hrefs.filter((href) => !INTERNAL.test(href)).join(", ")})`);
    ok(hrefs.every((href) => (lang === "en") === href.startsWith("/en/")), `${tag}: links in the page's language`);
    ok(hrefs.length >= 2, `${tag}: links its area or developer pages`);
    ok(!hrefs.some((href) => href.replace(/^\/(?:ar|en)/, "").replace(/\/$/, "") === `/projects/${slug}`), `${tag}: no link to itself`);
  }
}

for (const article of developers) {
  const tag = `developer ${article.entity}/${article.locale}`;
  const html = String(article.body_html || "");
  const text = html.replace(/<[^>]+>/g, " ");
  ok(!ACRE.test(text), `${tag}: land area in feddan only`);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1].replace(/^https:\/\/tycoons-inv\.com/, ""));
  // Older batches linked developer websites (rendered as plain text by safeHref); new ones link only our pages.
  if (article.batch === "tycoons-2026-11") ok(hrefs.every((href) => INTERNAL.test(href)), `${tag}: internal links only (${hrefs.filter((href) => !INTERNAL.test(href)).join(", ")})`);
  ok(!/<(?!\/?(?:section|h2|h3|p|ol|ul|li|a|strong)\b)[a-z]/i.test(html), `${tag}: allowed tags only`);
}

// Each repo guide renders on its project page: H1/title from the file, the price token filled from
// the units, its FAQ visible (the FAQPage schema must match visible questions), no raw tokens.
const { renderProjectStatic } = require("./lib/data-pages.cjs");
const shell = `<!doctype html><html lang="ar" dir="rtl"><head><title>x</title><meta name="description" content="x"><link rel="canonical" href="https://tycoons-inv.com/"></head><body><div id="root"></div></body></html>`;
for (const [slug, locales] of Object.entries(projects)) {
  const html = renderProjectStatic(shell, { id: slug, name: slug, slug, developer: "Dev", location: "New Cairo", status: "available" },
    [{ id: "00000000-0000-4000-8000-000000000001", project_id: slug, unit_type: "Apartment", area_sqm: 100, starting_price: 7654321, delivery_text: "Ready to move" }], []);
  ok(html.includes(`<h1 class="mt-5 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">${locales.ar.h1.replace(/&/g, "&amp;")}</h1>`), `${slug}: H1 from the repo guide`);
  ok(html.includes("7,654,321"), `${slug}: price token filled from the units`);
  ok(!html.includes("{{"), `${slug}: no raw tokens`);
  ok(locales.ar.faq.every((item) => html.includes(item.question.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"))), `${slug}: FAQ visible`);
}

assert.deepEqual(problems, [], `Content source problems:\n- ${problems.join("\n- ")}`);
console.log(`Content source tests passed (${checks} checks, ${Object.keys(projects).length} projects, ${developers.length} developer articles).`);
