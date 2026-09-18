import { useMemo, useState } from "react";
import { mediaImages, type AdminProject } from "../../lib/adminApi";
import { Badge, Chip, inputClass } from "./ui";

type Filter = "live" | "no-images" | "all";

export default function ProjectPicker({
  projects,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  className = "",
}: {
  projects: AdminProject[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("live");

  const counts = useMemo(
    () => ({
      all: projects.length,
      live: projects.filter((project) => project.slug).length,
      noImages: projects.filter((project) => project.slug && !mediaImages(project).length).length,
    }),
    [projects],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (filter === "live" && !project.slug) return false;
      if (filter === "no-images" && (!project.slug || mediaImages(project).length)) return false;
      if (!needle) return true;
      return [project.name, project.developer, project.location, project.slug].some((value) =>
        String(value || "").toLowerCase().includes(needle),
      );
    });
  }, [projects, query, filter]);

  return (
    <aside className={`rounded-3xl border border-[#e7ddc8] bg-white p-3 ${className}`}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث باسم المشروع أو المطور…"
        className={inputClass}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip active={filter === "live"} onClick={() => setFilter("live")}>
          على الموقع ({counts.live})
        </Chip>
        <Chip active={filter === "no-images"} onClick={() => setFilter("no-images")}>
          بدون صور ({counts.noImages})
        </Chip>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          الكل ({counts.all})
        </Chip>
      </div>
      <div className="mt-3 max-h-[calc(100vh-240px)] space-y-1 overflow-y-auto">
        {loading && <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">جاري التحميل…</p>}
        {error && (
          <div className="p-4 text-center text-sm">
            <p className="font-bold text-red-600">{error}</p>
            <button onClick={onRetry} className="mt-2 underline">
              جرّب تاني
            </button>
          </div>
        )}
        {!loading &&
          visible.map((project) => {
            const images = mediaImages(project);
            const active = project.id === selectedId;
            return (
              <button
                key={project.id}
                onClick={() => onSelect(project.id)}
                className={`flex w-full items-center gap-3 rounded-2xl p-2 text-right transition ${
                  active ? "bg-[#0d1f18] text-white" : "hover:bg-[#f7f2ea]"
                }`}
              >
                {images[0] ? (
                  <img src={images[0]} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-red-50 text-[10px] font-black text-red-600">
                    بدون صور
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{project.name}</span>
                  <span className={`block truncate text-xs ${active ? "text-white/70" : "text-[#5c6a62]"}`}>
                    {project.developer || "—"} · {images.length} صورة · {project.units_count} وحدة
                    {project.slug ? "" : " · مش ظاهر"}
                  </span>
                </span>
                {project.pending_requests > 0 && <Badge tone="pending">{project.pending_requests}</Badge>}
              </button>
            );
          })}
        {!loading && !error && !visible.length && <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">مفيش نتايج</p>}
      </div>
    </aside>
  );
}
