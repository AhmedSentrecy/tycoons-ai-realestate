import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Pencil, Plus, RefreshCw } from "lucide-react";
import {
  adminApi,
  hideLegacyDuplicates,
  type AdminProject,
  type SalesFact,
  type SalesFactCategory,
  type SalesFactInput,
  type SalesFactSource,
  type SalesFactStatus,
} from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { SearchSelect } from "./SearchSelect";
import { Badge, Chip, EmptyState, Modal, inputClass } from "./ui";

const CATEGORY_LABELS: Record<SalesFactCategory, string> = {
  urgency: "ندرة واستعجال",
  offer: "خصومات وأوفرز",
  eoi: "أولوية حجز / EOI",
  track_record: "سابقة أعمال",
  price_history: "حركة الأسعار",
  rental: "إيجار وعائد",
  comparison: "مقارنات",
  customer_story: "قصص عملاء",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as SalesFactCategory[];
const STATUS_LABELS: Record<SalesFactStatus, string> = {
  active: "شغالة (سارة بتقولها)",
  needs_confirmation: "محتاجة تأكيد",
  expired: "خلصت (محفوظة للمقالات)",
  rejected: "مرفوضة",
};
const STATUSES = Object.keys(STATUS_LABELS) as SalesFactStatus[];
const SOURCE_LABELS: Record<SalesFactSource, string> = {
  whatsapp: "واتساب المطور",
  web: "الويب",
  inventory: "مخزون الموقع",
  owner: "أحمد",
  research: "بحث",
};
const STATUS_TONE: Record<SalesFactStatus, "ok" | "pending" | "muted" | "error"> = {
  active: "ok",
  needs_confirmation: "pending",
  expired: "muted",
  rejected: "error",
};

const today = () => new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10);
const day = (value: string | null) => (value ? new Date(value).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "");

const EMPTY: SalesFactInput = { category: "offer", statement_ar: "", source_type: "owner", status: "active", source_date: today() };

/**
 * «معلومات البيع»: every selling point Sara may say, one row each, with its source and end date.
 * Nothing is deleted — «خلصت» keeps it for articles. Sara's file is built from the active rows
 * (plus price-per-meter comparisons computed live from the units on the site).
 */
export default function SalesFactsTab({ projects }: { projects: AdminProject[] }) {
  const { token, notify, handleError } = useAdmin();
  const [status, setStatus] = useState<SalesFactStatus>("active");
  const [category, setCategory] = useState<SalesFactCategory | "">("");
  const [facts, setFacts] = useState<SalesFact[]>([]);
  const [counts, setCounts] = useState<{ status?: Record<string, number>; category_active?: Record<string, number> }>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SalesFactInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi
      .salesFacts(token, { status, category })
      .then((data) => {
        if (!active) return;
        setFacts(data.facts);
        setCounts(data.counts);
      })
      .catch(handleError)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, status, category, handleError, reloadKey]);
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };
  const pickStatus = (next: SalesFactStatus) => {
    if (next === status) return;
    setLoading(true);
    setStatus(next);
  };
  const pickCategory = (next: SalesFactCategory | "") => {
    if (next === category) return;
    setLoading(true);
    setCategory(next);
  };

  const projectOptions = useMemo(
    () => hideLegacyDuplicates(projects).map((row) => ({ value: row.id, label: `${row.name} — ${row.developer ?? ""}`, hint: row.area_group || row.location || "" })),
    [projects],
  );

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    if (!words) return facts;
    return facts.filter((fact) =>
      [fact.statement_ar, fact.project_name, fact.developer, fact.source_label, fact.note].some((value) => (value ?? "").toLowerCase().includes(words)),
    );
  }, [facts, query]);

  async function setFactStatus(fact: SalesFact, next: SalesFactStatus) {
    setBusy(true);
    try {
      await adminApi.salesFactStatus(token, [fact.id], next);
      notify(next === "expired" ? "اتعلّمت إنها خلصت — محفوظة للمقالات" : "اتغيرت الحالة");
      reload();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function save(input: SalesFactInput) {
    setBusy(true);
    try {
      await adminApi.salesFactSave(token, input);
      notify(input.id ? "اتحفظ التعديل" : "اتضافت المعلومة");
      setEditing(null);
      reload();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function downloadSara() {
    setBusy(true);
    try {
      const { markdown } = await adminApi.saraFile(token);
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `sales_essentials_for_sara-${today()}.md`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  const statusCounts = counts.status ?? {};

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-[#e3e9f2] bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="me-auto">
            <h2 className="text-xl font-black">معلومات البيع</h2>
            <p className="text-xs text-[#556070]">
              كل معلومة سارة بتقولها للعميل بمصدرها وآخر يوم ليها. اللي بتخلص ما بتتمسحش — بتفضل محفوظة للمقالات والمحتوى.
            </p>
          </div>
          <button onClick={reload} className="rounded-full border border-[#c9d3e1] p-2" title="تحديث">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => void downloadSara()}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-[#c9d3e1] px-4 py-2 text-sm font-black text-[#9a640f] disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> نزّل ملف سارة
          </button>
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="inline-flex items-center gap-1 rounded-full bg-[#060f1c] px-4 py-2 text-sm font-black text-white"
          >
            <Plus className="h-4 w-4" /> معلومة جديدة
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((value) => (
            <Chip key={value} active={status === value} onClick={() => pickStatus(value)}>
              {STATUS_LABELS[value]} ({statusCounts[value] ?? 0})
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip active={category === ""} onClick={() => pickCategory("")}>
            كل الأنواع
          </Chip>
          {CATEGORIES.map((value) => (
            <Chip key={value} active={category === value} onClick={() => pickCategory(value)}>
              {CATEGORY_LABELS[value]}
            </Chip>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث باسم المشروع أو المطور أو أي كلمة"
          className={`${inputClass} mt-3`}
        />
        {category === "comparison" && status === "active" && (
          <p className="mt-2 rounded-xl bg-[#fff8e8] p-2 text-xs font-bold text-[#7a5a14]">
            المقارنات بسعر المتر بتتحسب لوحدها من الوحدات اللي على الموقع كل مرة تنزّل ملف سارة — مش محتاج تكتبها هنا.
          </p>
        )}
      </div>

      <div className="max-h-[78vh] overflow-auto rounded-3xl border border-[#e3e9f2] bg-white p-4">
        {loading && <p className="p-6 text-center text-sm font-bold">جاري التحميل…</p>}
        {!loading && !shown.length && <EmptyState title="مفيش معلومات هنا" text="غيّر الفلتر أو ضيف معلومة جديدة." />}
        {!loading && shown.length > 0 && (
          <ul className="grid gap-2">
            {shown.map((fact) => {
              const ended = fact.valid_until && fact.valid_until < today();
              return (
                <li key={fact.id} className="rounded-2xl border border-[#ecf0f6] p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={STATUS_TONE[fact.status]}>{STATUS_LABELS[fact.status]}</Badge>
                    <Badge tone="gold">{CATEGORY_LABELS[fact.category]}</Badge>
                    {fact.project_name && <span className="font-black text-[#0f1724]">{fact.project_name}</span>}
                    {fact.valid_until && (
                      <span className={`font-bold ${ended ? "text-red-600" : "text-[#7a5a14]"}`}>لحد {day(fact.valid_until)}</span>
                    )}
                    <span className="me-auto text-[#7b8594]">
                      {SOURCE_LABELS[fact.source_type]}
                      {fact.source_date ? ` · ${day(fact.source_date)}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-7 text-[#0f1724]">{fact.statement_ar}</p>
                  {fact.source_label && <p className="text-xs text-[#556070]">({fact.source_label})</p>}
                  {fact.source_urls?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {fact.source_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#9a640f]" dir="ltr">
                          <ExternalLink className="h-3 w-3" />
                          {new URL(url).hostname.replace(/^www\./, "")}
                        </a>
                      ))}
                    </div>
                  )}
                  {fact.note && <p className="mt-1 text-xs text-[#7b8594]">ملحوظة: {fact.note}</p>}
                  <div className="mt-2 flex flex-wrap justify-end gap-1">
                    <button
                      onClick={() =>
                        setEditing({
                          id: fact.id,
                          category: fact.category,
                          statement_ar: fact.statement_ar,
                          project_id: fact.project_id,
                          project_name: fact.project_name,
                          developer: fact.developer,
                          source_type: fact.source_type,
                          source_label: fact.source_label,
                          source_urls: fact.source_urls,
                          source_date: fact.source_date,
                          valid_until: fact.valid_until,
                          status: fact.status,
                          note: fact.note,
                          kind: fact.kind,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-[#f4f6fa] px-2 py-1 text-xs font-black"
                    >
                      <Pencil className="h-3 w-3" /> تعديل
                    </button>
                    {fact.status !== "active" && (
                      <button disabled={busy} onClick={() => void setFactStatus(fact, "active")} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                        شغّلها
                      </button>
                    )}
                    {fact.status !== "expired" && (
                      <button disabled={busy} onClick={() => void setFactStatus(fact, "expired")} className="rounded-lg bg-[#f4f6fa] px-2 py-1 text-xs font-black">
                        خلصت
                      </button>
                    )}
                    {fact.status !== "rejected" && (
                      <button disabled={busy} onClick={() => void setFactStatus(fact, "rejected")} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-red-600">
                        مرفوضة
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? "تعديل معلومة" : "معلومة بيع جديدة"} onClose={() => setEditing(null)}>
          <FactForm value={editing} projectOptions={projectOptions} busy={busy} onCancel={() => setEditing(null)} onSave={(input) => void save(input)} />
        </Modal>
      )}
    </div>
  );
}

function FactForm({
  value,
  projectOptions,
  busy,
  onCancel,
  onSave,
}: {
  value: SalesFactInput;
  projectOptions: { value: string; label: string; hint: string }[];
  busy: boolean;
  onCancel: () => void;
  onSave: (input: SalesFactInput) => void;
}) {
  const [form, setForm] = useState<SalesFactInput>(value);
  const [urls, setUrls] = useState((value.source_urls ?? []).join("\n"));
  const set = <K extends keyof SalesFactInput>(key: K, next: SalesFactInput[K]) => setForm((current) => ({ ...current, [key]: next }));
  const label = "mb-1 block text-xs font-black text-[#556070]";

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={label}>النوع</span>
          <select value={form.category} onChange={(event) => set("category", event.target.value as SalesFactCategory)} className={inputClass}>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>الحالة</span>
          <select value={form.status} onChange={(event) => set("status", event.target.value as SalesFactStatus)} className={inputClass}>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <span className={label}>المشروع (اختياري)</span>
        <SearchSelect
          options={projectOptions}
          value={form.project_id ?? ""}
          onChange={(next) => set("project_id", next || null)}
          placeholder={form.project_name || "اختار المشروع"}
          emptyLabel="من غير مشروع (منطقة أو مطور أو السوق كله)"
          dir="ltr"
        />
      </div>
      <label>
        <span className={label}>الجملة اللي سارة هتقولها (بالعامية، والشروط بالظبط)</span>
        <textarea value={form.statement_ar} onChange={(event) => set("statement_ar", event.target.value)} rows={4} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className={label}>المصدر</span>
          <select value={form.source_type} onChange={(event) => set("source_type", event.target.value as SalesFactSource)} className={inputClass}>
            {(Object.keys(SOURCE_LABELS) as SalesFactSource[]).map((value) => (
              <option key={value} value={value}>
                {SOURCE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>تاريخ المعلومة</span>
          <input type="date" value={form.source_date ?? ""} onChange={(event) => set("source_date", event.target.value || null)} className={inputClass} />
        </label>
        <label>
          <span className={label}>آخر يوم ليها (لو عرض)</span>
          <input type="date" value={form.valid_until ?? ""} onChange={(event) => set("valid_until", event.target.value || null)} className={inputClass} />
        </label>
      </div>
      <label>
        <span className={label}>المصدر زي ما سارة تقوله بين قوسين (مثلاً: حسب المطور، 2026-11-23)</span>
        <input value={form.source_label ?? ""} onChange={(event) => set("source_label", event.target.value)} className={inputClass} />
      </label>
      <label>
        <span className={label}>روابط المصادر (كل رابط في سطر)</span>
        <textarea value={urls} onChange={(event) => setUrls(event.target.value)} rows={2} className={inputClass} dir="ltr" />
      </label>
      <label>
        <span className={label}>ملحوظة ليك (سارة مش بتشوفها)</span>
        <input value={form.note ?? ""} onChange={(event) => set("note", event.target.value)} className={inputClass} />
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full border border-[#c9d3e1] px-4 py-2 text-sm font-black">
          إلغاء
        </button>
        <button
          disabled={busy || form.statement_ar.trim().length < 3}
          onClick={() => onSave({ ...form, source_urls: urls.split(/\s+/).filter(Boolean) })}
          className="rounded-full bg-[#060f1c] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          احفظ
        </button>
      </div>
    </div>
  );
}
