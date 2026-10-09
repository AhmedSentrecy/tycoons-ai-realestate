"use strict";
const assert = require("node:assert/strict");
(async () => {
  const { assessArticleReview } = await import("../server/tycoons-admin/article-review.mjs");
  const id = "388facbc-4244-4883-b6fd-38b124cf4e17";
  const project = { id: "project-5a", name: "5A", slug: "5a--waterway", location: "New Cairo" };
  const unit = { id, project_id: project.id, unit_type: "Office", area_sqm: 1122, starting_price: 364650000, down_payment_text: "25%", installments_text: "2 Years", availability_status: "available", last_updated_at: "2026-10-01" };
  const path = `/units/${id}`;
  const projectPath = `/projects/${project.slug}`;
  const article = { language: "ar", target_type: "project", project_id: project.id, title: "مقدمة مشروع 5A", slug: "5a-guide", excerpt: "مقدمة عن 5A", meta_title: "مقدمة مشروع 5A", meta_description: "معلومات مشروع 5A", source_refs: [{ type: "project", id: project.id, url: projectPath }, { type: "unit", id, url: path }] };
  const review = (body_markdown, sources = { projects: [project], units: [unit] }, fields = {}) => assessArticleReview({ ...article, body_markdown, ...fields }, sources);
  const blocked = issues => issues.some(issue => issue.severity === "blocker");
  for (const body of [path, `${path}.`, `(${path})`, `المصدر: ${path}،`, projectPath, `[5A](${projectPath})`, `[الوحدة](${path})`, `${projectPath}\n${path}`, `المصادر: ${projectPath} و${path}`]) {
    assert.equal(blocked(review(body)), false, body);
  }
  const visibleParagraph = "- يمكن الوصول إلى صفحة المشروع وسجل الوحدة المسجلة عبر الروابط الداخلية المتاحة: /projects/5a--waterway و/units/388facbc-4244-4883-b6fd-38b124cf4e17";
  assert.equal(blocked(review(visibleParagraph, undefined, { title: "مقدمة شاملة عن مشروع 5A من Waterway في New Cairo", slug: "مukadima-5a-waterway-new-cairo", meta_description: "ملخص عن مشروع 5A من Waterway في New Cairo، مع توضيح وحدات نموذجية مسجلة واحتياطات التحقق التجاري قبل الشراء." })), false, "captured production paragraph and slug are source identifiers, not numeric claims");
  for (const body of [`${path} 999 EGP`, `[999 EGP](${path})`, `999 ${projectPath}`, `${path} ٩٩٩ جنيه`, `${path} ９９９ EGP`]) {
    const issues = review(body);
    assert.ok(issues.some(issue => issue.code === "unsupported_numeric_claim"), body);
    assert.match(issues.find(issue => issue.code === "unsupported_numeric_claim").message, /999|٩٩٩|９９９/, "diagnostic shows the actual offending number");
  }
  for (const body of [`${path}999`, `${path}/999`, `${path}?price=999`, `${path}#999`, "/units/unknown", "/projects/other", `/units/${id.replace("388", "389")}`]) {
    assert.ok(review(body).some(issue => issue.code === "source_reference_invalid"), body);
  }
  for (const body of [`https://example.com${path}`, id, `999 [source](${path})`]) assert.ok(blocked(review(body)), body);
  assert.ok(blocked(review(path, { projects: [project], units: [] })), "deleted source path must not be exempted");
  assert.ok(blocked(review(path, { projects: [project], units: [{ ...unit, project_id: "other" }] })), "out-of-scope source path must not be exempted");
  assert.ok(blocked(review(path, undefined, { source_refs: article.source_refs.slice(0, 1) })), "unreferenced unit path must not be exempted");
  assert.ok(blocked(review(`999 EGP [project](${projectPath})`)), "valid project link must not hide a claim");
  console.log("Exact internal-reference numeric review regressions passed (offline only).");
})().catch(error => { console.error(error); process.exitCode = 1; });
