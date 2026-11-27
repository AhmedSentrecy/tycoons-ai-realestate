import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { adminApi, type ExpertCard, type ExpertCardPhase, type ExpertCardRent, type ExpertCardRow, type ExpertCardStatus } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, EmptyState, inputClass } from "./ui";

const STATUS_LABELS: Record<ExpertCardStatus, string> = {
  active: "شغال (سارة والموقع بيستخدموه)",
  draft: "مسودة (محدش بيشوفه)",
  archived: "متقفل",
};
const STATUS_TONE: Record<ExpertCardStatus, "ok" | "pending" | "muted"> = { active: "ok", draft: "pending", archived: "muted" };
const day = (value: string | null) => (value ? new Date(value).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "");
const num = (value: string) => Number(String(value).replace(/[^\d.]/g, "")) || 0;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Short explanation shown at the top of the tab (and in the admin menu). */
export const EXPERT_CARDS_HELP =
  "ملف ثابت لكل مشروع: أنظمة السداد، والإيجار، والعائد، والريسيل، والميزة والعيب. سارة والمساعد الصوتي والبحث وصفحة المشروع بياخدوا أرقامهم منه.";

/**
 * «كروت الخبير»: edit the reviewed card of each project (Supabase project_experts) without code.
 * Sales text (what Sara and the voice assistant say) is edited here; «مصدر الرقم للموقع» is the
 * website-only note (card.evidence). Sara reads the change at once; the site after «حدّث الموقع».
 */
export default function ExpertCardsTab() {
  const { token, notify, handleError } = useAdmin();
  const [rows, setRows] = useState<ExpertCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");
  const [card, setCard] = useState<ExpertCard | null>(null);
  const [status, setStatus] = useState<ExpertCardStatus>("active");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.expertCards(token);
      setRows(data.cards);
      if (!slug && data.cards[0]) pick(data.cards[0]);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    adminApi.expertCards(token)
      .then((data) => {
        if (!active) return;
        setRows(data.cards);
        const first = data.cards[0];
        if (first) { setSlug(first.slug); setCard(clone(first.card)); setStatus(first.status); }
      })
      .catch((error) => { if (active) handleError(error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, handleError]);

  function pick(row: ExpertCardRow) {
    setSlug(row.slug);
    setCard(clone(row.card));
    setStatus(row.status);
  }

  const row = useMemo(() => rows.find((item) => item.slug === slug) ?? null, [rows, slug]);
  const update = (change: (draft: ExpertCard) => void) => setCard((current) => {
    if (!current) return current;
    const next = clone(current);
    change(next);
    return next;
  });

  async function save() {
    if (!card || !slug) return;
    setSaving(true);
    try {
      const result = await adminApi.expertCardSave(token, slug, card, status);
      setRows((current) => current.map((item) => (item.slug === slug ? result.card : item)));
      setCard(clone(result.card.card));
      notify("اتحفظ. سارة بتشوف التعديل على طول، والموقع والبحث والمساعد الصوتي بعد ما تدوس «حدّث الموقع».");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  const phases: ExpertCardPhase[] = card?.payment_plans?.phases ?? [];
  const rents: ExpertCardRent[] = card?.rent?.segments ?? [];
  const resale = card?.resale?.price_per_sqm_egp;

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-2xl border border-[#e3e9f2] bg-white p-5">
        <h2 className="text-xl font-black text-[#0a1628]">كروت الخبير</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#556070]">{EXPERT_CARDS_HELP}</p>
        <p className="mt-1 text-sm leading-relaxed text-[#556070]">
          العروض المؤقتة اللي ليها ميعاد وبتخلص مكانها «معلومات البيع». كلام البيع هنا بيبقى أرقام بس، ومصدر الرقم بيتكتب في «مصدر الرقم للموقع» علشان يظهر في الموقع بس.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {rows.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => pick(item)}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${item.slug === slug ? "border-[#0a1628] bg-[#0a1628] text-white" : "border-[#d8e0ea] bg-white text-[#0a1628]"}`}
          >
            {item.card?.project?.name_ar || item.project_name}
          </button>
        ))}
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-full border border-[#d8e0ea] px-3 py-2 text-sm">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </div>

      {!loading && !rows.length && <EmptyState title="مفيش كروت لسه" text="الكروت بتتعمل بعد مراجعة أرقام المشروع." />}

      {card && row && (
        <div className="space-y-5 rounded-2xl border border-[#e3e9f2] bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-black">{card.project.name_ar}</h3>
            <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge>
            <span className="text-xs text-[#6b7585]">آخر تعديل: {day(row.updated_at)} · نسخة {row.card_version}</span>
          </div>

          <label className="block text-sm font-bold">
            الحالة
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as ExpertCardStatus)}>
              {(Object.keys(STATUS_LABELS) as ExpertCardStatus[]).map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
            </select>
          </label>

          <label className="block text-sm font-bold">
            أهم الحقائق (كل سطر حقيقة، أرقام بس من غير مصدر)
            <textarea
              className={`${inputClass} min-h-[140px]`}
              value={card.summary.key_facts.join("\n")}
              onChange={(event) => update((draft) => { draft.summary.key_facts = event.target.value.split("\n").map((line) => line.trim()).filter(Boolean); })}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold">
              الميزة
              <textarea className={`${inputClass} min-h-[80px]`} value={card.summary.advantage} onChange={(event) => update((draft) => { draft.summary.advantage = event.target.value; })} />
            </label>
            <label className="block text-sm font-bold">
              العيب (بيتقال لو العميل سأل بس)
              <textarea className={`${inputClass} min-h-[80px]`} value={card.summary.disadvantage.text} onChange={(event) => update((draft) => { draft.summary.disadvantage.text = event.target.value; })} />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-black">أنظمة السداد</h4>
              <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-[#126a3b]" onClick={() => update((draft) => {
                draft.payment_plans = { ...(draft.payment_plans ?? {}), phases: [...(draft.payment_plans?.phases ?? []), { phase: "", down_payment: "", years: 8 }] };
              })}>
                <Plus className="h-4 w-4" /> نظام جديد
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {phases.map((phase, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-[#eef2f7] p-3 md:grid-cols-[1.3fr_1.3fr_.6fr_.7fr_1.3fr_auto]">
                  <input className={inputClass} placeholder="المرحلة أو اسم النظام" value={phase.phase} onChange={(event) => update((draft) => { draft.payment_plans!.phases![index].phase = event.target.value; })} />
                  <input className={inputClass} placeholder="المقدم (مثال: 10% + 5%)" value={phase.down_payment} onChange={(event) => update((draft) => { draft.payment_plans!.phases![index].down_payment = event.target.value; })} />
                  <input className={inputClass} placeholder="سنين" value={String(phase.years ?? "")} onChange={(event) => update((draft) => { draft.payment_plans!.phases![index].years = num(event.target.value); })} />
                  <input className={inputClass} placeholder="خصم الكاش" value={phase.cash_discount ?? ""} onChange={(event) => update((draft) => { draft.payment_plans!.phases![index].cash_discount = event.target.value || undefined; })} />
                  <input className={inputClass} placeholder="ملاحظة" value={phase.note ?? ""} onChange={(event) => update((draft) => { draft.payment_plans!.phases![index].note = event.target.value || undefined; })} />
                  <button type="button" aria-label="امسح النظام" onClick={() => update((draft) => { draft.payment_plans!.phases!.splice(index, 1); })}><Trash2 className="h-4 w-4 text-[#b42318]" /></button>
                </div>
              ))}
            </div>
            <label className="mt-2 block text-sm font-bold">
              الاستلام
              <input className={inputClass} value={card.payment_plans?.delivery ?? ""} onChange={(event) => update((draft) => { draft.payment_plans = { ...(draft.payment_plans ?? {}), delivery: event.target.value }; })} />
            </label>
            <label className="mt-2 block text-sm font-bold">
              مصدر أنظمة السداد وتاريخه
              <input className={inputClass} value={card.payment_plans?.source ?? ""} onChange={(event) => update((draft) => { draft.payment_plans = { ...(draft.payment_plans ?? {}), source: event.target.value }; })} />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-black">الإيجار في الشهر</h4>
              <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-[#126a3b]" onClick={() => update((draft) => {
                draft.rent = { ...(draft.rent ?? {}), segments: [...(draft.rent?.segments ?? []), { bedrooms: 3, furnished: false, low_egp: 0, average_egp: 0, high_egp: 0 }] };
              })}>
                <Plus className="h-4 w-4" /> نوع شقة
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {rents.map((seg, index) => (
                <div key={index} className="grid items-center gap-2 rounded-xl border border-[#eef2f7] p-3 md:grid-cols-[.6fr_.9fr_1fr_1fr_1fr_auto]">
                  <input className={inputClass} placeholder="غرف" value={String(seg.bedrooms)} onChange={(event) => update((draft) => { draft.rent!.segments![index].bedrooms = num(event.target.value); })} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={seg.furnished} onChange={(event) => update((draft) => { draft.rent!.segments![index].furnished = event.target.checked; })} /> مفروشة
                  </label>
                  <input className={inputClass} placeholder="أقل سعر" value={String(seg.low_egp)} onChange={(event) => update((draft) => { draft.rent!.segments![index].low_egp = num(event.target.value); })} />
                  <input className={inputClass} placeholder="المتوسط" value={String(seg.average_egp)} onChange={(event) => update((draft) => { draft.rent!.segments![index].average_egp = num(event.target.value); })} />
                  <input className={inputClass} placeholder="أعلى سعر" value={String(seg.high_egp)} onChange={(event) => update((draft) => { draft.rent!.segments![index].high_egp = num(event.target.value); })} />
                  <button type="button" aria-label="امسح النوع" onClick={() => update((draft) => { draft.rent!.segments!.splice(index, 1); })}><Trash2 className="h-4 w-4 text-[#b42318]" /></button>
                </div>
              ))}
            </div>
            <label className="mt-2 block text-sm font-bold">
              مصدر رقم الإيجار للموقع (بيظهر في الموقع بس، مش في كلام سارة)
              <input className={inputClass} value={card.evidence?.rent?.basis ?? ""} onChange={(event) => update((draft) => {
                draft.evidence = { ...(draft.evidence ?? {}), rent: { ...(draft.evidence?.rent ?? {}), basis: event.target.value } };
              })} />
            </label>
          </div>

          {resale && (
            <div>
              <h4 className="font-black">الريسيل (للمتر)</h4>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {(["low", "average", "high"] as const).map((key) => (
                  <input key={key} className={inputClass} placeholder={key === "low" ? "أقل" : key === "average" ? "المتوسط" : "أعلى"} value={String(resale[key] ?? "")}
                    onChange={(event) => update((draft) => { draft.resale!.price_per_sqm_egp![key] = num(event.target.value); })} />
                ))}
              </div>
              <label className="mt-2 block text-sm font-bold">
                مصدر رقم الريسيل للموقع
                <input className={inputClass} value={card.evidence?.resale?.basis ?? ""} onChange={(event) => update((draft) => {
                  draft.evidence = { ...(draft.evidence ?? {}), resale: { ...(draft.evidence?.resale ?? {}), basis: event.target.value } };
                })} />
              </label>
            </div>
          )}

          {card.yield_example && (
            <label className="block text-sm font-bold">
              جملة العائد اللي سارة بتقولها
              <textarea className={`${inputClass} min-h-[90px]`} value={card.yield_example.spoken ?? ""} onChange={(event) => update((draft) => { draft.yield_example = { ...(draft.yield_example ?? {}), spoken: event.target.value }; })} />
            </label>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-[#0a1628] px-5 py-2 font-black text-white disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "بيتحفظ…" : "احفظ الكارت"}
            </button>
            <span className="text-xs text-[#6b7585]">بعد الحفظ دوس «حدّث الموقع» علشان الموقع والبحث والمساعد الصوتي ياخدوا التعديل.</span>
          </div>
        </div>
      )}
    </section>
  );
}
