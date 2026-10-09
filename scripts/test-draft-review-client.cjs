"use strict";

// Offline source-level regression harness. Executes the real API and editor
// handlers, with local fetch/hook stubs. This is not React DOM/browser coverage.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/components/admin/ArticlesTab.tsx"), "utf8");
const apiSource = fs.readFileSync(path.join(root, "src/lib/adminApi.ts"), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));
let typescript;
try { typescript = require("typescript"); } catch (error) { if (error.code !== "MODULE_NOT_FOUND") throw error; }
function javascript(code) {
  // Node 20 CI uses the project's existing TypeScript dev dependency.
  // Node 22.13+/24 can run this harness without installing dependencies.
  if (typescript) return typescript.transpileModule(code, { compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS } }).outputText;
  if (typeof stripTypeScriptTypes === "function") return stripTypeScriptTypes(code);
  throw new Error("Run with the project's installed TypeScript dependency (Node 20 supported), or Node 22.13+/24 for dependency-free execution.");
}
function loadApi(fetch) {
  const code = apiSource.replace(/^const viteEnv = .*;$/m, "const viteEnv = {};").replace(/^export /gm, "");
  return vm.runInNewContext(`${javascript(code)}\n({ adminApi, AdminApiError, errorMessage });`, { fetch }, { filename: "adminApi.offline.js" });
}
const { AdminApiError } = loadApi(() => { throw new Error("Unexpected test fetch"); });

const bodyStart = source.indexOf("export default function ArticlesTab(");
const renderStart = source.indexOf("  return <><EditorialWorkflowPanel");
assert.ok(bodyStart > 0 && renderStart > bodyStart, "editor source markers must exist");
const editorCode = javascript(
  source.slice(0, source.indexOf("function Preview(")).replace(/^import .*\n/gm, "") +
  source.slice(bodyStart, renderStart).replace("export default ", "") +
  "return { values, loadedArticle, selectedId, dirty, reviewIssues, hasPublishBlockers, reviewConfirmed, busy, patchValues, removeSource, openArticle, generateDraft, save, publish, newArticle, setReviewConfirmed, setTopic };\n}\n",
);
const checkboxGate = source.match(/<input disabled=\{([^}]+)\} type="checkbox" checked=\{reviewConfirmed\}/)?.[1];
const publishGate = source.match(/<button disabled=\{([^}]+)\} onClick=\{\(\) => void publish\(\)\}/)?.[1];
const saveGate = source.match(/<button disabled=\{([^}]+)\} onClick=\{\(\) => void save\(\)\}/)?.[1];
assert.ok(checkboxGate && publishGate && saveGate, "actual JSX gates must be found");
const disabled = (gate, state) => vm.runInNewContext(gate, state);

const issue = (severity = "review", field = "body_markdown") => ({ code: `test_${severity}`, field, severity, message: "راجع هذه المعلومة ومصدرها" });
const article = (changes = {}) => ({
  id: "article-1", language: "ar", title: "عنوان محفوظ", slug: "saved-draft", excerpt: "مقدمة",
  body_markdown: "مسودة كاملة للمراجعة", meta_title: "عنوان", meta_description: "وصف",
  target_type: "project", project_id: "project-1", area_name: null,
  source_refs: [{ type: "project", id: "project-1", label: "المشروع", url: "/projects/project-1" }],
  status: "draft", revision: 4, content_hash: "saved-content-hash", review_issues: [], ...changes,
});
function harness({ loaded = article(), generated = article(), saved, owner = true, saveError, publishError } = {}) {
  const states = [], refs = [], calls = [], errors = [];
  let stateIndex = 0, refIndex = 0;
  const api = {
    articles: async () => ({ articles: [] }),
    article: async () => ({ article: loaded }),
    articleDraft: async (...args) => { calls.push(["draft", ...args]); return generated; },
    articleSave: async (...args) => {
      calls.push(["save", ...args]);
      if (saveError) throw saveError;
      return { article: saved || article({ ...args[2], revision: 5, content_hash: "updated-content-hash", review_issues: [] }) };
    },
    articlePublish: async (...args) => { calls.push(["publish", ...args]); if (publishError) throw publishError; return { article: article({ ...loaded, status: "published" }) }; },
  };
  const create = vm.runInNewContext(`${editorCode}\nArticlesTab;`, {
    adminApi: api,
    AdminApiError,
    useState: (initial) => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useRef: (initial) => { const index = refIndex++; return refs[index] || (refs[index] = { current: initial }); },
    useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: () => {},
    useAdmin: () => ({ token: "offline-token", isOwner: owner, handleError: (error) => errors.push(error), notify: () => {} }),
    crypto: { randomUUID: () => "offline-idempotency-key" },
  }, { filename: "ArticlesTab.offline.js" });
  return { calls, errors, render() { stateIndex = 0; refIndex = 0; return create({ projects: [] }); } };
}

(async () => {
  const requests = [];
  const responseArticle = article({ review_issues: [issue(), issue("blocker", "meta_title")] });
  const { adminApi: api } = loadApi(async (url, options) => {
    requests.push({ url, payload: JSON.parse(options.body), headers: options.headers });
    return { ok: true, json: async () => ({ article: responseArticle, ...responseArticle, generated_as: "draft" }) };
  });
  await api.articlePublish("offline-token", "article-1", 4, "saved-content-hash");
  assert.deepEqual(requests[0].payload, { action: "article_publish", id: "article-1", expected_revision: 4, expected_content_hash: "saved-content-hash", review_confirmed: true });
  assert.equal(requests[0].headers["x-admin-token"], "offline-token");
  const generated = await api.articleDraft("offline-token", "offline-key", { language: "ar", target_type: "project", project_id: "project-1", area_name: null }, "موضوع");
  assert.deepEqual(plain(generated.review_issues), responseArticle.review_issues, "all generated issues survive the API response");
  assert.deepEqual(plain((await api.articleSave("offline-token", "article-1", responseArticle, 4)).article.review_issues), responseArticle.review_issues);
  assert.deepEqual(plain((await api.article("offline-token", "article-1")).article.review_issues), responseArticle.review_issues);
  const blockedApi = loadApi(async () => ({ ok: false, status: 409, json: async () => ({
    error: "article_review_blocked", review_issues: [
      { ...issue("blocker"), internal_detail: "not-for-the-editor" },
      null, "invalid", { code: "invalid", field: "title", severity: "unknown", message: "invalid" },
    ],
  }) }));
  await assert.rejects(blockedApi.adminApi.articlePublish("offline-token", "article-1", 4, "saved-content-hash"), (error) => {
    assert.deepEqual(plain(error.reviewIssues), [issue("blocker")], "error parser keeps only the public issue contract");
    assert.match(blockedApi.errorMessage(error), /تمنع النشر/);
    return true;
  });

  const flagged = harness({ generated: responseArticle });
  let state = flagged.render();
  state.setTopic("موضوع"); state = flagged.render(); await state.generateDraft(); state = flagged.render();
  assert.equal(state.values.body_markdown, responseArticle.body_markdown, "flagged generation keeps the complete draft editable");
  assert.deepEqual(plain(state.reviewIssues), responseArticle.review_issues);
  assert.equal(state.dirty, true);
  assert.equal(disabled(checkboxGate, state), true);
  assert.equal(disabled(publishGate, state), true);
  assert.equal(disabled(saveGate, state), false, "blockers must not disable saving an otherwise valid draft");
  state.setReviewConfirmed(true); state = flagged.render(); await state.publish();
  assert.equal(flagged.calls.filter(([name]) => name === "publish").length, 0);

  const flow = harness({ loaded: article({ review_issues: [issue()] }) });
  state = flow.render(); await state.openArticle("article-1"); state = flow.render();
  assert.equal(state.dirty, false);
  assert.equal(state.hasPublishBlockers, false);
  assert.equal(disabled(checkboxGate, state), false, "advisory issues can be reviewed");
  assert.equal(disabled(publishGate, state), true, "a saved draft still requires explicit confirmation");
  await state.publish(); assert.equal(flow.calls.length, 0);
  state.setReviewConfirmed(true); state = flow.render();
  assert.equal(disabled(publishGate, state), false);
  state.patchValues({ body_markdown: "تعديل جديد يحتاج إعادة المراجعة" }); state = flow.render();
  assert.equal(state.dirty, true);
  assert.equal(state.reviewConfirmed, false);
  assert.equal(state.reviewIssues.length, 1, "stale issues remain visible until save refreshes them");
  assert.equal(disabled(checkboxGate, state), true);
  state.setReviewConfirmed(true); state = flow.render(); await state.publish();
  assert.equal(flow.calls.length, 0, "dirty handler refuses publication even with a forged local checkbox");
  await state.save(); state = flow.render();
  assert.equal(state.dirty, false);
  assert.equal(state.reviewConfirmed, false);
  assert.equal(state.reviewIssues.length, 0, "saving replaces stale issues with the server's recomputed list");
  assert.equal(disabled(publishGate, state), true);
  state.setReviewConfirmed(true); state = flow.render();
  await Promise.all([state.publish(), state.publish()]); state = flow.render();
  assert.equal(flow.calls.filter(([name]) => name === "publish").length, 1, "repeated publish clicks are serialized");
  assert.deepEqual(plain(flow.calls.find(([name]) => name === "publish").slice(1)), ["offline-token", "article-1", 5, "updated-content-hash"]);
  assert.equal(state.reviewConfirmed, false);

  for (const owner of [true, false]) {
    const blocked = harness({ owner, loaded: article({ review_issues: [issue("blocker")] }) });
    state = blocked.render(); await state.openArticle("article-1"); state = blocked.render();
    assert.equal(state.hasPublishBlockers, true);
    assert.equal(disabled(checkboxGate, state), true);
    state.setReviewConfirmed(true); state = blocked.render();
    assert.equal(disabled(publishGate, state), true);
    await state.publish(); assert.equal(blocked.calls.length, 0, "blockers cannot be acknowledged away");
  }
  const editor = harness({ owner: false });
  state = editor.render(); await state.openArticle("article-1"); state = editor.render();
  state.setReviewConfirmed(true); state = editor.render(); await state.publish();
  assert.equal(editor.calls.length, 0, "non-owners cannot invoke publishing");

  const changedSource = harness({ publishError: new AdminApiError("article_review_blocked", 409, null, null, [issue("blocker", "source_refs")]) });
  state = changedSource.render(); await state.openArticle("article-1"); state = changedSource.render();
  state.setReviewConfirmed(true); state = changedSource.render(); await state.publish(); state = changedSource.render();
  assert.deepEqual(plain(state.reviewIssues), [issue("blocker", "source_refs")], "publication rejection refreshes the panel from authoritative server issues");
  assert.equal(state.reviewConfirmed, false);
  assert.equal(state.hasPublishBlockers, true);
  assert.equal(state.values.body_markdown, article().body_markdown, "a server blocker never discards the saved draft");
  assert.equal(state.dirty, false, "server issue metadata must not dirty unchanged content");
  assert.equal(disabled(publishGate, state), true);
  assert.equal(changedSource.errors.length, 1);

  const staleSource = { type: "unit", id: "unused-deleted-unit", label: "مصدر غير مستخدم", url: "/units/unused-deleted-unit" };
  const sourceCorrection = harness({ loaded: article({ source_refs: [...article().source_refs, staleSource], review_issues: [issue("blocker", "source_refs")] }) });
  state = sourceCorrection.render(); await state.openArticle("article-1"); state = sourceCorrection.render();
  state.setReviewConfirmed(true); state = sourceCorrection.render();
  state.removeSource(1); state = sourceCorrection.render();
  assert.deepEqual(plain(state.values.source_refs), article().source_refs, "the actual removal handler removes only the selected source");
  assert.equal(state.values.body_markdown, article().body_markdown, "source removal preserves editable prose for factual corrections");
  assert.equal(state.dirty, true);
  assert.equal(state.reviewConfirmed, false, "source removal invalidates prior review");
  assert.equal(state.hasPublishBlockers, true, "stale issues remain until the server reassesses on save");
  assert.equal(disabled(checkboxGate, state), true);
  assert.equal(disabled(saveGate, state), false, "an unused stale source can be removed and saved without regeneration");
  const saving = state.save();
  state.removeSource(0);
  assert.equal(sourceCorrection.render().values.source_refs.length, 1, "busy source removal is ignored");
  await saving; state = sourceCorrection.render();
  assert.equal(state.dirty, false);
  assert.equal(state.hasPublishBlockers, false);
  assert.equal(state.reviewConfirmed, false, "the reassessed draft still needs fresh explicit confirmation");
  assert.deepEqual(plain(sourceCorrection.calls.find(([name]) => name === "save")[3].source_refs), article().source_refs);
  assert.equal(sourceCorrection.calls.some(([name]) => name === "draft"), false, "correction does not call generation");

  const failed = harness({ saveError: new Error("offline-save-failed") });
  state = failed.render(); await state.openArticle("article-1"); state = failed.render();
  state.patchValues({ title: "تعديل محفوظ في المحرر" }); state = failed.render(); await state.save(); state = failed.render();
  assert.equal(state.values.title, "تعديل محفوظ في المحرر");
  assert.equal(state.dirty, true); assert.equal(state.reviewConfirmed, false); assert.equal(failed.errors.length, 1);

  assert.match(source, /reviewIssues\.map\(/, "all field-specific issues are displayed");
  assert.match(source, /REVIEW_FIELD_LABELS\[issue\.field\] \|\| issue\.field/, "unknown fields are not silently dropped");
  assert.match(source, /\{issue\.message\}/, "messages are rendered as escaped React text");
  assert.match(source, /احفظ التعديلات لتحديثها قبل تأكيد المراجعة والنشر/);
  assert.match(source, /راجعت حقائق النسخة المحفوظة ومصادرها وجميع ملاحظات المراجعة/);
  assert.match(source, /الفحص الآلي لا يثبت صحة المعلومات/);
  assert.match(source, /يمكنك متابعة التحرير وحفظها كمسودة/);
  assert.match(source, /<button disabled=\{Boolean\(busy\)\} onClick=\{\(\) => removeSource\(index\)\}/);
  assert.match(source, /عند إزالة مصدر، عدّل أو احذف الحقائق المرتبطة به من جميع حقول المقال/);
  for (const field of ["title", "slug", "excerpt", "body_markdown", "meta_title", "meta_description", "source_refs"]) {
    assert.match(source, new RegExp(`${field}: "[^"\\n]*[\\u0600-\\u06ff]`), `${field} has an Arabic label`);
  }
  console.log("Draft review client tests passed: mocked request payloads, actual editor handlers, and JSX gating contracts (no browser, provider, database, or network calls).");
})().catch((error) => { console.error(error); process.exitCode = 1; });
