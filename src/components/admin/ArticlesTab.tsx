import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { adminApi, AdminApiError, type AdminArticle, type AdminProject, type ArticleFaqItem, type ArticleValues, type TopicIdea } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, EmptyState, Modal, inputClass } from "./ui";
import EditorialWorkflowPanel from "./EditorialWorkflowPanel";

const emptyArticle = (): ArticleValues => ({
  language: "ar", title: "", slug: "", excerpt: "", body_markdown: "", meta_title: "", meta_description: "",
  target_type: "project", project_id: null, area_name: null, source_refs: [],
  focus_keyword: "", key_takeaways: [], faq: [], hero_image_url: null,
});

// Older rows (or rows saved before the SEO migration) may lack the SEO fields.
const withSeoDefaults = <T extends ArticleValues>(article: T): T => ({
  ...article,
  focus_keyword: article.focus_keyword ?? "",
  key_takeaways: Array.isArray(article.key_takeaways) ? article.key_takeaways : [],
  faq: Array.isArray(article.faq) ? article.faq : [],
  hero_image_url: article.hero_image_url ?? null,
});

const articleFingerprint = (article: ArticleValues) => JSON.stringify({
  language: article.language, title: article.title, slug: article.slug, excerpt: article.excerpt,
  body_markdown: article.body_markdown, meta_title: article.meta_title, meta_description: article.meta_description,
  target_type: article.target_type, project_id: article.project_id, area_name: article.area_name, source_refs: article.source_refs,
  focus_keyword: article.focus_keyword ?? "", key_takeaways: article.key_takeaways ?? [], faq: article.faq ?? [], hero_image_url: article.hero_image_url ?? null,
});

const REVIEW_FIELD_LABELS: Record<string, string> = {
  title: "العنوان", slug: "الرابط", excerpt: "المقدمة", body_markdown: "نص المقال",
  meta_title: "عنوان SEO", meta_description: "وصف SEO", source_refs: "المصادر",
  claim_evidence: "أدلة الحقائق", unit_evidence: "أدلة الوحدات", comparison_project_ids: "مشاريع المقارنة",
  language: "اللغة", target_type: "النطاق", project_id: "المشروع", area_name: "المنطقة",
  focus_keyword: "الكلمة المفتاحية", key_takeaways: "الخلاصة", faq: "الأسئلة الشائعة", hero_image_url: "الصورة الرئيسية",
};

// ---------- SEO / GEO score (pure; runs on every keystroke, no network) ----------

type SeoCheck = { id: string; label: string; hint: string; weight: number; earned: number };

const normalizeSearchText = (value: string) => String(value || "")
  .normalize("NFKC").toLocaleLowerCase()
  .replace(/[ً-ْـ]/g, "")
  .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/\s+/g, " ").trim();

const containsKeyword = (haystack: string, keyword: string) => {
  const needle = normalizeSearchText(keyword);
  return Boolean(needle) && normalizeSearchText(haystack).includes(needle);
};

const countWords = (value: string) => String(value || "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").split(/\s+/).filter((word) => /\p{L}/u.test(word)).length;

function seoChecks(values: ArticleValues): SeoCheck[] {
  const keyword = (values.focus_keyword || "").trim();
  const body = values.body_markdown || "";
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstParagraph = lines.find((line) => !/^#{1,6}\s|^[-*]\s/.test(line)) || "";
  const h2s = lines.filter((line) => /^##\s/.test(line));
  const takeaways = (values.key_takeaways || []).filter((item) => item.trim());
  const faq = (values.faq || []).filter((item) => item.question.trim() && item.answer.trim());
  const internalLinks = new Set([...body.matchAll(/\]\((\/(?:projects|units|guides|ar\/areas|en\/areas|ar\/developers|en\/developers)\/[^)\s]+)\)/g)].map((match) => match[1])).size;
  const words = countWords(body) + takeaways.reduce((sum, item) => sum + countWords(item), 0) + faq.reduce((sum, item) => sum + countWords(`${item.question} ${item.answer}`), 0);
  const metaTitle = (values.meta_title || values.title || "").trim();
  const metaDescription = (values.meta_description || values.excerpt || "").trim();
  const slugWords = (values.slug || "").split("-").filter(Boolean).length;
  const check = (id: string, label: string, hint: string, weight: number, ratio: number): SeoCheck => ({ id, label, hint, weight, earned: Math.round(weight * Math.max(0, Math.min(1, ratio))) });
  return [
    check("keyword", "كلمة مفتاحية محددة", "اكتب العبارة اللي العميل بيكتبها في جوجل (2-6 كلمات).", 10, keyword ? 1 : 0),
    check("keyword_title", "الكلمة في العنوان", "حط الكلمة المفتاحية في أول العنوان.", 10, containsKeyword(values.title, keyword) ? 1 : 0),
    check("keyword_meta_title", "الكلمة في عنوان SEO", "عنوان SEO هو اللي بيظهر في نتايج جوجل.", 5, containsKeyword(metaTitle, keyword) ? 1 : 0),
    check("meta_title_length", `طول عنوان SEO (${metaTitle.length} حرف)`, "الأفضل من 35 لـ 60 حرف عشان ميتقصّش.", 8, metaTitle.length >= 35 && metaTitle.length <= 60 ? 1 : metaTitle.length >= 20 && metaTitle.length <= 70 ? 0.5 : 0),
    check("meta_description_length", `طول وصف SEO (${metaDescription.length} حرف)`, "الأفضل من 120 لـ 160 حرف: إجابة مباشرة + سبب للضغط.", 8, metaDescription.length >= 120 && metaDescription.length <= 160 ? 1 : metaDescription.length >= 80 && metaDescription.length <= 200 ? 0.5 : 0),
    check("keyword_meta_description", "الكلمة في وصف SEO", "جوجل بيعمل bold للكلمة في الوصف.", 4, containsKeyword(metaDescription, keyword) ? 1 : 0),
    check("keyword_intro", "الكلمة في أول فقرة", "أول فقرة لازم تجاوب على السؤال مباشرة وفيها الكلمة.", 8, containsKeyword(firstParagraph, keyword) ? 1 : 0),
    check("keyword_heading", "الكلمة في عنوان فرعي (##)", "حط الكلمة أو صيغة قريبة منها في عنوان فرعي واحد على الأقل.", 5, h2s.some((line) => containsKeyword(line, keyword)) ? 1 : 0),
    check("length", `طول المقال (${words} كلمة)`, "الأفضل 900 كلمة أو أكتر من محتوى مفيد.", 12, words >= 900 ? 1 : words >= 600 ? 0.6 : words >= 300 ? 0.3 : 0),
    check("structure", `عناوين فرعية (${h2s.length})`, "قسّم المقال لـ 4 أقسام على الأقل بعناوين ##، ويفضل بعضها يكون سؤال.", 5, h2s.length >= 4 ? 1 : h2s.length >= 2 ? 0.5 : 0),
    check("internal_links", `لينكات داخلية (${internalLinks})`, "اربط بصفحة المشروع أو المنطقة أو الوحدات (لينكين على الأقل).", 7, internalLinks >= 2 ? 1 : internalLinks === 1 ? 0.5 : 0),
    check("slug", "رابط قصير وواضح", "كلمات إنجليزي صغيرة بينها - (من 3 لـ 8 كلمات).", 4, /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug || "") && slugWords >= 3 && slugWords <= 8 && (values.slug || "").length <= 75 ? 1 : 0),
    check("takeaways", `الخلاصة (${takeaways.length} نقاط)`, "3-5 جمل قصيرة بتجاوب مباشرة — دي اللي الـ AI بيقتبسها.", 7, takeaways.length >= 3 ? 1 : takeaways.length > 0 ? 0.5 : 0),
    check("faq", `أسئلة شائعة (${faq.length})`, "3 أسئلة على الأقل بإجابات قصيرة — بتظهر في جوجل وفي إجابات الـ AI.", 7, faq.length >= 3 ? 1 : faq.length > 0 ? 0.5 : 0),
  ];
}

const seoScore = (checks: SeoCheck[]) => checks.reduce((sum, item) => sum + item.earned, 0);

// ---------- rendering helpers (JSX stays below Preview) ----------

function Preview({ article }: { article: ArticleValues }) {
  const takeaways = (article.key_takeaways ?? []).filter((item) => item.trim());
  const faq = (article.faq ?? []).filter((item) => item.question.trim() && item.answer.trim());
  return <div dir={article.language === "ar" ? "rtl" : "ltr"} className="prose max-w-none">
    <h1 className="text-3xl font-black">{article.title || "عنوان المقال"}</h1>
    <p className="mt-2 text-lg text-[#5c6a62]">{article.excerpt}</p>
    {article.hero_image_url && <img src={article.hero_image_url} alt={article.title} className="mt-3 w-full rounded-2xl" />}
    {takeaways.length > 0 && <div className="mt-5 rounded-2xl border border-[#e7ddc8] bg-[#fffaf1] p-4"><h2 className="text-xl font-black">{article.language === "ar" ? "الخلاصة" : "Key takeaways"}</h2><ul className="mt-2 list-disc ps-5">{takeaways.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    <div className="mt-6 space-y-3">
      {article.body_markdown.split(/\n+/).filter(Boolean).map((line, index) => {
        if (line.startsWith("## ")) return <h2 key={index} className="pt-3 text-2xl font-black"><InlineText text={line.slice(3)} /></h2>;
        if (line.startsWith("### ")) return <h3 key={index} className="pt-2 text-xl font-black"><InlineText text={line.slice(4)} /></h3>;
        if (/^[-*]\s/.test(line)) return <p key={index} className="ms-5">• <InlineText text={line.replace(/^[-*]\s+/, "")} /></p>;
        return <p key={index} className="leading-8"><InlineText text={line} /></p>;
      })}
    </div>
    {faq.length > 0 && <div className="mt-8"><h2 className="text-2xl font-black">{article.language === "ar" ? "أسئلة شائعة" : "Frequently asked questions"}</h2>{faq.map((item, index) => <div key={index} className="mt-3"><h3 className="font-black">{item.question}</h3><p className="leading-8">{item.answer}</p></div>)}</div>}
    {article.source_refs.length > 0 && <div className="mt-8 rounded-2xl bg-[#f7f2ea] p-4"><strong>المصادر العامة المستخدمة</strong><ul>{article.source_refs.map((source) => <li key={source.id}>{source.label} — {source.url}</li>)}</ul></div>}
  </div>;
}

function InlineText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]{1,160})\]\(([^)\s]+)\)|\*\*([^*]{1,200})\*\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push(match[1] ? <span key={index} className="font-bold text-[#a3854e] underline" title={match[2]}>{match[1]}</span> : <strong key={index}>{match[3]}</strong>);
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function SerpPreview({ article }: { article: ArticleValues }) {
  const title = (article.meta_title || article.title || "عنوان المقال").trim();
  const description = (article.meta_description || article.excerpt || "وصف المقال هيظهر هنا").trim();
  const path = article.language === "en" ? "en › guides" : "guides";
  return <div dir={article.language === "ar" ? "rtl" : "ltr"} className="rounded-2xl border bg-white p-4">
    <p className="text-xs text-[#5c6a62]">شكل المقال في نتايج جوجل (تقريبي)</p>
    <p dir="ltr" className="mt-2 truncate text-xs text-[#202124]">tycoons-inv.com › {path} › {article.slug || "slug"}</p>
    <p className="mt-1 text-lg leading-6 text-[#1a0dab]">{title.length > 60 ? `${title.slice(0, 60)}…` : title}</p>
    <p className="mt-1 text-sm leading-6 text-[#4d5156]">{description.length > 158 ? `${description.slice(0, 158)}…` : description}</p>
  </div>;
}

function SeoScorePanel({ checks }: { checks: SeoCheck[] }) {
  const score = seoScore(checks);
  const tone = score >= 80 ? "bg-emerald-700" : score >= 60 ? "bg-amber-500" : "bg-red-600";
  return <div className="rounded-2xl border border-[#e7ddc8] bg-[#fbf8f2] p-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-black">تقييم SEO / GEO</h3>
      <span className={`rounded-full px-3 py-1 text-lg font-black text-white ${tone}`}>{score}/100</span>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee7da]"><div className={`h-full ${tone}`} style={{ width: `${score}%` }} /></div>
    <ul className="mt-3 space-y-2 text-sm">
      {checks.map((item) => <li key={item.id} className="flex items-start gap-2">
        <span aria-hidden className={item.earned === item.weight ? "text-emerald-700" : item.earned > 0 ? "text-amber-600" : "text-red-600"}>{item.earned === item.weight ? "✓" : item.earned > 0 ? "◐" : "✗"}</span>
        <span><strong>{item.label}</strong> <small className="text-[#5c6a62]">({item.earned}/{item.weight})</small>{item.earned < item.weight && <span className="block text-xs text-[#5c6a62]">{item.hint}</span>}</span>
      </li>)}
    </ul>
    <p className="mt-3 text-xs text-[#5c6a62]">التقييم بيقيس شكل المقال وهيكله بس، مش صحة المعلومات. الأفضل توصل 80+ قبل النشر.</p>
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
  // null = keep the saved AR/EN pairing; "" = unlink; an id = link on next save.
  const [translationChoice, setTranslationChoice] = useState<string | null>(null);
  const idempotency = useRef(new Map<string, string>());
  const editorContext = useRef(0);
  const operationId = useRef(0);
  const busyRef = useRef<typeof busy>("");
  const areas = useMemo(() => [...new Set(projects.map((project) => project.location?.trim()).filter(Boolean) as string[])].sort(), [projects]);
  const dirty = !loadedArticle || savedFingerprint !== articleFingerprint(values);
  const reviewIssues = values.review_issues ?? [];
  const hasPublishBlockers = reviewIssues.some((issue) => issue.severity === "blocker");
  const checks = useMemo(() => seoChecks(values), [values]);
  const translationCandidates = useMemo(() => articles.filter((article) => article.id !== selectedId
    && article.language !== values.language
    && article.target_type === values.target_type
    && (values.target_type === "project" ? article.project_id === values.project_id : (article.area_name || "") === (values.area_name || ""))), [articles, selectedId, values.language, values.target_type, values.project_id, values.area_name]);
  const pairedId = useMemo(() => {
    const key = loadedArticle?.translation_key;
    return key ? articles.find((article) => article.id !== selectedId && article.translation_key === key)?.id ?? "" : "";
  }, [articles, loadedArticle, selectedId]);

  useEffect(() => {
    if (!dirty || !values.body_markdown) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, values.body_markdown]);

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
      setTranslationChoice(null);
    }
    setValues((current) => contextChanged
      ? { ...emptyArticle(), language: current.language, target_type: current.target_type, project_id: current.project_id, area_name: current.area_name, ...patch }
      : { ...current, ...patch });
    setReviewConfirmed(false);
  }

  function removeSource(index: number) {
    if (busyRef.current) return;
    patchValues({ source_refs: values.source_refs.filter((_, sourceIndex) => sourceIndex !== index) });
  }

  function updateFaq(index: number, patch: Partial<ArticleFaqItem>) {
    if (busyRef.current) return;
    patchValues({ faq: (values.faq ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }

  function addFaq() {
    if (busyRef.current || (values.faq ?? []).length >= 10) return;
    patchValues({ faq: [...(values.faq ?? []), { question: "", answer: "" }] });
  }

  function removeFaq(index: number) {
    if (busyRef.current) return;
    patchValues({ faq: (values.faq ?? []).filter((_, itemIndex) => itemIndex !== index) });
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
      const normalized = withSeoDefaults(article);
      setSelectedId(id); setLoadedArticle(normalized); setValues(normalized); setSavedFingerprint(articleFingerprint(normalized)); setIdeas([]); setTopic(article.title); setReviewConfirmed(false); setTranslationChoice(null);
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  function newArticle() {
    if (busyRef.current) return;
    editorContext.current += 1;
    setSelectedId(null); setLoadedArticle(null); setValues(emptyArticle()); setSavedFingerprint(""); setIdeas([]); setTopic(""); setReviewConfirmed(false); setTranslationChoice(null);
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
      patchValues({
        ...result, source_refs: result.source_refs, review_issues: result.review_issues ?? [],
        focus_keyword: result.focus_keyword ?? values.focus_keyword ?? "",
        key_takeaways: Array.isArray(result.key_takeaways) ? result.key_takeaways : [],
        faq: Array.isArray(result.faq) ? result.faq : [],
      });
      notify("تم إنشاء مسودة فقط. راجعها وعدّلها قبل الحفظ أو النشر.");
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  async function save() {
    const operation = beginOperation("save");
    if (!operation) return;
    try {
      const { article } = await adminApi.articleSave(token, selectedId, values, loadedArticle?.revision ?? null, translationChoice ?? undefined);
      if (operation !== operationId.current) return;
      const normalized = withSeoDefaults(article);
      setSelectedId(article.id); setLoadedArticle(normalized); setValues(normalized); setSavedFingerprint(articleFingerprint(normalized)); setReviewConfirmed(false); setTranslationChoice(null); await refresh();
      notify("تم حفظ المسودة. لم يتم نشرها.");
    } catch (error) { if (operation === operationId.current) handleError(error); } finally { endOperation(operation); }
  }

  async function publish() {
    if (!selectedId || !loadedArticle || dirty || hasPublishBlockers || !reviewConfirmed || !isOwner) return;
    const operation = beginOperation("publish");
    if (!operation) return;
    try {
      const { article } = await adminApi.articlePublish(token, selectedId, loadedArticle.revision, loadedArticle.content_hash);
      if (operation !== operationId.current) return;
      const normalized = withSeoDefaults(article);
      setLoadedArticle(normalized); setValues(normalized); setSavedFingerprint(articleFingerprint(normalized)); setReviewConfirmed(false); await refresh(); notify("تم نشر المقال بعد المراجعة.");
    } catch (error) {
      if (operation !== operationId.current) return;
      if (error instanceof AdminApiError && error.code === "article_review_blocked") {
        setReviewConfirmed(false);
        const reviewIssues = error.reviewIssues;
        if (reviewIssues) setValues((current) => ({ ...current, review_issues: reviewIssues }));
      }
      handleError(error);
    } finally { endOperation(operation); }
  }

  const canGenerate = values.target_type === "project" ? Boolean(values.project_id) : Boolean(values.area_name);
  const translationValue = translationChoice ?? pairedId;
  return <><EditorialWorkflowPanel projects={projects} /><div className="grid gap-4 lg:grid-cols-[300px_1fr]">
    <aside className="rounded-3xl bg-white p-4 shadow-sm">
      <button disabled={Boolean(busy)} onClick={newArticle} className="w-full rounded-xl bg-[#0d1f18] px-4 py-3 font-black text-white disabled:opacity-50">مقال جديد</button>
      <div className="mt-3 space-y-2">
        {loading ? <p>جارٍ التحميل…</p> : articles.length === 0 ? <EmptyState title="لا توجد مقالات بعد" /> : articles.map((article) =>
          <button disabled={Boolean(busy)} key={article.id} onClick={() => void openArticle(article.id)} className={`w-full rounded-xl border p-3 text-start disabled:opacity-50 ${selectedId === article.id ? "border-[#a3854e] bg-[#fbf8f2]" : "border-[#eee7da]"}`}>
            <span className="block font-black">{article.title}</span>
            <span className="mt-1 flex flex-wrap gap-2"><Badge tone={article.status === "published" ? "ok" : "pending"}>{article.status === "published" ? "منشور" : "مسودة"}</Badge><Badge tone="muted">{article.language === "ar" ? "عربي" : "EN"}</Badge>{article.translation_key && <Badge tone="gold">مربوط بالترجمة</Badge>}<small>{article.updated_at.slice(0, 10)}</small></span>
            {article.focus_keyword && <small className="mt-1 block truncate text-[#5c6a62]">🔑 {article.focus_keyword}</small>}
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
        {ideas.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{ideas.map((idea) => <button disabled={Boolean(busy)} key={idea.title} onClick={() => setTopic(idea.title)} className="rounded-xl border bg-white p-3 text-start disabled:opacity-50"><strong>{idea.title}</strong><span className="mt-1 block text-xs text-[#5c6a62]">{idea.rationale}</span>{idea.angle && <span className="mt-1 block text-xs text-[#a3854e]">{idea.angle}</span>}</button>)}</div>}
        <div className="mt-3 flex gap-2"><input disabled={Boolean(busy)} className={inputClass} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="موضوع المقال" /><button disabled={!canGenerate || !topic.trim() || Boolean(busy)} onClick={() => void generateDraft()} className="shrink-0 rounded-xl bg-[#0d1f18] px-4 py-2 font-black text-white disabled:opacity-50">{busy === "draft" ? "جارٍ إنشاء المسودة… (قد تستغرق دقيقة)" : "أنشئ مسودة"}</button></div>
        <p className="mt-2 text-xs text-[#5c6a62]">لا توجد بيانات حجم بحث أو GSC هنا. الاقتراحات نوعية ومبنية فقط على معلومات المشاريع العامة.</p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold md:col-span-2">الكلمة المفتاحية (Focus Keyword)<input disabled={Boolean(busy)} className={inputClass} value={values.focus_keyword ?? ""} onChange={(event) => patchValues({ focus_keyword: event.target.value })} placeholder={values.language === "ar" ? "مثال: كمبوند ماونتن فيو التجمع الخامس" : "e.g. Mountain View New Cairo compound"} /></label>
            {([['title','العنوان'],['slug','الرابط'],['meta_title','عنوان SEO'],['meta_description','وصف SEO'],['excerpt','المقدمة']] as const).map(([field,label]) => <label key={field} className={`text-sm font-bold ${field === 'excerpt' ? 'md:col-span-2' : ''}`}>{label}{(field === 'meta_title' || field === 'meta_description') && <small className="ms-2 font-normal text-[#5c6a62]">{values[field].length}/{field === 'meta_title' ? 60 : 160}</small>}<input disabled={Boolean(busy)} dir={field === 'slug' ? 'ltr' : undefined} className={inputClass} value={values[field]} onChange={(event) => patchValues({ [field]: event.target.value })} /></label>)}
            <label className="text-sm font-bold md:col-span-2">الخلاصة — نقطة في كل سطر (3-5 نقاط)<textarea disabled={Boolean(busy)} className={`${inputClass} min-h-28 font-sans`} value={(values.key_takeaways ?? []).join("\n")} onChange={(event) => patchValues({ key_takeaways: event.target.value.split("\n") })} placeholder="جمل قصيرة بتجاوب مباشرة على موضوع المقال — من غير أسعار أو أرقام" /></label>
            <label className="text-sm font-bold md:col-span-2">نص المقال (Markdown آمن)<textarea disabled={Boolean(busy)} className={`${inputClass} min-h-80 font-sans`} value={values.body_markdown} onChange={(event) => patchValues({ body_markdown: event.target.value })} /></label>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e7ddc8] p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-black">الأسئلة الشائعة (FAQ)</h3><button disabled={Boolean(busy) || (values.faq ?? []).length >= 10} onClick={addFaq} className="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-50">+ سؤال</button></div>
            <p className="mt-1 text-xs text-[#5c6a62]">بتظهر في آخر المقال وبتتسجل لجوجل كـ FAQ. الإجابات من غير أسعار أو مواعيد أو أرقام.</p>
            {(values.faq ?? []).length === 0 ? <p className="mt-3 text-sm text-[#5c6a62]">مفيش أسئلة لسه.</p> : <div className="mt-3 space-y-3">{(values.faq ?? []).map((item, index) => <div key={index} className="rounded-xl bg-[#fbf8f2] p-3">
              <div className="flex gap-2"><input disabled={Boolean(busy)} className={inputClass} value={item.question} onChange={(event) => updateFaq(index, { question: event.target.value })} placeholder="السؤال" /><button disabled={Boolean(busy)} onClick={() => removeFaq(index)} className="shrink-0 rounded-lg border px-3 text-sm font-bold disabled:opacity-50" aria-label={`حذف السؤال ${index + 1}`}>حذف</button></div>
              <textarea disabled={Boolean(busy)} className={`${inputClass} mt-2 min-h-20 font-sans`} value={item.answer} onChange={(event) => updateFaq(index, { answer: event.target.value })} placeholder="الإجابة (1-3 جمل)" />
            </div>)}</div>}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold">الصورة الرئيسية (رابط https — اختياري)<input disabled={Boolean(busy)} dir="ltr" className={inputClass} value={values.hero_image_url ?? ""} onChange={(event) => patchValues({ hero_image_url: event.target.value.trim() || null })} placeholder="https://…" /></label>
            <label className="text-sm font-bold">النسخة باللغة التانية (hreflang)<select disabled={Boolean(busy)} className={inputClass} value={translationValue} onChange={(event) => setTranslationChoice(event.target.value)}><option value="">— بدون ربط —</option>{translationCandidates.map((article) => <option key={article.id} value={article.id}>{article.title} ({article.status === "published" ? "منشور" : "مسودة"})</option>)}</select>{translationChoice !== null && translationChoice !== pairedId && <small className="mt-1 block font-normal text-amber-700">الربط هيتطبق لما تحفظ.</small>}</label>
          </div>
        </div>
        <div className="space-y-4">
          <SeoScorePanel checks={checks} />
          <SerpPreview article={values} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#e7ddc8] bg-[#fbf8f2] p-4" aria-live="polite">
        <h3 className="font-black">ملاحظات المراجعة</h3>
        <p className="mt-1 text-sm">راجع الحقائق والمصادر وجميع الملاحظات قبل النشر. الفحص الآلي لا يثبت صحة المعلومات.</p>
        {dirty && <p className="mt-2 text-sm font-bold">قد تكون الملاحظات غير محدثة. احفظ التعديلات لتحديثها قبل تأكيد المراجعة والنشر.</p>}
        {values.source_refs.length > 0 && <div className="mt-3">
          <h4 className="text-sm font-bold">مصادر المسودة</h4>
          <p className="mt-1 text-xs">عند إزالة مصدر، عدّل أو احذف الحقائق المرتبطة به من جميع حقول المقال، ثم احفظ لإعادة الفحص.</p>
          <ul className="mt-2 space-y-2">{values.source_refs.map((source, index) => <li key={`${source.type}:${source.id}:${index}`} className="flex items-start justify-between gap-3 text-sm">
            <span>{source.label}<span className="block break-all text-xs text-[#5c6a62]" dir="ltr">{source.url}</span></span>
            <button disabled={Boolean(busy)} onClick={() => removeSource(index)} className="shrink-0 rounded-lg border px-3 py-1 font-bold disabled:opacity-50" aria-label={`إزالة المصدر: ${source.label}`}>إزالة المصدر</button>
          </li>)}</ul>
        </div>}
        {reviewIssues.length > 0 && <ul className="mt-3 space-y-2">{reviewIssues.map((issue, index) => <li key={`${issue.field}:${issue.code}:${index}`} className="text-sm">
          <strong>{REVIEW_FIELD_LABELS[issue.field] || issue.field}: {issue.severity === "blocker" ? "يمنع النشر" : "تحتاج مراجعة"}</strong>
          <span className="block">{issue.message}</span>
        </li>)}</ul>}
        {hasPublishBlockers && <p className="mt-3 text-sm font-bold text-red-700">صحّح الملاحظات التي تمنع النشر ثم احفظ المسودة لإعادة الفحص. يمكنك متابعة التحرير وحفظها كمسودة.</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button disabled={!values.title || !values.body_markdown || !values.source_refs.length || Boolean(busy)} onClick={() => void save()} className="rounded-xl bg-[#0d1f18] px-5 py-2 font-black text-white disabled:opacity-50">{busy === "save" ? "جارٍ الحفظ…" : "حفظ كمسودة"}</button>
        <button disabled={!values.body_markdown} onClick={() => setPreview(true)} className="rounded-xl border px-5 py-2 font-black">معاينة</button>
        {isOwner && loadedArticle?.status !== "published" && <Fragment><label className="flex items-center gap-2 text-sm font-bold"><input disabled={dirty || hasPublishBlockers || Boolean(busy)} type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} />راجعت حقائق النسخة المحفوظة ومصادرها وجميع ملاحظات المراجعة</label><button disabled={!selectedId || dirty || hasPublishBlockers || !reviewConfirmed || Boolean(busy)} onClick={() => void publish()} className="rounded-xl bg-emerald-700 px-5 py-2 font-black text-white disabled:opacity-50">{busy === "publish" ? "جارٍ النشر…" : "نشر النسخة المحفوظة"}</button></Fragment>}
      </div>
    </section>
    {preview && <Modal title="معاينة المقال — غير منشور" wide onClose={() => setPreview(false)}><Preview article={values} /><button onClick={() => setPreview(false)} className="mt-5 rounded-xl bg-[#0d1f18] px-5 py-2 font-black text-white">العودة للتحرير</button></Modal>}
  </div></>;
}
