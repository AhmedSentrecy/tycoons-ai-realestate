import { useMemo, useRef, useState } from "react";
import { adminApi, AdminApiError, hideLegacyDuplicates, isImageUrl, isUploadableImage, mediaImages, optimizeImage, uploadToSignedUrl, type AdminProject } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";

interface Props {
  projects: AdminProject[];
  /** The article's project (or the first project of its area): its photos open first. */
  defaultProjectId: string | null;
  value: string | null;
  disabled: boolean;
  onChange: (url: string | null) => void;
}

export default function HeroImagePicker({ projects, defaultProjectId, value, disabled, onChange }: Props) {
  const { token, handleError, notify } = useAdmin();
  // Old duplicate rows (same photos, no page) are not offered; the article's own project always is.
  const withImages = useMemo(() => hideLegacyDuplicates(projects).filter((project) => mediaImages(project).length > 0), [projects]);
  // The editor's own choice applies only while the article's project is unchanged;
  // switching the article's project opens that project's photos again.
  const [choice, setChoice] = useState<{ base: string | null; id: string }>({ base: defaultProjectId, id: defaultProjectId || "" });
  const projectId = choice.base === defaultProjectId ? choice.id : defaultProjectId || "";
  const setProjectId = (id: string) => setChoice({ base: defaultProjectId, id });
  const [uploading, setUploading] = useState(0);
  const [showLink, setShowLink] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const project = projects.find((item) => item.id === projectId) ?? null;
  const images = project ? mediaImages(project) : [];
  const invalid = Boolean(value) && !isImageUrl(value || "");

  const upload = async (file: File | undefined) => {
    if (!file || !project) return;
    try {
      setUploading(0.01);
      const blob = await optimizeImage(file);
      if (!isUploadableImage(blob.type)) throw new AdminApiError("unsupported_file_type", 400);
      const signed = await adminApi.signUpload(token, { target: "project", id: project.id, kind: "image", content_type: blob.type, size: blob.size });
      await uploadToSignedUrl(signed.upload_url, blob, (ratio) => setUploading(Math.max(0.01, ratio)));
      onChange(signed.public_url);
      notify("الصورة اترفعت واتحطت كصورة رئيسية للمقال");
    } catch (error) {
      handleError(error);
    } finally {
      setUploading(0);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-[#e7ddc8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black">الصورة الرئيسية للمقال <span className="text-xs font-normal text-[#5c6a62]">(اختياري — بتظهر في جوجل وواتساب وفيسبوك)</span></h3>
        {value && <button type="button" disabled={disabled} onClick={() => onChange(null)} className="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-50">شيل الصورة</button>}
      </div>

      {value && (
        <div className="mt-3 flex items-center gap-3">
          {!invalid && <img src={value} alt="الصورة المختارة" className="h-20 w-32 shrink-0 rounded-xl object-cover" />}
          <p dir="ltr" className="min-w-0 truncate text-xs text-[#5c6a62]">{value}</p>
        </div>
      )}
      {invalid && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm font-bold text-red-700">الرابط ده مش صورة (لازم ينتهي بـ .jpg أو .png أو .webp). اختار صورة من تحت أو شيله.</p>}

      <label className="mt-3 block text-sm font-bold">صور مشروع
        <select disabled={disabled} className="mt-1 w-full rounded-xl border border-[#e7ddc8] bg-white px-3 py-2" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">اختر مشروع</option>
          {withImages.map((item) => <option key={item.id} value={item.id}>{item.name} ({mediaImages(item).length} صورة)</option>)}
        </select>
      </label>

      {project && (images.length ? (
        <div className="mt-3 flex w-full max-w-full snap-x gap-2 overflow-x-auto pb-2" role="listbox" aria-label={`صور ${project.name}`}>
          {images.map((url, index) => {
            const selected = url === value;
            return (
              <button key={url} type="button" role="option" aria-selected={selected} disabled={disabled} onClick={() => onChange(url)}
                className={`relative h-24 w-36 shrink-0 snap-start overflow-hidden rounded-xl border-4 disabled:opacity-50 ${selected ? "border-[#a3854e]" : "border-transparent"}`}>
                <img src={url} alt={`${project.name} ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                {selected && <span className="absolute inset-x-0 bottom-0 bg-[#a3854e] text-xs font-bold text-white">مختارة ✓</span>}
              </button>
            );
          })}
        </div>
      ) : <p className="mt-3 text-sm text-[#5c6a62]">المشروع ده مفيهوش صور لسه. ارفع صورة من جهازك أو اختار مشروع تاني.</p>)}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
        <button type="button" disabled={disabled || !project || uploading > 0} onClick={() => fileInput.current?.click()} className="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-50">
          {uploading > 0 ? `بيرفع… ${Math.round(uploading * 100)}%` : "ارفع صورة من جهازك"}
        </button>
        <button type="button" disabled={disabled} onClick={() => setShowLink(!showLink)} className="text-sm font-bold text-[#a3854e] underline">{showLink ? "إخفاء الرابط" : "أو حط رابط صورة"}</button>
      </div>
      {!project && <p className="mt-1 text-xs text-[#5c6a62]">اختار مشروع الأول علشان ترفع صورة.</p>}
      {showLink && <input disabled={disabled} dir="ltr" className="mt-2 w-full rounded-xl border border-[#e7ddc8] bg-white px-3 py-2" value={value ?? ""} onChange={(event) => onChange(event.target.value.trim() || null)} placeholder="https://….webp" />}
    </div>
  );
}
