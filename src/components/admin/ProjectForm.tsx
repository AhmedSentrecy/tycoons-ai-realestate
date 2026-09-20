import { useState } from "react";
import { Modal, inputClass } from "./ui";

export interface NewProject {
  name: string;
  developer: string;
  location: string;
  description: string;
}

const FIELDS: { key: keyof NewProject; label: string; placeholder: string; required?: boolean }[] = [
  { key: "name", label: "اسم المشروع", placeholder: "Mountain View Aliva", required: true },
  { key: "developer", label: "المطور", placeholder: "Mountain View", required: true },
  { key: "location", label: "المنطقة", placeholder: "Mostakbal City", required: true },
];

export default function ProjectForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: NewProject) => void;
}) {
  const [values, setValues] = useState<NewProject>({ name: "", developer: "", location: "", description: "" });
  const ready = values.name.trim() && values.developer.trim() && values.location.trim();

  return (
    <Modal title="مشروع جديد" onClose={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onSubmit(values);
        }}
      >
        <div className="grid gap-3">
          {FIELDS.map(({ key, label, placeholder, required }) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-bold">
                {label}
                {required ? " *" : ""}
              </span>
              <input
                value={values[key]}
                onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                placeholder={placeholder}
                required={required}
                className={inputClass}
              />
            </label>
          ))}
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
