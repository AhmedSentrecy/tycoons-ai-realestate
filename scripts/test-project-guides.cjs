#!/usr/bin/env node
// Project guides from the writing tool ("اكتب المقال", Nov 2026): a published guide becomes the
// project page's own guide, and the review gate holds it to the tycoons-project-guides rules.
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const {
  isProjectGuideArticle, guideFromArticle, attachPublishedGuides, localizedProjectContent,
  hasIndexableContent, hasOwnWrittenGuide, guideArticleSlug,
} = require("../netlify/functions/_localized-project-content.cjs");

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };

const filler = (n) => Array.from({ length: n }, () => "المشروع قريب من خدمات كتير ومناسب للعائلات").join(" ");
const body = [
  "ماونتن فيو التجمع مشروع من ماونتن فيو في [التجمع الخامس](/ar/areas/new-cairo) على مساحة 500 فدان.",
  "",
  "اللي بيدوّر على «اي سيتي التجمع» غالبًا بيقصد المشروع ده.",
  "",
  "## موقع ماونتن فيو التجمع وإزاي توصله",
  `قريب من الكيلو 200 ومن محور 26 يوليو وعلى بعد 15 دقيقة من المطار. ${filler(60)}`,
  "## المطور: ماونتن فيو",
  `[ماونتن فيو](/ar/developers/mountain-view) شركة معروفة. شوف [موقع خارجي](https://example.com). ${filler(40)}`,
  "## المخطط العام والتصميم",
  "### الحدائق",
  `- حدائق كبيرة\n- بحيرات ${filler(20)}`,
  "## عيوب ماونتن فيو التجمع: نقط لازم تعرفها قبل الشراء",
  filler(20),
  "## قبل ما تحجز",
  "كلم فريق Tycoons.",
].join("\n");
const faq = Array.from({ length: 6 }, (_, index) => ({ question: index ? `سؤال رقم ${"ا".repeat(index)}؟` : "ماونتن فيو التجمع فين؟", answer: "في التجمع الخامس." }));
const article = {
  id: "a1", language: "ar", target_type: "project", project_id: "p1", slug: "mv-icity-guide", published_at: "2026-11-05",
  title: "ماونتن فيو آي سيتي في التجمع الخامس من ماونتن فيو — Mountain View iCity", meta_title: "ماونتن فيو التجمع 2026 | Mountain View iCity",
  meta_description: `ماونتن فيو التجمع مشروع ماونتن فيو في التجمع الخامس بحدائق ونادي. اعرف الموقع والوحدات والعيوب قبل الشراء 2026 ${"ك".repeat(20)}`,
  focus_keyword: "ماونتن فيو التجمع", body_markdown: body, faq,
};

// 1. Only articles with the guide headings are guides.
ok(isProjectGuideArticle(article), "guide headings make a project guide");
ok(!isProjectGuideArticle({ ...article, body_markdown: body.replace("## قبل ما تحجز", "## قبل ما تقرر") }), "an older article (قبل ما تقرر) keeps the old embedded behaviour");
ok(!isProjectGuideArticle({ ...article, target_type: "area" }), "area articles are never project guides");

// 2. Markdown becomes guide sections; only internal links survive; price only with units.
const guide = guideFromArticle(article, { hasUnits: true });
ok(guide.h1 === article.title && guide.seo_title === article.meta_title && guide.faq.length === 6, "title → H1, meta → SEO title, FAQ kept");
ok(guide.article_sections[0].heading === "" && guide.article_sections[0].blocks.length === 2, "opening section has the two opening paragraphs");
const opening = guide.article_sections[0].blocks[0].content;
ok(opening.some((segment) => segment.href === "/ar/areas/new-cairo") && opening.at(-1).text.includes("{{min_price}}"), "internal link kept; starting price token added");
ok(!guideFromArticle(article, { hasUnits: false }).article_sections[0].blocks[0].content.some((segment) => segment.text.includes("{{min_price}}")), "no units: no price sentence (never “from 0”)");
const developer = guide.article_sections.find((section) => section.heading.startsWith("المطور"));
ok(developer.blocks[0].content.some((segment) => segment.href === "/ar/developers/mountain-view") && !developer.blocks[0].content.some((segment) => String(segment.href || "").startsWith("http")), "external link dropped to plain text");
const plan = guide.article_sections.find((section) => section.heading === "المخطط العام والتصميم");
ok(plan.blocks[0].type === "subheading" && plan.blocks[1].type === "ordered_list" && plan.blocks[1].items.length === 2, "### and lists kept");

// 3. The project row carries it; repo file and stored content still win.
const projects = [{ id: "p1", slug: "mountain-view-icity-new-cairo--mountain-view", targeting: {} }, { id: "p2", slug: "plain", targeting: { localized_content: { ar: { h1: "مكتوب", article_sections: [{ heading: "", blocks: [{ type: "paragraph", content: [{ text: "نص" }] }] }], faq: [] } } } }];
attachPublishedGuides(projects, [article, { ...article, project_id: "p2", slug: "other" }], new Set(["p1"]));
ok(localizedProjectContent({ ...projects[0], slug: "brand-new" }, "ar").h1 === article.title, "published guide is the page's guide");
ok(localizedProjectContent(projects[0], "ar").h1 !== article.title, "the repo guide of the same project still wins");
ok(localizedProjectContent(projects[1], "ar").h1 === "مكتوب", "stored content still wins over a published guide");
ok(hasOwnWrittenGuide(projects[1], "ar") === false && guideArticleSlug(projects[1], "ar") === "other", "written-guide check ignores the article; its slug is known for the redirect");
ok(hasIndexableContent({ ...projects[0], slug: "brand-new" }, "ar"), "a full published guide makes the page indexable");

(async () => {
  // 4. Review gate: guide rules in code, sourced numbers allowed, money still blocked.
  const { assessArticleReview, isProjectGuide } = await import(pathToFileURL(path.join(__dirname, "../server/tycoons-admin/article-review.mjs")));
  const sources = { projects: [{ id: "p1", slug: "mv", name: "Mountain View iCity" }], units: [] };
  const refs = [{ type: "project", id: "p1", url: "/projects/mv" }];
  const review = (extra) => assessArticleReview({ ...article, source_refs: refs, body_markdown: body.replace(/\(https:\/\/example\.com\)/, ""), ...extra }, sources);
  const codes = (issues, severity = "blocker") => issues.filter((issue) => issue.severity === severity).map((issue) => issue.code);
  ok(isProjectGuide(article), "review side sees the same guide markers");
  const clean = review({});
  ok(!codes(clean).includes("unsupported_numeric_claim"), "feddan, km, road number, minutes and 2026 are allowed in a guide");
  ok(!codes(clean).some((code) => code.startsWith("guide_")), `a guide that follows the rules has no guide blockers (${codes(clean).join(", ")})`);
  ok(codes(review({ body_markdown: `${body}\nالسعر 5 مليون جنيه` })).includes("unsupported_numeric_claim"), "prices stay blocked in a guide");
  ok(codes(review({ meta_title: "ماونتن فيو التجمع 2026 | Mountain View iCity New Cairo Ready Units" })).includes("guide_meta_title_length"), "titles over 60 characters are blocked");
  ok(codes(review({ faq: faq.slice(0, 4) })).includes("guide_faq_count"), "fewer than 6 FAQs are blocked");
  ok(codes(review({ body_markdown: body })).includes("guide_external_link"), "external links are blocked");
  ok(codes(review({ body_markdown: body.replace("500 فدان", "500 أكر") })).includes("guide_acre"), "acres are blocked");
  ok(codes(review({ body_markdown: body.replace(/ماونتن فيو التجمع مشروع/, "المشروع") })).includes("guide_keyword_missing"), "keyword must open the guide");
  ok(codes(review({ body_markdown: "قصير\n## المطور: x\n## عيوب x: نقط لازم تعرفها قبل الشراء\n## قبل ما تحجز" })).includes("guide_too_short"), "short guides are blocked");
  const older = assessArticleReview({ ...article, source_refs: refs, body_markdown: body.replace("## قبل ما تحجز", "## قبل ما تقرر").replace(/\(https:\/\/example\.com\)/, "") }, sources);
  ok(codes(older).includes("unsupported_numeric_claim") && !codes(older).some((code) => code.startsWith("guide_")), "older articles keep the strict no-numbers rule and no guide checks");

  // 5. The static project page shows it as its own guide.
  const { renderProjectStatic } = require("./lib/data-pages.cjs");
  const shell = `<!doctype html><html lang="ar" dir="rtl"><head><title>x</title><meta name="description" content="x"><link rel="canonical" href="https://tycoons-inv.com/"></head><body><div id="root"></div></body></html>`;
  const page = { id: "p9", name: "Mountain View iCity", slug: "mv-icity-test", developer: "Mountain View", location: "New Cairo", status: "available", targeting: {} };
  attachPublishedGuides([page], [{ ...article, project_id: "p9" }], new Set(["p9"]));
  const html = renderProjectStatic(shell, page, [{ id: "00000000-0000-4000-8000-000000000009", project_id: "p9", unit_type: "Apartment", area_sqm: 100, starting_price: 7654321, delivery_text: "Ready to move" }], [{ ...article, project_id: "p9" }]);
  ok(html.includes(">ماونتن فيو آي سيتي في التجمع الخامس من ماونتن فيو — Mountain View iCity</h1>"), "H1 from the published guide");
  ok(html.includes("<title>ماونتن فيو التجمع 2026 | Mountain View iCity"), "title from the published guide");
  ok(html.includes("7,654,321") && !html.includes("{{"), "starting price filled from the units");
  ok(html.includes("ماونتن فيو التجمع فين؟"), "FAQ visible");
  ok((html.match(/## المطور|المطور: ماونتن فيو/g) || []).length <= 2, "the guide is not repeated as a second embedded article");

  console.log(`Project guide tests passed (${checks} checks).`);
})().catch((error) => { console.error(error); process.exit(1); });
