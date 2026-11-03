import { useState } from "react";
import { areaLabel, type AdminProject, type NewProjectValues } from "../../lib/adminApi";
import { AreaFields, DeveloperSelect, FinishingSelect } from "./SearchSelect";
import { Modal, inputClass } from "./ui";

export type NewProject = NewProjectValues;

/**
 * New project: the developer and the area are picked from lists (with search), so the same
 * company or area is never written two ways. `initial` pre-fills it (e.g. from a WhatsApp unit).
 */
export default function ProjectForm({
  projects,
  initial,
  busy,
  onCancel,
  onSubmit,
}: {
  projects: AdminProject[];
  initial?: Partial<NewProject>;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: NewProject) => void;
}) {
  const [values, setValues] = useState<NewProject>({
    name: initial?.name ?? "",
    developer: initial?.developer ?? "",
    new_developer: initial?.new_developer ?? false,
    area_group: initial?.area_group ?? "",
    sub_area: initial?.sub_area ?? "",
    description: initial?.description ?? "",
    finishing: initial?.finishing ?? "",
  });
  const ready = values.name.trim() && values.developer.trim() && values.area_group;
  const twin = projects.find((project) => project.name.trim().toLowerCase() === values.name.trim().toLowerCase());

  return (
    <Modal title="مشروع جديد" onClose={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onSubmit(values);
        }}
      >
        <div className="grid gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-bold">اسم المشروع *</span>
            <input
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              placeholder="Mountain View Aliva"
              required
              className={inputClass}
              dir="ltr"
            />
            {twin && <span className="mt-1 block text-xs font-bold text-red-600">فيه مشروع بنفس الاسم: {twin.name} — {twin.developer}. اتأكد إنه مش نفسه.</span>}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-bold">المطور *</span>
            <DeveloperSelect value={values.developer} onChange={(developer, isNew) => setValues({ ...values, developer, new_developer: isNew })} />
            {values.new_developer && <span className="mt-1 block text-xs text-[#8a6630]">«{values.developer}» هيتضاف كمطور جديد في تابة المطورين.</span>}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <AreaFields
              projects={projects}
              group={values.area_group}
              sub={values.sub_area}
              onChange={(area_group, sub_area) => setValues({ ...values, area_group, sub_area })}
            />
          </div>
          {values.area_group && (
            <p className="text-xs text-[#5c6a62]">
              هيظهر على الموقع: <b dir="ltr">{areaLabel(values.area_group, values.sub_area)}</b>
            </p>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-bold">التشطيب الافتراضي (اختياري)</span>
            <FinishingSelect value={values.finishing ?? ""} onChange={(finishing) => setValues({ ...values, finishing })} />
            <span className="mt-1 block text-xs text-[#5c6a62]">أي وحدة من الواتساب من غير تشطيب بتاخده من هنا.</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-bold">وصف قصير (اختياري)</span>
            <textarea
              value={values.description}
              onChange={(event) => setValues({ ...values, description: event.target.value })}
              rows={3}
              placeholder="سيبه فاضي ولو حابب، وهيتكتب وصف مبدئي تلقائي تقدر تعدّله بعدين."
              className={inputClass}
            />
          </label>
        </div>
        <p className="mt-3 rounded-2xl bg-[#f7f2ea] p-3 text-xs leading-relaxed text-[#5c6a62]">
          رابط المشروع على الموقع وعنوان ووصف الـSEO بيتعملوا تلقائي من الاسم والمطور والمنطقة. بعد الحفظ افتح المشروع وارفع صوره وضيف وحداته،
          وصفحته هتظهر على الموقع بعد أول «حدّث الموقع».
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold">
            إلغاء
          </button>
          <button
            type="submit"
            disabled={busy || !ready}
            className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            {busy ? "بيحفظ…" : "إنشاء المشروع"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
