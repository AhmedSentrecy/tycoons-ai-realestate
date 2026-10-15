import { useEffect, useMemo, useState } from "react";
import { adminApi, uploadToSignedUrl, type AdminDeveloper, type DeveloperEditValues } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, Modal, inputClass } from "./ui";

type Key = "name_ar" | "about_ar" | "about_en" | "seo_title_ar" | "seo_description_ar" | "seo_title_en" | "seo_description_en";
const FIELDS: { key: Key; label: string; long?: boolean; dir?: "ltr"; hint?: string }[] = [
  { key: "name_ar", label: "الاسم بالعربي", hint: "ده اللي بيظهر في الموقع (مثال: ماونتن فيو)" },
  { key: "about_ar", label: "نبذة عن الشركة بالعربي", long: true, hint: "بتظهر في صفحة المطور وفي «عن المطور» في صفحة كل مشروع" },
  { key: "about_en", label: "About (English)", long: true, dir: "ltr" },
  { key: "seo_title_ar", label: "عنوان جوجل بالعربي (اختياري)", hint: "سيبه فاضي ويتعمل تلقائي: مشاريع X 2026 — الأسعار وأنظمة السداد" },
  { key: "seo_description_ar", label: "وصف جوجل بالعربي (اختياري)", long: true, hint: "حوالي 150 حرف" },
  { key: "seo_title_en", label: "Google title (English, optional)", dir: "ltr" },
  { key: "seo_description_en", label: "Google description (English, optional)", long: true, dir: "ltr" },
];

/** Developer pages: Arabic name, intro, Google title/description and the company logo. */
export default function DevelopersTab() {
  const { token, notify, handleError } = useAdmin();
  const [rows, setRows] = useState<AdminDeveloper[]>([]);
  const [prefix, setPrefix] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminDeveloper | null>(null);

  const load = () =>
    adminApi.developers(token)
      .then((data) => { setRows(data.developers); setPrefix(data.logo_prefix); })
      .catch(handleError)
      .finally(() => setLoading(false));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => !q || `${row.name} ${row.name_ar ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  if (loading) return <p className="p-6 text-center font-bold text-[#5c6a62]">جاري التحميل…</p>;

  return (
    <section className="rounded-3xl border border-[#e7ddc8] bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#14352a]">المطورين — SEO</h2>
          <p className="mt-1 text-sm text-[#5c6a62]">اكتب نبذة كل شركة وعنوان ووصف جوجل وارفع اللوجو. الشركة اللي ناقصها حاجة مكتوب جنبها.</p>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم المطور" className={`${inputClass} max-w-xs`} />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {list.map((row) => {
          const missing = [!row.logo_path && "لوجو", !row.about_ar && "نبذة", !row.name_ar && "اسم عربي"].filter(Boolean) as string[];
          return (
            <li key={row.slug} className="flex items-center gap-3 rounded-2xl border border-[#eee5d6] p-3">
              <span className={`grid h-12 w-20 shrink-0 place-items-center rounded-lg p-1 ${row.logo_on_dark || !row.logo_path ? "bg-[#14352a]" : "bg-[#f7f2ea]"}`}>
                {row.logo_path ? <img src={`${prefix}${row.logo_path}`} alt="" className="max-h-10 max-w-full object-contain" /> : <span className="text-xs font-black text-[#d9b87c]">{row.name.slice(0, 2).toUpperCase()}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{row.name_ar || row.name} <span className="text-xs font-normal text-[#5c6a62]">{row.name_ar ? row.name : ""}</span></p>
                <p className="text-xs text-[#5c6a62]">{row.projects} مشروع</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {missing.length ? missing.map((item) => <Badge key={item} tone="pending">ناقص {item}</Badge>) : <Badge tone="ok">كامل</Badge>}
                </div>
              </div>
              <button type="button" onClick={() => setEditing(row)} className="rounded-full bg-[#14352a] px-4 py-1.5 text-xs font-bold text-white">تعديل</button>
            </li>
          );
        })}
      </ul>
      {editing && (
        <DeveloperDialog
          row={editing}
          prefix={prefix}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            try {
              const result = await adminApi.developerSave(token, editing.slug, editing.name, values);
              notify(result.unchanged ? "مفيش تغيير" : `اتحفظ ${editing.name_ar || editing.name} — هيظهر على الموقع خلال دقايق`);
              setEditing(null);
              void load();
            } catch (error) {
              handleError(error);
            }
          }}
        />
      )}
    </section>
  );
}

function DeveloperDialog({ row, prefix, onClose, onSave }: { row: AdminDeveloper; prefix: string; onClose: () => void; onSave: (values: DeveloperEditValues) => Promise<void> }) {
  const { token, handleError } = useAdmin();
  const initial = Object.fromEntries(FIELDS.map(({ key }) => [key, String(row[key] ?? "")])) as Record<Key, string>;
  const [values, setValues] = useState(initial);
  const [logo, setLogo] = useState(row.logo_path ?? "");
  const [onDark, setOnDark] = useState(Boolean(row.logo_on_dark));
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 3 * 1024 * 1024) return handleError(new Error("الملف أكبر من 3 ميجا"));
    setUploading(true);
    try {
      const signed = await adminApi.developerLogoSign(token, row.slug, file.type, file.size);
      await uploadToSignedUrl(signed.upload_url, file, () => undefined);
      setLogo(signed.path);
    } catch (error) {
      handleError(error);
    } finally {
      setUploading(false);
    }
  }

  const changed: DeveloperEditValues = Object.fromEntries(FIELDS.filter(({ key }) => values[key] !== initial[key]).map(({ key }) => [key, values[key]]));
  if (logo !== (row.logo_path ?? "")) changed.logo_path = logo;
  if (onDark !== Boolean(row.logo_on_dark)) changed.logo_on_dark = onDark;

  return (
    <Modal title={`صفحة ${row.name_ar || row.name}`} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#f7f2ea] p-4">
        <span className={`grid h-16 w-32 place-items-center rounded-xl p-2 ${onDark ? "bg-[#14352a]" : "bg-white"}`}>
          {logo ? <img src={`${prefix}${logo}`} alt="" className="max-h-12 max-w-full object-contain" /> : <span className="text-xs text-[#5c6a62]">مفيش لوجو</span>}
        </span>
        <label className="cursor-pointer rounded-full bg-[#c49b5f] px-4 py-2 text-sm font-bold text-white">
          {uploading ? "بيترفع…" : logo ? "غيّر اللوجو" : "ارفع اللوجو"}
          <input type="file" accept="image/png,image/webp,image/jpeg" hidden disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={onDark} onChange={(event) => setOnDark(event.target.checked)} />
          اللوجو فاتح (يتعرض على خلفية غامقة)
        </label>
        <p className="w-full text-xs text-[#5c6a62]">PNG أو WebP بخلفية شفافة، أقل من 3 ميجا. اللوجو ده بيظهر على كل مشاريع الشركة.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, long, dir, hint }) => (
          <label key={key} className={`block text-sm ${long ? "sm:col-span-2" : ""}`}>
            <span className="mb-1 block font-bold">{label}</span>
            {long ? (
              <textarea dir={dir} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} rows={key.startsWith("about") ? 5 : 2} className={inputClass} />
            ) : (
              <input dir={dir} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className={inputClass} />
            )}
            {hint && <span className="mt-1 block text-xs text-[#5c6a62]">{hint}</span>}
            {key.startsWith("seo_description") && <span className="mt-1 block text-xs text-[#5c6a62]">{values[key].length} حرف</span>}
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">إلغاء</button>
        <button
          type="button"
          disabled={busy || uploading || !Object.keys(changed).length}
          onClick={async () => { setBusy(true); await onSave(changed); setBusy(false); }}
          className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "بيحفظ…" : "احفظ"}
        </button>
      </div>
    </Modal>
  );
}
