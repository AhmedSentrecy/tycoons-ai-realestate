// Offline: the editor's "fix publish blockers" helpers against the real server
// review, plus the rewrite endpoint's request/response contract. No network.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { assessArticleReview } from "../server/tycoons-admin/article-review.mjs";
import { applyLines, articleProjects, canonicalProject, cleanBody, cleanText, isBrokerSource, issueInArabic, numericLines, repairSources, safeSlug, stripNumbers } from "../src/lib/articleAutofix.ts";

const require = createRequire(import.meta.url);
const gen = require("../netlify/functions/_article-generation.cjs");
let checks = 0;
const check = (value: unknown, message: string) => { assert.ok(value, message); checks += 1; };

const old = { id: "old", name: "Mountain View 1.1", slug: null, developer: "Mountain View", location: "New Cairo" };
const good = { id: "good", name: "Mountain View 1.1", slug: "mountain-view-1-1--mountain-view", developer: "Mountain View", location: "Fifth Settlement, New Cairo" };
const projects: any[] = [old, good, { id: "x", name: "Other", slug: "other--dev", developer: "Dev", location: "Zayed" }];
const article: any = {
  language: "ar", target_type: "project", project_id: "old", area_name: null,
  title: "Mountain View 1.1 التجمع الخامس — هل مناسب للعائلات؟", slug: "mountain-view-1-1-new-cairo-family-guide",
  focus_keyword: "Mountain View 1.1 التجمع الخامس", excerpt: "نظرة على موقع Mountain View 1.1 قرب بوابة الرحاب الأولى.",
  meta_title: "Mountain View 1.1 التجمع الخامس دليل سريع للعائلات", meta_description: "Mountain View 1.1 التجمع الخامس إجابة مباشرة: مشروع قرب بوابة الرحاب الأولى مع مساحات خضراء ومرافق عائلية.",
  body_markdown: "Mountain View 1.1 التجمع الخامس مشروع من تطوير Mountain View.\n\n## Mountain View 1.1 التجمع الخامس\n\nالمشروع فيه مساحات خضراء. ويمتد على مساحة تقارب 127 فدان ويضم أكثر من 1,700 وحدة.\n\n## المطور\n\nمشاريع سابقة مثل Mountain View 1 و2 و3 و4.\n\nشوف [وحدة قديمة](/units/old-unit) و[القاهرة الجديدة والتجمع](/ar/areas/new-cairo). {{min_area}}",
  key_takeaways: ["Mountain View 1.1 من تطوير Mountain View في التجمع الخامس.", "قريب من الجامعة الأمريكية.", "مساحات خضراء.", "مرافق رياضية."],
  faq: [{ question: "مين مطور Mountain View 1.1؟", answer: "Mountain View، ولها مشروعات Mountain View 1 و2 و3 و4." }],
  source_refs: [{ type: "web", id: "web:1", label: "Mountain View news", url: "https://www.mountainviewegypt.com/news" }, { type: "web", id: "web:2", label: "كمبوند ماونتن فيو 1.1 | تفاصيل وأسعار 2026 | شارى", url: "https://shary.eg/x" }, { type: "unit", id: "old-unit", label: "Villa", url: "/units/old-unit" }],
};
const blockers = (a: any) => assessArticleReview(a, { projects: projects.filter((p) => p.id === a.project_id), units: [] }).filter((i: any) => i.severity === "blocker");

// The legacy duplicate row blocks everything; the picker hides it.
check(blockers(article).some((i: any) => i.code === "source_grounding_missing"), "an article on a slug-less duplicate has no grounding");
check(!articleProjects(projects as any).some((p) => p.id === "old"), "the article project picker hides rows without a page");
const project = canonicalProject(projects as any, "old")!;
check(project.id === "good", "the duplicate resolves to the project row with a page");
check(canonicalProject(projects as any, "good")!.id === "good", "a row with a page stays");

const refs = repairSources(article, project, true);
check(refs[0].type === "project" && refs[0].url === "/projects/mountain-view-1-1--mountain-view", "the project source comes first");
check(!refs.some((r) => r.type === "unit") && !refs.some((r) => r.url.includes("shary")), "old units and broker sources are dropped");
check(isBrokerSource({ url: "https://www.mountain-viewegypt.org/", label: "استلام فوري من 14.5 مليون" }) && !isBrokerSource({ url: "https://www.mountainviewegypt.com/", label: "Mountain View" }), "sales pages are brokers, developer sites are not");

const allowed = new Set(refs.filter((r) => r.type !== "web").map((r) => r.url));
let next: any = { ...article, project_id: project.id, source_refs: refs, body_markdown: cleanBody(article.body_markdown, allowed), excerpt: cleanText(article.excerpt, allowed) };
check(!next.body_markdown.includes("/units/old-unit") && next.body_markdown.includes("وحدة قديمة") && next.body_markdown.includes("](/ar/areas/new-cairo)") && !next.body_markdown.includes("{{"), "stale unit links become text; area links and clean text stay");
const issues = assessArticleReview(next, { projects: [good], units: [] });
const left = issues.filter((i: any) => i.severity === "blocker").map((i: any) => i.field);
check(!left.includes("title") && !left.includes("focus_keyword") && !left.includes("slug"), `re-grounding clears name-only numbers, including the slug (left: ${left})`);
const lines = numericLines(next, issues as any, [good.name]);
check(lines.length === 3 && lines.every((l) => /\d/.test(l.text.replace("1.1", ""))), "only lines with real numbers go to the rewrite");
next = applyLines(next, lines, lines.map((l) => stripNumbers(l.text, [good.name])));
check(blockers(next).length === 0, "after the fallback nothing blocks publication");
check(next.body_markdown.includes("المشروع فيه مساحات خضراء.") && !/127|1,700/.test(next.body_markdown), "only the sentence with the number is dropped");
check(next.faq[0].answer.includes("Tycoons"), "an emptied FAQ answer gets a safe answer");
check(stripNumbers("## Mountain View 1.1 بمساحة 127 فدان", [good.name]) === "## Mountain View 1.1 بمساحة فدان", "headings keep the name and lose the number");
check(safeSlug("mountain-view-1-1-family-2026", good.slug) === "mountain-view-family", "a slug drops digit words it cannot verify");
check(safeSlug("mountain-view-1-1-family-guide", good.slug) === "mountain-view-1-1-family-guide", "a slug that only carries the project name is kept");
check(/زرار التصليح/.test(issueInArabic({ code: "source_grounding_missing", field: "source_refs", severity: "blocker", message: "x" })) && /127/.test(issueInArabic({ code: "unsupported_numeric_claim", field: "body_markdown", severity: "blocker", message: "Numeric text requires source verification: “مساحة 127 فدان”." })), "notes are explained in Arabic with the flagged text");

// Rewrite endpoint contract.
const input = gen.parseRequest({ body: JSON.stringify({ action: "rewrite", target_type: "project", project_id: "good", language: "ar", lines: ["سطر فيه 3 غرف", "سطر تاني 5"] }) });
check(input.lines.length === 2, "rewrite accepts lines");
assert.throws(() => gen.parseRequest({ body: JSON.stringify({ action: "rewrite", target_type: "project", project_id: "good", lines: [] }) }), /rewrite_lines_invalid/); checks += 1;
const request = gen.buildRewriteRequest(input, [good]);
check(request.input[0].content.includes("Mountain View 1.1") && request.text.format.name === "article_rewrite", "the rewrite prompt names the allowed project digits");
const ok = gen.parseOpenAiOutput({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ lines: ["أ", "ب"] }) }] }] }, "rewrite", { input });
check(ok.lines.length === 2, "a same-length rewrite is accepted");
assert.throws(() => gen.parseOpenAiOutput({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ lines: ["أ"] }) }] }] }, "rewrite", { input }), /generation_shape_invalid/); checks += 1;

console.log(`Article auto-fix tests passed (${checks} checks; offline only).`);
