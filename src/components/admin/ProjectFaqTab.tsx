import { useEffect, useMemo, useState } from "react";
import { adminApi, hideLegacyDuplicates, type AdminProject, type ProjectFaqProposal, type ResearchFaqItem } from "../../lib/adminApi";
import { buildProjectFaq, type FaqItem } from "../../lib/projectFaq";
import { useAdmin } from "./AdminContext";
import { Badge, EmptyState, inputClass } from "./ui";

interface Proposal extends ProjectFaqProposal { include: boolean }

const REASONS: Record<string, string> = {
  commercial: "فيه أسعار أو سداد (دول بيتحسبوا من وحداتك)",
  broker_source: "مصدره موقع سمسار أو مصدر واحد بس",
  single_source: "مصدر واحد مش رسمي",
};

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** Buyer questions per project: the automatic ones (from units) plus researched ones the owner reviews and saves. */
export default function ProjectFaqTab({ projects }: { projects: AdminProject[] }) {
  const { token, notify, handleError } = useAdmin();
  const list = useMemo(
    () => hideLegacyDuplicates(projects).filter((project) => project.slug).sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );
  const [filter, setFilter] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saved, setSaved] = useState<ResearchFaqItem[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [automatic, setAutomatic] = useState<FaqItem[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [excluded, setExcluded] = useState<(ProjectFaqProposal & { reason: string })[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const project = list.find((item) => item.id === projectId) ?? null;
  const shown = list.filter((item) => !filter.trim() || `${item.name} ${item.developer ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase()));

  useEffect(() => {
    if (!project) return;
    let active = true;
    Promise.all([adminApi.projectResearchFaq(token, project.id), adminApi.units(token, project.id)])
      .then(([research, units]) => {
        if (!active) return;
        setSaved(research.items);
        setSavedAt(research.updated_at);
        const available = units.units.filter((unit) => unit.availability_status === "available");
        setAutomatic(buildProjectFaq({ name: project.name, developer: project.developer ?? "", location: project.location ?? "" }, available));
      })
      .catch((error) => { if (active) handleError(error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [project, token, handleError]);

  const choose = (id: string) => {
    setProjectId(id);
    setSaved([]);
    setSavedAt(null);
    setAutomatic([]);
    setProposals([]);
    setExcluded([]);
    setNotes("");
    setLoading(Boolean(id));
  };

  const research = async () => {
    if (!project) return;
    setResearching(true);
    try {
      const result = await adminApi.projectFaqResearch(token, `project_faq:${crypto.randomUUID()}`, project.id);
      const known = new Set(saved.map((item) => item.question));
      setProposals(result.faq.map((item) => ({ ...item, include: !known.has(item.question) })));
      setExcluded(result.excluded);
      setNotes(result.notes);
      if (!result.faq.length) notify("البحث مالقاش معلومات موثوقة كفاية للمشروع ده", "error");
    } catch (error) {
      handleError(error);
    } finally {
      setResearching(false);
    }
  };

  const save = async (items: ResearchFaqItem[]) => {
    if (!project) return;
    setSaving(true);
    try {
      const result = await adminApi.projectResearchFaqSave(token, project.id, items);
      setSaved(result.items);
      setSavedAt(result.updated_at);
      setProposals((current) => current.filter((item) => !result.items.some((kept) => kept.question === item.question)));
      notify(result.rebuilt
        ? "اتحفظت. الموقع بيتحدّث دلوقتي والأسئلة هتظهر في صفحة المشروع خلال دقايق."
        : "اتحفظت. هتظهر في صفحة المشروع مع تحديث الموقع اليومي (الساعة 4 الفجر). لو مستعجل دوس \"حدّث الموقع\".");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const selected = proposals.filter((item) => item.include);
  const merged = [...saved, ...selected.map(({ question, answer, sources }) => ({ question, answer, sources }))]
    .filter((item, index, all) => all.findIndex((other) => other.question === item.question) === index);
  const tooMany = merged.length > 6;
  const update = (index: number, patch: Partial<Proposal>) =>
    setProposals((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div dir="rtl" className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-3xl bg-white p-4">
        <h2 className="font-black">اختار مشروع</h2>
        <input className={`${inputClass} mt-2`} placeholder="دوّر باسم المشروع أو المطور" value={filter} onChange={(event) => setFilter(event.target.value)} />
        <div className="mt-2 max-h-[60vh] overflow-y-auto">
          {shown.map((item) => (
            <button
              key={item.id}
              onClick={() => choose(item.id)}
              className={`block w-full rounded-xl px-3 py-2 text-right text-sm ${item.id === projectId ? "bg-[#0d1f18] text-white" : "hover:bg-[#f7f2ea]"}`}
            >
              <span className="font-bold">{item.name}</span>
              <span className={`block text-xs ${item.id === projectId ? "text-white/70" : "text-[#5c6a62]"}`}>{item.developer} · {item.available_units} وحدة</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        {!project ? (
          <EmptyState title="اختار مشروع من القايمة" text="هتشوف الأسئلة اللي بتطلع أوتوماتيك من الوحدات، وتقدر تعمل بحث يضيف أسئلة زيادة بمصادرها." />
        ) : (
          <>
            <div className="rounded-3xl bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{project.name}</h2>
                  <p className="text-sm text-[#5c6a62]">{project.developer} · {project.location}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.slug && <a href={`/projects/${project.slug}`} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-sm font-bold">افتح صفحة المشروع</a>}
                  <button onClick={() => void research()} disabled={researching || loading} className="rounded-xl bg-[#0d1f18] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                    {researching ? "بيدوّر على النت… (دقيقة تقريبًا)" : "ابحث عن المشروع"}
                  </button>
                </div>
              </div>
            </div>

            {proposals.length > 0 && (
              <div className="rounded-3xl border-2 border-[#a3854e] bg-white p-4">
                <h3 className="font-black">أسئلة جديدة من البحث <span className="text-sm font-normal text-[#5c6a62]">— راجعها وعدّل فيها، وشيل العلامة من اللي مش عايزه</span></h3>
                <div className="mt-3 space-y-3">
                  {proposals.map((item, index) => (
                    <div key={index} className={`rounded-2xl border p-3 ${item.include ? "border-[#e7ddc8]" : "border-dashed opacity-60"}`}>
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <input type="checkbox" checked={item.include} onChange={(event) => update(index, { include: event.target.checked })} />
                        ضيفه للصفحة
                        <Badge tone={item.confidence === "official" ? "ok" : "gold"}>{item.confidence === "official" ? "من موقع المطور" : "موقعين متفقين"}</Badge>
                      </label>
                      <input className={`${inputClass} mt-2 font-bold`} value={item.question} onChange={(event) => update(index, { question: event.target.value })} />
                      <textarea className={`${inputClass} mt-2 min-h-24`} value={item.answer} onChange={(event) => update(index, { answer: event.target.value })} />
                      <p className="mt-1 text-xs text-[#5c6a62]">
                        المصادر:{" "}
                        {item.sources.map((source, i) => (
                          <a key={i} href={source.url} target="_blank" rel="noreferrer" className="ml-2 underline">{hostOf(source.url)}</a>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>
                {excluded.length > 0 && (
                  <details className="mt-3 text-sm text-[#5c6a62]">
                    <summary className="cursor-pointer font-bold">{excluded.length} سؤال اتشال تلقائي</summary>
                    <ul className="mt-2 list-disc pr-5">
                      {excluded.map((item, i) => <li key={i}>{item.question} — {REASONS[item.reason] ?? item.reason}</li>)}
                    </ul>
                  </details>
                )}
                {notes && <p className="mt-2 text-xs text-[#5c6a62]">ملاحظة البحث: {notes}</p>}
                {tooMany && <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm font-bold text-red-700">أقصى عدد 6 أسئلة بحثية للمشروع. شيل العلامة من {merged.length - 6}.</p>}
                <button
                  onClick={() => void save(merged)}
                  disabled={saving || !selected.length || tooMany || selected.some((item) => !item.question.trim() || item.answer.trim().length < 20)}
                  className="mt-3 rounded-xl bg-[#1faa59] px-5 py-2 font-black text-white disabled:opacity-50"
                >
                  {saving ? "بيحفظ…" : `احفظ وانشر (${selected.length})`}
                </button>
              </div>
            )}

            <div className="rounded-3xl bg-white p-4">
              <h3 className="font-black">الأسئلة البحثية المنشورة <span className="text-sm font-normal text-[#5c6a62]">{savedAt ? `— آخر حفظ ${new Date(savedAt).toLocaleDateString("ar-EG")}` : ""}</span></h3>
              {loading ? <p className="mt-2 text-sm">بيحمّل…</p> : saved.length ? (
                <div className="mt-2 space-y-2">
                  {saved.map((item, index) => (
                    <div key={index} className="rounded-2xl bg-[#f7f2ea] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold">{item.question}</p>
                        <button disabled={saving} onClick={() => void save(saved.filter((_, i) => i !== index))} className="shrink-0 rounded-lg border px-2 py-1 text-xs font-bold disabled:opacity-50">شيله</button>
                      </div>
                      <p className="mt-1 text-sm text-[#36423b]">{item.answer}</p>
                      <p className="mt-1 text-xs text-[#5c6a62]">{item.sources.map((source) => hostOf(source.url)).join("، ")}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-2 text-sm text-[#5c6a62]">مفيش لسه. اضغط «ابحث عن المشروع».</p>}
            </div>

            <div className="rounded-3xl bg-white p-4">
              <h3 className="font-black">الأسئلة الأوتوماتيك من الوحدات <span className="text-sm font-normal text-[#5c6a62]">— بتتحدث لوحدها مع كل تحديث للموقع</span></h3>
              {loading ? <p className="mt-2 text-sm">بيحمّل…</p> : automatic.length ? (
                <ul className="mt-2 space-y-2">
                  {automatic.map((item, index) => (
                    <li key={index} className="rounded-2xl border border-[#efe7d8] p-3 text-sm">
                      <p className="font-bold">{item.question}</p>
                      <p className="mt-1 text-[#36423b]">{item.answer}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-[#5c6a62]">المشروع ده مفيهوش وحدات متاحة، فمفيش أسئلة أوتوماتيك.</p>}
              <p className="mt-2 text-xs text-[#5c6a62]">لو المشروع ليه أسئلة متكتبة يدوي قبل كده (زي Mountain View 1.1) بتفضل هي اللي بتظهر.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
