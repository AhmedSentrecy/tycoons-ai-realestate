import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi, type AdminArticle, type AdminProject, type ArticleValues, type TopicIdea } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, EmptyState, Modal, inputClass } from "./ui";
import EditorialWorkflowPanel from "./EditorialWorkflowPanel";

const emptyArticle = (): ArticleValues => ({
  language: "ar", title: "", slug: "", excerpt: "", body_markdown: "", meta_title: "", meta_description: "",
  target_type: "project", project_id: null, area_name: null, source_refs: [],
});

const articleFingerprint = (article: ArticleValues) => JSON.stringify({
  language: article.language, title: article.title, slug: article.slug, excerpt: article.excerpt,
  body_markdown: article.body_markdown, meta_title: article.meta_title, meta_description: article.meta_description,
  target_type: article.target_type, project_id: article.project_id, area_name: article.area_name, source_refs: article.source_refs,
});

function Preview({ article }: { article: ArticleValues }) {
  return <div dir={article.language === "ar" ? "rtl" : "ltr"} className="prose max-w-none">
    <h1 className="text-3xl font-black">{article.title || "عنوان المقال"}</h1>
    <p className="mt-2 text-lg text-[#5c6a62]">{article.excerpt}</p>
    <div className="mt-6 space-y-3">
      {article.body_markdown.split(/\n+/).filter(Boolean).map((line, index) => {
        if (line.startsWith("## ")) return <h2 key={index} className="pt-3 text-2xl font-black">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={index} className="pt-2 text-xl font-black">{line.slice(4)}</h3>;
        if (/^[-*]\s/.test(line)) return <p key={index} className="ms-5">• {line.replace(/^[-*]\s+/, "")}</p>;
        return <p key={index} className="leading-8">{line}</p>;
      })}
    </div>
    {article.source_refs.length > 0 && <div className="mt-8 rounded-2xl bg-[#f7f2ea] p-4"><strong>المصادر العامة المستخدمة</strong><ul>{article.source_refs.map((source) => <li key={source.id}>{source.label} — {source.url}</li>)}</ul></div>}
  </div>;
}

export default function ArticlesTab({ projects }: { projects: AdminProject[] }) {
  const { token, isOwner, handleError, notify } = useAdmin();
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedArticle, setLoadedArticle] = useState<AdminArticle | null>(null);
  const [values, setValues] = useState<ArticleValues>(emptyArticle);
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [ideas, setIdeas] = useState<TopicIdea[]>([]);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"load" | "topics" | "draft" | "save" | "publish" | "">("");
  const [preview, setPreview] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const idempotency = useRef(new Map<string, string>());
  const editorContext = useRef(0);
  const operationId = useRef(0);
  const busyRef = useRef<typeof busy>("");
  const areas = useMemo(() => [...new Set(projects.map((project) => project.location?.trim()).filter(Boolean) as string[])].sort(), [projects]);
  const dirty = !loadedArticle || savedFingerprint !== articleFingerprint(values);

  function patchValues(patch: Partial<ArticleValues>, contextChanged = false) {
    if (["load", "save", "publish"].includes(busyRef.current)) return;
    if (contextChanged) {
      editorContext.current += 1;
      operationId.current += 1;
      busyRef.current = "";
      setBusy("");
      idempotency.current.clear();
      setIdeas([]);
      setTopic("");
      setSelectedId(null);
      setLoadedArticle(null);
      setSavedFingerprint("");
      setPreview(false);
    }
    setValues((current) => contextChanged
      ? { ...emptyArticle(), language: current.language, target_type: current.target_type, project_id: current.project_id, area_name: current.area_name, ...patch }
      : { ...current, ...patch });
    setReviewConfirmed(false);
  }

  function beginOperation(kind: Exclude<typeof busy, "">) {
    if (busyRef.current) return null;
    const id = ++operationId.current;
    busyRef.current = kind;
    setBusy(kind);
    return id;
  }

  function endOperation(id: number) {
    if (operationId.current !== id) return;
    busyRef.current = "";
    setBusy("");
  }

  const refresh = useCallback(async () => {
    try { setArticles((await adminApi.articles(token)).articles); } catch (error) { handleError(error); } finally { setLoading(false); }
  }, [token, handleError]);

  useEffect(() => {
    adminApi.articles(token)
      .then((data) => setArticles(data.articles))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [token, handleError]);

  async function openArticle(id: string) {
    const operation = beginOperation("load");
    if (!operation) return;
    const context = ++editorContext.current;
    try {
      const { article } = await adminApi.article(token, id);
      if (operation !== operationId.current || context !== editorContext.current) return;
      setSelectedId(id); setLoadedArticle(article); setValues(article); setSavedFingerprint(articleFingerprint(article)); setIdeas([]); setTopic(article.title); setReviewConfirmed(false);
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  function newArticle() {
    if (busyRef.current) return;
    editorContext.current += 1;
    setSelectedId(null); setLoadedArticle(null); setValues(emptyArticle()); setSavedFingerprint(""); setIdeas([]); setTopic(""); setReviewConfirmed(false);
  }

  const generationTarget = () => ({ language: values.language, target_type: values.target_type, project_id: values.target_type === "project" ? values.project_id : null, area_name: values.target_type === "area" ? values.area_name : null });
  const requestKey = (kind: string, subject: string) => {
    const signature = JSON.stringify([kind, generationTarget(), subject]);
    if (!idempotency.current.has(signature)) idempotency.current.set(signature, `${kind}:${crypto.randomUUID()}`);
    return idempotency.current.get(signature)!;
  };

  async function suggestTopics() {
    const operation = beginOperation("topics");
    if (!operation) return;
    const context = editorContext.current;
    try {
      const result = await adminApi.articleTopics(token, requestKey("topics", ""), generationTarget());
      if (operation !== operationId.current || context !== editorContext.current) return;
      setIdeas(result.topics); patchValues({ source_refs: result.source_refs });
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  async function generateDraft() {
    if (!topic.trim()) return;
    const operation = beginOperation("draft");
    if (!operation) return;
    const context = editorContext.current;
    try {
      const result = await adminApi.articleDraft(token, requestKey("draft", topic.trim()), generationTarget(), topic.trim());
      if (operation !== operationId.current || context !== editorContext.current) return;
      patchValues({ ...result, source_refs: result.source_refs });
      notify("تم إنشاء مسودة فقط. راجعها وعدّلها قبل الحفظ أو النشر.");
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  async function save() {
    const operation = beginOperation("save");
    if (!operation) return;
    try {
      const { article } = await adminApi.articleSave(token, selectedId, values, loadedArticle?.revision ?? null);
      if (operation !== operationId.current) return;
      setSelectedId(article.id); setLoadedArticle(article); setValues(article); setSavedFingerprint(articleFingerprint(article)); setReviewConfirmed(false); await refresh();
      notify("تم حفظ المسودة. لم يتم نشرها.");
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  async function publish() {
    if (!selectedId || !loadedArticle || dirty || !reviewConfirmed || !isOwner) return;
    const operation = beginOperation("publish");
    if (!operation) return;
    try {
      const { article } = await adminApi.articlePublish(token, selectedId, loadedArticle.revision, loadedArticle.content_hash);
      if (operation !== operationId.current) return;
      setLoadedArticle(article); setValues(article); setSavedFingerprint(articleFingerprint(article)); setReviewConfirmed(false); await refresh(); notify("تم نشر المقال بعد المراجعة.");
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  const canGenerate = values.target_type === "project" ? Boolean(values.project_id) : Boolean(values.area_name);
  return <><EditorialWorkflowPanel projects={projects} /><div className="grid gap-4 lg:grid-cols-[300px_1fr]">
    <aside className="rounded-3xl bg-white p-4 shadow-sm">
      <button disabled={Boolean(busy)} onClick={newArticle} className="w-full rounded-xl bg-[#0d1f18] px-4 py-3 font-black text-white disabled:opacity-50">مقال جديد</button>
      <div className="mt-3 space-y-2">
        {loading ? <p>جارٍ التحميل…</p> : articles.length === 0 ? <EmptyState title="لا توجد مقالات بعد" /> : articles.map((article) =>
          <button disabled={Boolean(busy)} key={article.id} onClick={() => void openArticle(article.id)} className={`w-full rounded-xl border p-3 text-start disabled:opacity-50 ${selectedId === article.id ? "border-[#a3854e] bg-[#fbf8f2]" : "border-[#eee7da]"}`}>
            <span className="block font-black">{article.title}</span><span className="mt-1 flex gap-2"><Badge tone={article.status === "published" ? "ok" : "pending"}>{article.status === "published" ? "منشور" : "مسودة"}</Badge><small>{article.updated_at.slice(0, 10)}</small></span>
          </button>)}
      </div>
    </aside>
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold">اللغة<select disabled={Boolean(busy)} className={inputClass} value={values.language} onChange={(event) => patchValues({ language: event.target.value as "ar" | "en" }, true)}><option value="ar">العربية</option><option value="en">English</option></select></label>
        <label className="text-sm font-bold">النطاق<select disabled={Boolean(busy)} className={inputClass} value={values.target_type} onChange={(event) => patchValues({ target_type: event.target.value as "project" | "area", project_id: null, area_name: null }, true)}><option value="project">مشروع</option><option value="area">منطقة</option></select></label>
        {values.target_type === "project" ? <label className="text-sm font-bold">المشروع<select disabled={Boolean(busy)} className={inputClass} value={values.project_id || ""} onChange={(event) => patchValues({ project_id: event.target.value || null }, true)}><option value="">اختر مشروعاً</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : <label className="text-sm font-bold">المنطقة<select disabled={Boolean(busy)} className={inputClass} value={values.area_name || ""} onChange={(event) => patchValues({ area_name: event.target.value || null }, true)}><option value="">اختر منطقة</option>{areas.map((area) => <option key={area}>{area}</option>)}</select></label>}
      </div>
      <div className="mt-4 rounded-2xl border border-[#e7ddc8] bg-[#fbf8f2] p-4">
        <div className="flex flex-wrap gap-2"><button disabled={!canGenerate || Boolean(busy)} onClick={() => void suggestTopics()} className="rounded-xl bg-[#d9b87c] px-4 py-2 font-black disabled:opacity-50">{busy === "topics" ? "جارٍ الاقتراح…" : "اقترح موضوعات"}</button></div>
        {ideas.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{ideas.map((idea) => <button disabled={Boolean(busy)} key={idea.title} onClick={() => setTopic(idea.title)} className="rounded-xl border bg-white p-3 text-start disabled:opacity-50"><strong>{idea.title}</strong><span className="mt-1 block text-xs text-[#5c6a62]">{idea.rationale}</span></button>)}</div>}
        <div className="mt-3 flex gap-2"><input disabled={Boolean(busy)} className={inputClass} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="موضوع المقال" /><button disabled={!canGenerate || !topic.trim() || Boolean(busy)} onClick={() => void generateDraft()} className="shrink-0 rounded-xl bg-[#0d1f18] px-4 py-2 font-black text-white disabled:opacity-50">{busy === "draft" ? "جارٍ إنشاء المسودة…" : "أنشئ مسودة"}</button></div>
        <p className="mt-2 text-xs text-[#5c6a62]">لا توجد بيانات حجم بحث أو GSC هنا. الاقتراحات نوعية ومبنية فقط على معلومات المشاريع العامة.</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {([['title','العنوان'],['slug','الرابط'],['meta_title','عنوان SEO'],['meta_description','وصف SEO'],['excerpt','المقدمة']] as const).map(([field,label]) => <label key={field} className={`text-sm font-bold ${field === 'excerpt' ? 'md:col-span-2' : ''}`}>{label}<input disabled={Boolean(busy)} dir={field === 'slug' ? 'ltr' : undefined} className={inputClass} value={values[field]} onChange={(event) => patchValues({ [field]: event.target.value })} /></label>)}
        <label className="text-sm font-bold md:col-span-2">نص المقال (Markdown آمن)<textarea disabled={Boolean(busy)} className={`${inputClass} min-h-80 font-sans`} value={values.body_markdown} onChange={(event) => patchValues({ body_markdown: event.target.value })} /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button disabled={!values.title || !values.body_markdown || !values.source_refs.length || Boolean(busy)} onClick={() => void save()} className="rounded-xl bg-[#0d1f18] px-5 py-2 font-black text-white disabled:opacity-50">{busy === "save" ? "جارٍ الحفظ…" : "حفظ كمسودة"}</button>
        <button disabled={!values.body_markdown} onClick={() => setPreview(true)} className="rounded-xl border px-5 py-2 font-black">معاينة</button>
        {isOwner && loadedArticle?.status !== "published" && <Fragment><label className="flex items-center gap-2 text-sm font-bold"><input disabled={dirty || Boolean(busy)} type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} />راجعت النسخة المحفوظة والمصادر</label><button disabled={!selectedId || dirty || !reviewConfirmed || Boolean(busy)} onClick={() => void publish()} className="rounded-xl bg-emerald-700 px-5 py-2 font-black text-white disabled:opacity-50">{busy === "publish" ? "جارٍ النشر…" : "نشر النسخة المحفوظة"}</button></Fragment>}
      </div>
    </section>
    {preview && <Modal title="معاينة المقال — غير منشور" wide onClose={() => setPreview(false)}><Preview article={values} /><button onClick={() => setPreview(false)} className="mt-5 rounded-xl bg-[#0d1f18] px-5 py-2 font-black text-white">العودة للتحرير</button></Modal>}
  </div></>;
}
