import { useMemo, useState } from "react";
import { articleLanguages, waDemandLabel, type AdminArticle, type AdminProject } from "../../lib/adminApi";
import { articleProjects } from "../../lib/articleAutofix";
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
}: {
  projects: AdminProject[];
  articles: AdminArticle[];
  busy: boolean;
  activeProjectId: string | null;
  onWrite: (project: AdminProject, language: Language) => void;
  onOpen: (articleId: string) => void;
}) {
  const [open, setOpen] = useState(true);
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

  const queue = mode === "none" ? none : partial;
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
            {queue.length > 8 && (
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في القايمة…" className={`${inputClass} max-w-xs`} />
            )}
          </>
        )}
      </div>
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
                      <button key={language} type="button" disabled={busy} onClick={() => onOpen(draft.id)} className="rounded-lg bg-[#f1eadc] px-3 py-1.5 text-xs font-black disabled:opacity-50">
                        كمّل مسودة {label}
                      </button>
                    ) : (
                      <button key={language} type="button" disabled={busy} onClick={() => onWrite(project, language)} className="rounded-lg bg-[#0d1f18] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
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
