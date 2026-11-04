import { useEffect, useMemo, useRef, useState } from "react";
import { articleLanguages, waDemandLabel, type AdminArticle, type AdminProject } from "../../lib/adminApi";
import { articleProjects } from "../../lib/articleAutofix";
import { BATCH_SIZE, runArticleBatch, type BatchItem, type BatchProgress } from "../../lib/articleBatch";
import { useAdmin } from "./AdminContext";
import { Badge, Chip, inputClass } from "./ui";

type Language = "ar" | "en";
type Mode = "none" | "partial";

/** "عربي ✓" / "إنجليزي ✗" for one project. */
export function LanguageBadges({ languages }: { languages: Set<string> | undefined }) {
  return (
    <>
      <Badge tone={languages?.has("ar") ? "ok" : "error"}>عربي {languages?.has("ar") ? "✓" : "✗"}</Badge>
      <Badge tone={languages?.has("en") ? "ok" : "error"}>إنجليزي {languages?.has("en") ? "✓" : "✗"}</Badge>
    </>
  );
}

/**
 * Projects whose article is missing: no article at all, or only one language (Google needs both for
 * the English page). Most WhatsApp requests first, then most units. A project leaves the list by itself
 * once its missing article is published. Nothing is hidden from the site.
 */
export default function ArticleQueue({
  projects,
  articles,
  busy,
  activeProjectId,
  onWrite,
  onOpen,
  onBatchSaved,
}: {
  projects: AdminProject[];
  articles: AdminArticle[];
  busy: boolean;
  activeProjectId: string | null;
  onWrite: (project: AdminProject, language: Language) => void;
  onOpen: (articleId: string) => void;
  /** Called after each draft the batch saves, so the lists refresh. */
  onBatchSaved: () => Promise<void> | void;
}) {
  const { token, notify } = useAdmin();
  const [open, setOpen] = useState(true);
  const [batch, setBatch] = useState<{ items: BatchItem[]; progress: Record<string, BatchProgress>; running: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const stopRef = useRef(false);
  const [mode, setMode] = useState<Mode>("none");
  const [query, setQuery] = useState("");

  const languages = useMemo(() => articleLanguages(articles), [articles]);
  const { none, partial } = useMemo(() => {
    const byDemand = (a: AdminProject, b: AdminProject) =>
      (b.wa_requests || 0) - (a.wa_requests || 0) || (b.units_count || 0) - (a.units_count || 0) || a.name.localeCompare(b.name);
    const live = articleProjects(projects);
    return {
      none: live.filter((project) => !languages.get(project.id)?.size).sort(byDemand),
      partial: live.filter((project) => languages.get(project.id)?.size === 1).sort(byDemand),
    };
  }, [projects, languages]);

  // Drafts per project and language, to continue instead of starting over.
  const drafts = useMemo(() => {
    const map = new Map<string, AdminArticle>();
    for (const article of articles) {
      const key = `${article.project_id}|${article.language}`;
      if (article.status === "draft" && article.project_id && !map.has(key)) map.set(key, article);
    }
    return map;
  }, [articles]);

  // Published article per project and language, linked as the translation of the new draft.
  const published = useMemo(() => {
    const map = new Map<string, string>();
    for (const article of articles) if (article.status === "published" && article.project_id) map.set(`${article.project_id}|${article.language}`, article.id);
    return map;
  }, [articles]);

  const queue = mode === "none" ? none : partial;

  // First 5 of this list with no draft yet, in the first missing language (Arabic first).
  const batchItems = useMemo(() => {
    const items: BatchItem[] = [];
    for (const project of queue) {
      if (items.length >= BATCH_SIZE) break;
      const have = languages.get(project.id);
      const missing = (["ar", "en"] as const).filter((lang) => !have?.has(lang));
      // A project with a draft waiting for review is skipped: review that one first.
      if (!missing.length || missing.some((lang) => drafts.has(`${project.id}|${lang}`))) continue;
      const language = missing[0];
      items.push({ project, language, translationOf: published.get(`${project.id}|${language === "ar" ? "en" : "ar"}`) });
    }
    return items;
  }, [queue, languages, drafts, published]);

  const running = Boolean(batch?.running);
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  async function startBatch() {
    setConfirming(false);
    const items = batchItems;
    if (!items.length) return;
    stopRef.current = false;
    setBatch({ items, progress: Object.fromEntries(items.map((item) => [item.project.id, { step: "waiting" } as BatchProgress])), running: true });
    const saved = await runArticleBatch(
      token,
      items,
      (projectId, progress) => {
        setBatch((current) => current && { ...current, progress: { ...current.progress, [projectId]: progress } });
        if (progress.step === "done") void onBatchSaved();
      },
      () => stopRef.current,
    );
    setBatch((current) => current && { ...current, running: false });
    notify(saved.length ? `اتكتب ${saved.length} مسودة من ${items.length}. محدش اتنشر — راجع كل مسودة وانشرها بنفسك.` : "ما اتكتبتش ولا مسودة. شوف سبب كل واحدة في القايمة.", saved.length ? "ok" : "error");
  }
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? queue.filter((project) => [project.name, project.developer, project.area_group, project.location].some((value) => String(value || "").toLowerCase().includes(needle)))
    : queue;

  return (
    <section className="mb-4 rounded-3xl border border-[#e7ddc8] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen((state) => !state)} className="me-auto text-start">
          <h2 className="text-lg font-black">
            مقالات ناقصة ({none.length + partial.length}) <span className="text-xs text-[#8a958f]">{open ? "▴" : "▾"}</span>
          </h2>
          <p className="text-xs text-[#5c6a62]">الأكتر طلبات واتساب فوق. أول ما المقال الناقص يتنشر، المشروع بيتشال من القايمة لوحده.</p>
        </button>
        {open && (
          <>
            <Chip active={mode === "none"} onClick={() => setMode("none")}>من غير مقال خالص ({none.length})</Chip>
            <Chip active={mode === "partial"} onClick={() => setMode("partial")}>ناقصها لغة ({partial.length})</Chip>
            {running ? (
              <button type="button" onClick={() => { stopRef.current = true; }} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
                وقّف بعد المسودة الحالية
              </button>
            ) : (
              <button type="button" disabled={busy || !batchItems.length} onClick={() => setConfirming(true)} className="rounded-xl bg-[#d9b87c] px-3 py-2 text-xs font-black disabled:opacity-50">
                {batchItems.length ? `اكتب مسودات لأول ${batchItems.length}` : "كل اللي في القايمة ليه مسودة"}
              </button>
            )}
            {queue.length > 8 && (
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في القايمة…" className={`${inputClass} max-w-xs`} />
            )}
          </>
        )}
      </div>
      {open && confirming && (
        <div className="mt-3 rounded-2xl border border-[#e7ddc8] bg-[#fbf8f2] p-3 text-sm">
          <p className="font-black">هتتكتب {batchItems.length} مسودات، كل مشروع: تحليل جوجل + بحث في النت + كتابة المقال.</p>
          <ul className="mt-1 list-disc ps-5 text-xs text-[#5c6a62]">
            {batchItems.map((item) => <li key={item.project.id}><span dir="ltr">{item.project.name}</span> — {item.language === "ar" ? "عربي" : "إنجليزي"}</li>)}
          </ul>
          <p className="mt-2 text-xs text-[#5c6a62]">
            بتاخد حوالي 15–30 دقيقة (كل مقال 3–6 دقايق). سيب الصفحة دي مفتوحة لحد ما يخلص.
            المسودات بتتحفظ بس — مفيش حاجة بتتنشر غير لما تراجعها وتدوس «نشر» بنفسك.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => void startBatch()} className="rounded-xl bg-[#0d1f18] px-4 py-2 text-xs font-black text-white">ابدأ</button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-xl bg-[#f1eadc] px-4 py-2 text-xs font-black">إلغاء</button>
          </div>
        </div>
      )}
      {open && batch && (
        <div className="mt-3 rounded-2xl border border-[#e7ddc8] p-3">
          <div className="flex items-center gap-2">
            <p className="me-auto text-sm font-black">{batch.running ? "جاري كتابة المسودات… سيب الصفحة مفتوحة" : "خلصت دفعة المسودات"}</p>
            {!batch.running && <button type="button" onClick={() => setBatch(null)} className="text-xs font-bold text-[#5c6a62]">إخفاء</button>}
          </div>
          <ul className="mt-2 space-y-1">
            {batch.items.map((item) => {
              const progress = batch.progress[item.project.id] ?? { step: "waiting" };
              return (
                <li key={item.project.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="me-auto font-bold" dir="ltr">{item.project.name}</span>
                  <span className="text-[#5c6a62]">{item.language === "ar" ? "عربي" : "إنجليزي"}</span>
                  <Badge tone={STEP_TONE[progress.step]}>{stepLabel(progress)}</Badge>
                  {progress.step === "done" && progress.articleId && (
                    <button type="button" disabled={batch.running} onClick={() => onOpen(progress.articleId!)} className="rounded-lg bg-[#f1eadc] px-2 py-1 font-black disabled:opacity-50">راجع المسودة</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {open && (
        queue.length === 0 ? (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            {mode === "none" ? "كل المشاريع ليها مقال." : "كل المشاريع اللي ليها مقال، ليها النسختين."}
          </p>
        ) : (
          <ul className="mt-3 max-h-96 divide-y divide-[#f1eadc] overflow-y-auto rounded-2xl border border-[#f1eadc]">
            {shown.map((project) => {
              const have = languages.get(project.id);
              const missing: Language[] = (["ar", "en"] as const).filter((language) => !have?.has(language));
              const demand = waDemandLabel(project);
              return (
                <li key={project.id} className={`flex flex-wrap items-center gap-2 p-2 ${project.id === activeProjectId ? "bg-[#fbf8f2]" : ""}`}>
                  <div className="me-auto min-w-0">
                    <span className="block truncate text-sm font-black" dir="ltr">{project.name}</span>
                    <span className="block truncate text-xs text-[#5c6a62]">
                      {project.developer || "—"} · {project.area_group || project.location || "—"} · {project.units_count || 0} وحدة
                    </span>
                    {demand && <span className="block text-xs font-bold text-emerald-700">{demand}</span>}
                  </div>
                  <LanguageBadges languages={have} />
                  {missing.map((language) => {
                    const draft = drafts.get(`${project.id}|${language}`);
                    const label = language === "ar" ? "العربي" : "الإنجليزي";
                    return draft ? (
                      <button key={language} type="button" disabled={busy || running} onClick={() => onOpen(draft.id)} className="rounded-lg bg-[#f1eadc] px-3 py-1.5 text-xs font-black disabled:opacity-50">
                        كمّل مسودة {label}
                      </button>
                    ) : (
                      <button key={language} type="button" disabled={busy || running} onClick={() => onWrite(project, language)} className="rounded-lg bg-[#0d1f18] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                        اكتب {label}
                      </button>
                    );
                  })}
                </li>
              );
            })}
            {!shown.length && <li className="p-3 text-center text-sm text-[#5c6a62]">مفيش نتيجة.</li>}
          </ul>
        )
      )}
    </section>
  );
}

const STEP_TONE: Record<BatchProgress["step"], "pending" | "ok" | "error" | "muted" | "gold"> = {
  waiting: "muted", write: "gold", save: "gold", done: "ok", failed: "error", skipped: "muted",
};

const ERRORS: Record<string, string> = {
  generation_rate_limited: "وصلنا للحد ومستنيناش أكتر — جرّب تاني بعد شوية",
  generation_in_progress: "في كتابة شغالة لنفس المشروع — جرّب تاني بعد دقيقة",
  generation_timeout: "الكتابة أخدت وقت طويل — جرّب تاني",
  login_required: "سجّل دخول تاني",
  generation_background_failed: "الكتابة وقفت قبل ما تخلص — جرّب تاني",
};

function stepLabel(progress: BatchProgress) {
  const wait = progress.waitSeconds ? ` — مستني الحد ${Math.floor(progress.waitSeconds / 60)}:${String(progress.waitSeconds % 60).padStart(2, "0")}` : "";
  switch (progress.step) {
    case "waiting": return "في الدور";
    case "write": return `بيحلل جوجل ويبحث ويكتب${wait}`;
    case "save": return "بيحفظ";
    case "done": return "اتحفظت مسودة ✓";
    case "skipped": return "اتوقفت";
    default: return `فشلت: ${ERRORS[progress.error || ""] || progress.error || "خطأ"}`;
  }
}
