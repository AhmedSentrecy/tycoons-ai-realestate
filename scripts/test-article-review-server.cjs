"use strict";
// Offline only: run the actual server functions with an in-memory database and
// synthetic environment values. No fetch/provider/client/database connection.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");
const { webcrypto } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const projects = [
  { id: "project-1", name: "5A", slug: "5a", location: "New Cairo" },
  { id: "project-2", name: "Other Project", slug: "other", location: "North Coast" },
];
const units = [
  { id: "unit-1", project_id: "project-1", unit_type: "Townhouse", area_sqm: 185, starting_price: 26760000, down_payment_text: "2.83%", installments_text: "9 years", delivery_text: "2030-12-31", availability_status: "available", last_updated_at: "2026-02-10T12:00:00Z" },
  { id: "unit-2", project_id: "project-1", unit_type: "Villa", area_sqm: 240, starting_price: 31000000, down_payment_text: "185%", installments_text: "7 years", delivery_text: "2031-01-01", availability_status: "available", last_updated_at: "2026-02-11T12:00:00Z" },
  { id: "unit-3", project_id: "project-2", unit_type: "Outside", area_sqm: 185, availability_status: "available", last_updated_at: "2026-02-10" },
];
const refs = [
  { type: "project", id: "project-1", label: "5A", url: "/projects/5a" },
  ...units.slice(0, 2).map((unit) => ({ type: "unit", id: unit.id, label: unit.unit_type, url: `/units/${unit.id}` })),
];
const base = {
  language: "en", target_type: "project", project_id: "project-1", area_name: null,
  title: "An introduction to 5A", slug: "5a-introduction", excerpt: "Explore 5A and its setting.",
  meta_title: "An introduction to 5A", meta_description: "Explore 5A and its setting.",
  body_markdown: "## Introduction\nExplore 5A and review its location with the developer.", source_refs: refs,
};
const owner = { id: "owner-1", username: "owner", display_name: "Owner", role: "owner" };
const copy = (value) => JSON.parse(JSON.stringify(value));
let checks = 0;
function check(value, message) { assert.ok(value, message); checks += 1; }

(async () => {
  const { assessArticleReview } = await import(pathToFileURL(path.join(root, "server/tycoons-admin/article-review.mjs")));
  const assess = (article, sources = { projects, units }) => assessArticleReview({ ...base, ...article }, sources);
  const blocker = (issues, code, field) => issues.some((issue) => issue.severity === "blocker" && (!code || issue.code === code) && (!field || issue.field === field));
  check(!blocker(assess({})), "project names containing digits are not numeric claims");
  for (const location of ["6 October", "6أكتوبر"]) {
    check(!blocker(assess({ title: `5A in ${location}`, body_markdown: `Explore 5A in ${location}.`, ...(location === "6 October" ? { slug: "6-october-guide" } : {}) }, { projects: [{ ...projects[0], location }], units })), "verified digit-bearing location names are identities");
  }
  check(blocker(assess({ area_name: "123 EGP", body_markdown: "5A costs 123 EGP" }), "unsupported_numeric_claim"), "editable area names never authorize numeric claims");
  check(assess({ body_markdown: "5A offers flexible payment plans and excellent amenities." }).some((issue) => issue.severity === "review" && issue.field === "body_markdown"), "qualitative prose requires review");
  check(!blocker(assess({ body_markdown: "5A offers flexible payment plans and excellent amenities." })), "qualitative prose can be edited and reviewed rather than discarded");
  for (const field of ["title", "slug", "excerpt", "meta_title", "meta_description", "body_markdown"]) {
    check(blocker(assess({ [field]: "5A costs 26760000 EGP" }), "unsupported_numeric_claim", field), `numeric ${field} requires bound evidence`);
    check(blocker(assess({ [field]: "5A {{min_area}}" }), "unresolved_placeholder", field), `placeholder ${field} blocks`);
  }
  for (const value of ["5A costs ٢٦٧٦٠٠٠٠ EGP", "5A costs ۲۶۷۶۰۰۰۰ EGP", "5A costs １２３ EGP", "5A costs १२३ EGP", "5A has 185 m²", "5A delivery is 2030-12-31"]) check(blocker(assess({ body_markdown: value }), "unsupported_numeric_claim"), value);
  const price = "- Price: 26760000 EGP — [Townhouse](/units/unit-1) — source updated: 2026-02-10 — must be verified before publication.";
  const sample = "- [Townhouse](/units/unit-1): 185 m² — source status: available — source updated: 2026-02-10.";
  for (const line of [price, sample,
    "- Down payment: 2.83% — [Townhouse](/units/unit-1) — source updated: 2026-02-10 — must be verified before publication.",
    "- Installments: 9 years — [Townhouse](/units/unit-1) — source updated: 2026-02-10 — must be verified before publication.",
    "- Delivery: 2030-12-31 — [Townhouse](/units/unit-1) — source updated: 2026-02-10 — must be verified before publication.",
    "- Availability: available — [Townhouse](/units/unit-1) — source updated: 2026-02-10 — must be verified before publication.",
  ]) check(!blocker(assess({ body_markdown: `5A\n${line}` })), `canonical English line accepted: ${line}`);
  check(!blocker(assess({ language: "ar", body_markdown: "5A\n- [Townhouse](/units/unit-1): 185 م² — الحالة في بيانات المصدر: available — تاريخ المصدر: 2026-02-10.\n- السعر: 26760000 EGP — [Townhouse](/units/unit-1) — تاريخ المصدر: 2026-02-10 — يجب التحقق منه قبل النشر." })), "canonical Arabic facts accepted");
  for (const line of [price.replace("26760000", "31000000"), price.replace("Price:", "Down payment:"), price.replace("unit-1", "unit-2"), price.replace("2026-02-10", "2026-02-11"), sample.replace("185", "240"), price + " Available now."]) {
    check(blocker(assess({ body_markdown: `5A\n${line}` }), "invalid_typed_fact"), "value, kind, unit, date and appended assertion are bound together");
  }
  check(blocker(assess({ body_markdown: `5A\n${price}` }, { projects, units: [{ ...units[0], starting_price: 1 }] }), "invalid_typed_fact"), "live source change invalidates evidence");
  check(blocker(assess({ body_markdown: `5A\n${sample}` }, { projects, units: [{ ...units[0], availability_status: "sold" }] }), "invalid_typed_fact"), "sold row invalidates available sample");
  check(blocker(assess({ body_markdown: "5A\n- Down payment: 185% — [Villa](/units/unit-2) — source updated: 2026-02-11 — must be verified before publication." }), "invalid_typed_fact"), "invalid source percentage is never canonical evidence");
  for (const installments of ["0 years", "-9 years"]) check(blocker(assess({ body_markdown: `5A\n- Installments: ${installments} — [Townhouse](/units/unit-1) — source updated: 2026-02-10 — must be verified before publication.` }, { projects, units: [{ ...units[0], installments_text: installments }, units[1]] }), "invalid_typed_fact"), "nonpositive installments are invalid facts");
  check(blocker(assess({ source_refs: [] }), "source_reference_invalid"), "missing refs block");
  check(blocker(assess({ source_refs: [{ type: "snapshot", id: "project-1", url: "/projects/5a", price: 26760000 }] }), "source_reference_invalid"), "arbitrary snapshots are not facts");
  check(blocker(assess({ source_refs: [...refs, { type: "unit", id: "unit-3", url: "/units/unit-3" }] }), "source_reference_invalid"), "cross-project units block");
  check(blocker(assess({ target_type: "area", project_id: null, area_name: "North Coast" }), "source_reference_invalid"), "area sources are scoped by current project location");
  check(!blocker(assess({ target_type: "area", project_id: null, area_name: "new cairo" })), "area matching is case insensitive");
  check(blocker(assess({ source_refs: refs.map((ref) => ({ ...ref, url: "https://fake.example/evidence" })) }), "source_reference_invalid"), "forged URLs do not authorize sources");
  check(blocker(assess({ body_markdown: "5A\n- Price: 1 EGP — [Townhouse](/units/unit-1) — source updated: 2026-02-10 — must be verified before publication.", source_refs: refs.map((ref) => ({ ...ref, starting_price: 1, review_confirmed: true })), review_issues: [], review_confirmed: true }), "invalid_typed_fact"), "flags and snapshot values cannot clear blockers");
  check(!blocker(assess({ body_markdown: "5A\n1. Ask about the location.\n2. Check the sources.\nSources and review: factual details require editorial verification." })), "list ordinals and final review notice are not placeholders");

  const source = fs.readFileSync(path.join(root, "server/tycoons-admin/index.ts"), "utf8");
  const serverSource = source.replace(/^import .*;\s*$/gm, "");
  let executable;
  try {
    const ts = require("typescript");
    executable = ts.transpileModule(serverSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND" || !stripTypeScriptTypes) throw error;
    executable = stripTypeScriptTypes(serverSource, { mode: "strip" });
  }
  executable += "\nglobalThis.api = { getArticle, saveArticle, publishArticle };";
  function harness() {
    const tables = { projects: copy(projects), units: copy(units), editorial_articles: [] };
    const state = { writes: [], failTable: null, beforeUpdate: null };
    const db = { from(table) {
      let filters = [], operation = "read", payload;
      const query = {
        select() { return query; }, eq(field, value) { filters.push((row) => row[field] === value); return query; },
        in(field, values) { filters.push((row) => values.includes(row[field])); return query; },
        insert(values) { operation = "insert"; payload = values; return query; }, update(values) { operation = "update"; payload = values; return query; },
        maybeSingle() { return execute(true); }, single() { return execute(true); }, then(resolve, reject) { return execute(false).then(resolve, reject); },
      };
      async function execute(single) {
        if (state.failTable === table) return { data: null, error: { message: "mock_source_failure" } };
        if (!tables[table]) throw Error(`Unexpected table: ${table}`);
        if (operation === "update" && state.beforeUpdate) { const callback = state.beforeUpdate; state.beforeUpdate = null; callback(tables); }
        let rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
        if (operation === "insert") { const row = { id: "article-1", revision: 1, ...copy(payload) }; tables[table].push(row); rows = [row]; }
        if (operation === "update") for (const row of rows) Object.assign(row, copy(payload));
        if (operation !== "read") state.writes.push({ table, operation, payload: copy(payload), count: rows.length });
        return { data: copy(single ? rows[0] ?? null : rows), error: null };
      }
      return query;
    } };
    const context = { createClient: () => db, assessArticleReview, Deno: { env: { get: () => "offline-fixture" }, serve() {} }, crypto: webcrypto, TextEncoder, Response, console, setTimeout,
      fetch: () => { throw Error("Network is forbidden in offline tests"); } };
    vm.runInNewContext(executable, context, { filename: "tycoons-admin-offline.js" });
    return { api: context.api, state, tables };
  }
  async function saved(values = {}) { const h = harness(); const result = await h.api.saveArticle(owner, { values: { ...base, ...values } }); h.article = result.article; h.publish = (extra = {}) => ({ id: h.article.id, expected_revision: h.article.revision, expected_content_hash: h.article.content_hash, review_confirmed: true, ...extra }); return h; }
  const codeIs = (code) => (error) => error.code === code;
  let h = await saved({ review_issues: [], review_confirmed: true });
  check(h.article.review_issues.some((issue) => issue.severity === "review"), "save returns derived review issues");
  check(!("review_issues" in h.tables.editorial_articles[0]) && !("review_confirmed" in h.tables.editorial_articles[0]), "review flags are never persisted");
  for (const review_confirmed of [undefined, false, "true", 1]) await assert.rejects(h.api.publishArticle(owner, h.publish({ review_confirmed })), codeIs("article_review_confirmation_required"));
  checks += 4;
  check(h.tables.editorial_articles[0].status === "draft", "missing confirmation cannot change status");
  await assert.rejects(h.api.publishArticle({ ...owner, role: "editor" }, h.publish()), codeIs("owner_only")); checks += 1;
  await assert.rejects(h.api.publishArticle(owner, h.publish({ expected_revision: 999 })), codeIs("article_stale")); checks += 1;
  await assert.rejects(h.api.publishArticle(owner, h.publish({ expected_content_hash: "a".repeat(64) })), codeIs("article_stale")); checks += 1;
  const published = await h.api.publishArticle(owner, h.publish());
  check(published.article.status === "published" && published.article.reviewed_by === owner.id, "reviewed owner can publish exact saved version");
  h = await saved({ body_markdown: "5A {{min_area}} costs 9 EGP", review_issues: [] });
  check(blocker(h.article.review_issues, "unresolved_placeholder"), "invalid draft is still editable and saved with blockers");
  await assert.rejects(h.api.publishArticle(owner, h.publish({ review_issues: [], review_confirmed: true })), (error) => error.code === "article_review_blocked" && blocker(error.details.review_issues)); checks += 1;
  check(h.tables.editorial_articles[0].status === "draft", "forged client flags cannot publish blockers");
  for (const numericClaim of ["5A costs 123 EGP", "5A costs １２３ EGP"]) {
    h = await saved({ body_markdown: numericClaim });
    await assert.rejects(h.api.publishArticle(owner, h.publish()), (error) => error.code === "article_review_blocked" && blocker(error.details.review_issues, "unsupported_numeric_claim")); checks += 1;
    check(h.tables.editorial_articles[0].status === "draft", "alternate numeral glyphs cannot publish");
  }
  h = await saved({ body_markdown: `5A\n${price}` });
  check(!blocker(h.article.review_issues), "canonical current draft initially publishable after review");
  h.tables.units[0].starting_price = 99;
  const loaded = await h.api.getArticle({ id: h.article.id });
  check(blocker(loaded.article.review_issues, "invalid_typed_fact"), "get recomputes against changed live facts");
  await assert.rejects(h.api.publishArticle(owner, h.publish()), codeIs("article_review_blocked")); checks += 1;
  h = await saved();
  const edited = await h.api.saveArticle(owner, { id: h.article.id, expected_revision: h.article.revision, values: { ...base, excerpt: "Updated introduction to 5A." } });
  check(edited.article.revision === 2 && edited.article.content_hash !== h.article.content_hash, "save changes revision/hash and invalidates acknowledgement");
  await assert.rejects(h.api.publishArticle(owner, h.publish()), codeIs("article_stale")); checks += 1;
  h = await saved(); h.state.beforeUpdate = (tables) => { tables.editorial_articles[0].revision += 1; };
  await assert.rejects(h.api.publishArticle(owner, h.publish()), codeIs("article_stale")); checks += 1;
  check(h.tables.editorial_articles[0].status === "draft", "publish CAS rejects concurrent edit after review");
  h = await saved(); h.state.failTable = "projects";
  await assert.rejects(h.api.publishArticle(owner, h.publish()), /mock_source_failure/); checks += 1;
  check(h.tables.editorial_articles[0].status === "draft", "source load failure fails closed");
  // One uninterrupted editing lifecycle: invalid text is retained for repair,
  // reloaded, corrected, saved to a new revision, reloaded and then published.
  h = await saved({ body_markdown: "5A costs {{price}} and has 999 m²." });
  const invalidReload = await h.api.getArticle({ id: h.article.id });
  check(invalidReload.article.body_markdown.includes("{{price}}") && blocker(invalidReload.article.review_issues), "reload preserves invalid draft and its blockers");
  const corrected = await h.api.saveArticle(owner, { id: h.article.id, expected_revision: invalidReload.article.revision, values: { ...invalidReload.article, body_markdown: `5A\n${sample}\n${price}`, review_issues: [] } });
  check(corrected.article.status === "draft" && corrected.article.revision === invalidReload.article.revision + 1, "corrected draft saves a new revision");
  const correctedReload = await h.api.getArticle({ id: h.article.id });
  check(!blocker(correctedReload.article.review_issues), "corrected current evidence clears blockers after reload");
  await assert.rejects(h.api.publishArticle(owner, h.publish()), codeIs("article_stale")); checks += 1;
  const finalPublication = await h.api.publishArticle(owner, { id: correctedReload.article.id, expected_revision: correctedReload.article.revision, expected_content_hash: correctedReload.article.content_hash, review_confirmed: true });
  check(finalPublication.article.status === "published", "corrected reloaded revision publishes after explicit review");
  console.log(`Article review server tests passed (${checks} assertions; mocked DB only, no network).`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
