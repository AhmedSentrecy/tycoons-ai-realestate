import { useMemo, useState } from "react";
import type { AdminArticle, AdminProject } from "../../lib/adminApi";
import { articleProjects } from "../../lib/articleAutofix";
import { Badge, inputClass } from "./ui";

/**
 * "مشاريع من غير مقال": every project with a page and no published article yet. A project leaves the
 * list by itself once one of its articles is published. Nothing is hidden from the site.
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
  onWrite: (project: AdminProject) => void;
  onOpen: (articleId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");

  const queue = useMemo(() => {
    const published = new Set(articles.filter((article) => article.status === "published" && article.project_id).map((article) => article.project_id));
    // Most units first: those pages get the most visits.
    return articleProjects(projects)
      .filter((project) => !published.has(project.id))
      .sort((a, b) => (b.units_count || 0) - (a.units_count || 0) || a.name.localeCompare(b.name));
  }, [projects, articles]);

  const drafts = useMemo(() => {
    const map = new Map<string, AdminArticle>();
    for (const article of articles) if (article.status === "draft" && article.project_id && !map.has(article.project_id)) map.set(article.project_id, article);
    return map;
  }, [articles]);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? queue.filter((project) => [project.name, project.developer, project.area_group, project.location].some((value) => String(value || "").toLowerCase().includes(needle)))
    : queue;

  return (
    <section className="mb-4 rounded-3xl border border-[#e7ddc8] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen((state) => !state)} className="me-auto text-start">
          <h2 className="text-lg font-black">
            مشاريع من غير مقال ({queue.length}) <span className="text-xs text-[#8a958f]">{open ? "▴" : "▾"}</span>
          </h2>
          <p className="text-xs text-[#5c6a62]">أول ما تنشر مقال لمشروع، بيتشال من القايمة لوحده. الأكتر وحدات فوق.</p>
        </button>
        {open && queue.length > 8 && (
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في القايمة…" className={`${inputClass} max-w-xs`} />
        )}
      </div>
      {open && (
        queue.length === 0 ? (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">كل المشاريع ليها مقال منشور.</p>
        ) : (
          <ul className="mt-3 max-h-80 divide-y divide-[#f1eadc] overflow-y-auto rounded-2xl border border-[#f1eadc]">
            {shown.map((project) => {
              const draft = drafts.get(project.id);
              const active = project.id === activeProjectId;
              return (
                <li key={project.id} className={`flex flex-wrap items-center gap-2 p-2 ${active ? "bg-[#fbf8f2]" : ""}`}>
                  <div className="me-auto min-w-0">
                    <span className="block truncate text-sm font-black" dir="ltr">{project.name}</span>
                    <span className="block truncate text-xs text-[#5c6a62]">
                      {project.developer || "—"} · {project.area_group || project.location || "—"} · {project.units_count || 0} وحدة
                    </span>
                  </div>
                  {draft && <Badge tone="pending">فيه مسودة</Badge>}
                  {draft ? (
                    <button type="button" disabled={busy} onClick={() => onOpen(draft.id)} className="rounded-lg bg-[#f1eadc] px-3 py-1.5 text-xs font-black disabled:opacity-50">
                      كمّل المسودة
                    </button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => onWrite(project)} className="rounded-lg bg-[#0d1f18] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                      اكتب المقال
                    </button>
                  )}
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
