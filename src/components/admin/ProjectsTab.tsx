import { useMemo, useState } from "react";
import { adminApi, hideLegacyDuplicates, mediaImages, type AdminProject, type ProjectEditValues } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, Modal, inputClass } from "./ui";

type FieldKey = keyof ProjectEditValues;
const FIELDS: { key: FieldKey; label: string; long?: boolean; required?: boolean; hint?: string }[] = [
  { key: "name", label: "اسم المشروع", required: true },
  { key: "developer", label: "المطور", required: true, hint: "لو غيرته، كل وحدات المشروع بتتنقل للمطور الجديد" },
  { key: "location", label: "المنطقة", required: true },
  { key: "hero_text", label: "جملة تعريفية قصيرة" },
  { key: "description", label: "وصف المشروع", long: true },
  { key: "down_payment_text", label: "المقدم (مثال: 5%)" },
  { key: "installments_text", label: "التقسيط (مثال: 8 سنين)" },
  { key: "delivery_text", label: "الاستلام (مثال: 2028)" },
  { key: "seo_title", label: "عنوان جوجل (اختياري)", hint: "سيبه فاضي ويتعمل تلقائي من الاسم والأسعار" },
  { key: "seo_description", label: "وصف جوجل (اختياري)", long: true, hint: "حوالي 150 حرف" },
];

const fmt = (value?: string | null) => (value ? new Date(value).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Projects: edit their details and delete them. Changes apply at once and show in «سجل التعديلات». */
export default function ProjectsTab({ projects, onChanged }: { projects: AdminProject[]; onChanged: () => void }) {
  const { token, notify, handleError } = useAdmin();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminProject | null>(null);
  const [deleting, setDeleting] = useState<AdminProject | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hideLegacyDuplicates(projects)
      .filter((project) => !q || `${project.name} ${project.developer ?? ""} ${project.location ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, query]);

  return (
    <section className="rounded-3xl border border-[#e7ddc8] bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#14352a]">المشاريع</h2>
          <p className="mt-1 text-sm text-[#5c6a62]">عدّل بيانات أي مشروع أو امسحه. أي تعديل بيتطبق على طول وبيتسجل في «سجل التعديلات».</p>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم المشروع أو المطور أو المنطقة" className={`${inputClass} max-w-sm`} />
      </div>
      <p className="mt-3 text-xs text-[#5c6a62]">{list.length} مشروع</p>
      <ul className="mt-2 grid gap-2">
        {list.map((project) => {
          const cover = mediaImages(project)[0];
          return (
            <li key={project.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#eee5d6] p-3">
              {cover ? <img src={cover} alt="" loading="lazy" className="h-12 w-16 rounded-lg object-cover" /> : <span className="h-12 w-16 rounded-lg bg-[#f1ebdc]" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{project.name} {!project.slug && <Badge tone="muted">ملوش صفحة</Badge>}</p>
                <p className="truncate text-xs text-[#5c6a62]">
                  {project.developer} · {project.location} · {project.available_units} وحدة متاحة من {project.units_count}
                  {project.new_units_week ? ` · ${project.new_units_week} جديدة الأسبوع ده` : ""} · آخر تحديث {fmt(project.last_updated_at)}
                </p>
              </div>
              {project.slug && (
                <a href={`/projects/${project.slug}`} target="_blank" rel="noopener" className="rounded-full border border-[#e0d3bb] px-3 py-1.5 text-xs font-bold">
                  افتح الصفحة
                </a>
              )}
              <button type="button" onClick={() => setEditing(project)} className="rounded-full bg-[#14352a] px-4 py-1.5 text-xs font-bold text-white">
                تعديل
              </button>
              <button type="button" onClick={() => setDeleting(project)} className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-bold text-red-600">
                مسح
              </button>
            </li>
          );
        })}
      </ul>

      {editing && (
        <EditDialog
          project={editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            try {
              const result = await adminApi.projectUpdate(token, editing.id, values);
              notify(result.applied ? `اتحفظ ${values.name || editing.name}` : "مفيش تغيير");
              setEditing(null);
              onChanged();
            } catch (error) {
              handleError(error);
            }
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          project={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={async (typed) => {
            try {
              await adminApi.projectDelete(token, deleting.id, typed);
              notify(`اتمسح ${deleting.name} ووحداته`);
              setDeleting(null);
              onChanged();
            } catch (error) {
              handleError(error);
            }
          }}
        />
      )}
    </section>
  );
}

function EditDialog({ project, onClose, onSave }: { project: AdminProject; onClose: () => void; onSave: (values: ProjectEditValues) => Promise<void> }) {
  const initial = Object.fromEntries(FIELDS.map(({ key }) => [key, String(project[key] ?? "")])) as Record<FieldKey, string>;
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const changed = Object.fromEntries(FIELDS.filter(({ key }) => values[key] !== initial[key]).map(({ key }) => [key, values[key]])) as ProjectEditValues;
  const ready = values.name.trim() && values.developer.trim() && values.location.trim() && Object.keys(changed).length > 0;
  return (
    <Modal title={`تعديل ${project.name}`} onClose={onClose} wide>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready) return;
          setBusy(true);
          await onSave(changed);
          setBusy(false);
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {FIELDS.map(({ key, label, long, required, hint }) => (
          <label key={key} className={`block text-sm ${long ? "sm:col-span-2" : ""}`}>
            <span className="mb-1 block font-bold">{label}{required ? " *" : ""}</span>
            {long ? (
              <textarea value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} rows={key === "description" ? 6 : 2} className={inputClass} />
            ) : (
              <input value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} required={required} className={inputClass} />
            )}
            {hint && <span className="mt-1 block text-xs text-[#5c6a62]">{hint}</span>}
          </label>
        ))}
        <p className="rounded-2xl bg-[#f7f2ea] p-3 text-xs text-[#5c6a62] sm:col-span-2">رابط الصفحة مش بيتغير لو غيرت الاسم، عشان جوجل ميخسرش الصفحة. التعديل بيظهر على الموقع خلال دقايق.</p>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">إلغاء</button>
          <button type="submit" disabled={busy || !ready} className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40">
            {busy ? "بيحفظ…" : "احفظ"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({ project, onClose, onConfirm }: { project: AdminProject; onClose: () => void; onConfirm: (typed: string) => Promise<void> }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="مسح مشروع" onClose={onClose}>
      <p className="text-sm leading-7">
        هتمسح <b>{project.name}</b> و<b>{project.units_count}</b> وحدة تبعه من الموقع نهائيًا. نسخة من بياناته بتتحفظ في «سجل التعديلات».
      </p>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-bold">اكتب اسم المشروع للتأكيد: <span dir="ltr">{project.name}</span></span>
        <input value={typed} onChange={(event) => setTyped(event.target.value)} className={inputClass} dir="ltr" />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">إلغاء</button>
        <button
          type="button"
          disabled={busy || typed.trim() !== project.name.trim()}
          onClick={async () => {
            setBusy(true);
            await onConfirm(project.name);
            setBusy(false);
          }}
          className="rounded-full bg-red-600 px-5 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "بيمسح…" : "امسح نهائيًا"}
        </button>
      </div>
    </Modal>
  );
}
