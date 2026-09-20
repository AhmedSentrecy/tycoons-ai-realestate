import { useEffect, useState } from "react";
import { adminApi, mediaImages, type AdminProject, type ChangeOp, type MediaFields } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import MediaEditor from "./MediaEditor";
import ProjectPicker from "./ProjectPicker";
import { Badge, EmptyState } from "./ui";

const SITE_URL = "https://tycoons-inv.com";

export default function MediaTab({
  projects,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  onCreateProject,
  onProjectSaved,
}: {
  projects: AdminProject[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onCreateProject: () => void;
  onProjectSaved: (id: string, values: Omit<MediaFields, "id">) => void;
}) {
  const { token, user, isOwner, handleError } = useAdmin();
  const [pendingValues, setPendingValues] = useState<Omit<MediaFields, "id"> | null>(null);
  const [pendingBy, setPendingBy] = useState<"me" | "other" | null>(null);
  const [checked, setChecked] = useState("");
  const project = projects.find((item) => item.id === selectedId) || null;

  // A project may already have a pending media request; start from it so edits stack instead of clashing.
  const projectId = project?.id ?? "";
  useEffect(() => {
    if (!projectId) return;
    adminApi
      .units(token, projectId)
      .then((data) => {
        setPendingValues(null);
        setPendingBy(null);
        const request = data.pending.find(
          (item) => item.action === "media" && item.target_id === projectId,
        ) as (typeof data.pending)[number] & { created_by?: string };
        if (request) {
          const op = (request.ops as ChangeOp[])[0];
          setPendingBy(request.created_by === user.id ? "me" : "other");
          if (request.created_by === user.id) setPendingValues((op?.values as Omit<MediaFields, "id">) ?? null);
        }
      })
      .catch(handleError)
      .finally(() => setChecked(projectId));
  }, [projectId, token, user.id, handleError]);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <ProjectPicker
        projects={projects}
        loading={loading}
        error={error}
        onRetry={onRetry}
        selectedId={selectedId}
        onSelect={onSelect}
        onCreate={onCreateProject}
        className={project ? "hidden lg:block" : ""}
      />
      <section className={project ? "" : "hidden lg:block"}>
        {!project && (
          <EmptyState
            title="اختار مشروع من القائمة"
            text="ارفع صور المشروع مرة واحدة، والوحدات بتاخدها لوحدها في صفحات الوحدات ونتايج البحث."
          />
        )}
        {project && (
          <div className="rounded-3xl border border-[#e7ddc8] bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] p-4">
              <button onClick={() => onSelect("")} className="rounded-full bg-[#f7f2ea] px-3 py-1.5 text-sm font-bold lg:hidden">
                → رجوع
              </button>
              <div className="me-auto min-w-0">
                <h2 className="truncate text-xl font-black">{project.name}</h2>
                <p className="text-xs text-[#5c6a62]">
                  {project.developer} · {project.location} · {mediaImages(project).length} صورة · {project.units_count} وحدة
                </p>
              </div>
              {project.slug && (
                <a
                  href={`${SITE_URL}/projects/${project.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#d8c9ab] px-3 py-1.5 text-sm font-bold text-[#8a6630]"
                >
                  افتح صفحة المشروع ↗
                </a>
              )}
            </div>
            <div className="p-4">
              {pendingBy === "other" && (
                <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  فيه طلب تعديل صور على المشروع ده مستني {isOwner ? "موافقتك (شوف تبويب الموافقات)" : "موافقة المالك"}.
                </p>
              )}
              {pendingBy === "me" && (
                <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  اللي ظاهر تحت هو تعديلك المستني الموافقة، مش اللي على الموقع دلوقتي. <Badge tone="pending">مستني موافقة</Badge>
                </p>
              )}
              {checked === project.id && (
                <MediaEditor
                  key={`project-${project.id}-${pendingBy ?? "live"}`}
                  target="project"
                  item={project}
                  initialValues={pendingValues}
                  hint="الصورة الأولى هي الغلاف. الصور دي بتظهر في صفحة المشروع، وكمان في صفحات الوحدات ونتايج البحث للوحدات اللي مالهاش صور خاصة."
                  onSaved={(values, applied) => {
                    if (applied) onProjectSaved(project.id, values);
                    else setPendingBy("me");
                  }}
                />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
