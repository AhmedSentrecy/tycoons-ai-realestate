import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminProject, type EditorialJob, type EditorialWorkflow } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, EmptyState, inputClass } from "./ui";

type JobInput = { content_type: "project" | "developer" | "phase" | "comparison" | "guide"; primary_entity_id: string; secondary_entity_id: string; area_name: string; topic: string; source_input: string };
const initialInput: JobInput = { content_type: "project", primary_entity_id: "", secondary_entity_id: "", area_name: "", topic: "", source_input: "" };

export default function EditorialWorkflowPanel({ projects }: { projects: AdminProject[] }) {
  const { token, handleError, notify } = useAdmin();
  const [workflow, setWorkflow] = useState<EditorialWorkflow | null>(null);
  const [input, setInput] = useState<JobInput>(initialInput);
  const [busy, setBusy] = useState("");
  // The automated workflow is still disabled by default, so it starts collapsed
  // to keep the manual article editor as the main surface of this tab.
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<{ job: EditorialJob; events: Array<{ id: number; event_type: string; from_status: string | null; to_status: string | null; created_at: string }>; versions: Array<{ id: string; version_number: number; created_at: string }>; articles: Array<{ id: string; language: "ar" | "en"; status: "draft" | "published"; revision: number; content_hash: string }> } | null>(null);
  const refresh = useCallback(async () => {
    try { setWorkflow(await adminApi.editorialWorkflow(token)); } catch (error) { handleError(error); }
  }, [token, handleError]);
  useEffect(() => {
    let active = true;
    adminApi.editorialWorkflow(token)
      .then((next) => { if (active) setWorkflow(next); })
      .catch(handleError);
    return () => { active = false; };
  }, [token, handleError]);

  async function createJob() {
    setBusy("create");
    try {
      await adminApi.editorialJobCreate(token, input);
      setInput(initialInput);
      await refresh();
      notify("تم إنشاء مهمة دائمة في وضع الانتظار. لم يبدأ أي طلب مدفوع ولم يتم النشر.");
    } catch (error) { handleError(error); } finally { setBusy(""); }
  }

  async function retry(id: string) {
    setBusy(id);
    try { await adminApi.editorialJobRetry(token, id); await refresh(); notify("تم وضع المهمة في انتظار إعادة محاولة آمنة."); }
    catch (error) { handleError(error); } finally { setBusy(""); }
  }

  async function openDetail(id: string) {
    setBusy(id);
    try { setDetail(await adminApi.editorialJob(token, id)); } catch (error) { handleError(error); } finally { setBusy(""); }
  }

  async function control(action: "pause" | "resume" | "resolve_exception" | "rollback", extra: Record<string, unknown> = {}) {
    if (!detail?.job.revision) return;
    if (action === "rollback") {
      const ar = detail.articles.find((article) => article.language === "ar");
      const en = detail.articles.find((article) => article.language === "en");
      if (!ar || !en || ar.status !== "draft" || en.status !== "draft") return;
      extra = { ...extra, expected_articles: { ar, en } };
    }
    setBusy(action);
    try { await adminApi.editorialJobControl(token, detail.job.id, action, detail.job.revision, extra); await refresh(); setDetail(await adminApi.editorialJob(token, detail.job.id)); notify("تم تسجيل الإجراء في سجل المهمة."); }
    catch (error) { handleError(error); } finally { setBusy(""); }
  }

  return <section className="mb-5 rounded-3xl border border-[#ded3bd] bg-[#fbf8f2] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-black">تشغيل المحتوى</h2><p className="mt-1 text-sm text-[#5c6a62]">بحث نوعي موثّق → مسودتان عربية وإنجليزية → فحوص → استثناء أو مسار آلي مستقل.</p></div>
      <div className="flex flex-wrap items-center gap-2"><Badge tone="pending">الجدولة متوقفة</Badge>{workflow && <Badge tone="muted">{workflow.jobs.length} مهمة</Badge>}<button onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-lg border bg-white px-3 py-1 text-sm font-bold">{open ? "إخفاء" : "عرض"}</button></div>
    </div>
    {open && <>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <label className="text-sm font-bold">نوع المحتوى<select disabled={Boolean(busy)} className={inputClass} value={input.content_type} onChange={(event) => setInput({ ...input, content_type: event.target.value as JobInput["content_type"], primary_entity_id: "", secondary_entity_id: "" })}><option value="project">مشروع</option><option value="developer">مطور</option><option value="phase">مرحلة</option><option value="comparison">مقارنة</option><option value="guide">دليل شراء</option></select></label>
      {["project", "comparison"].includes(input.content_type) ? <label className="text-sm font-bold">المشروع<select disabled={Boolean(busy)} className={inputClass} value={input.primary_entity_id} onChange={(event) => setInput({ ...input, primary_entity_id: event.target.value })}><option value="">اختر</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : <label className="text-sm font-bold">معرّف المطور/المرحلة<input disabled={Boolean(busy) || input.content_type === "guide"} className={inputClass} value={input.primary_entity_id} onChange={(event) => setInput({ ...input, primary_entity_id: event.target.value })} placeholder={input.content_type === "guide" ? "غير مطلوب" : "معرّف ثابت من سجل الكيانات"} /></label>}
      {input.content_type === "comparison" ? <label className="text-sm font-bold">المشروع الثاني<select disabled={Boolean(busy)} className={inputClass} value={input.secondary_entity_id} onChange={(event) => setInput({ ...input, secondary_entity_id: event.target.value })}><option value="">اختر</option>{projects.filter((project) => project.id !== input.primary_entity_id).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : <label className="text-sm font-bold">المنطقة<input disabled={Boolean(busy)} className={inputClass} value={input.area_name} onChange={(event) => setInput({ ...input, area_name: event.target.value })} /></label>}
      <label className="text-sm font-bold md:col-span-2">السؤال أو نية البحث<input disabled={Boolean(busy)} className={inputClass} value={input.topic} onChange={(event) => setInput({ ...input, topic: event.target.value })} placeholder="مثال: دليل PRK Vie والوحدات التجارية والإدارية والطبية" /></label>
      <label className="text-sm font-bold">معلومة أو رابط مصدر جديد<input disabled={Boolean(busy)} className={inputClass} value={input.source_input} onChange={(event) => setInput({ ...input, source_input: event.target.value })} placeholder="اختياري — يُعامل كبيانات غير موثوقة حتى التحقق" /></label>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3"><button disabled={Boolean(busy) || !input.topic.trim() || (input.content_type !== "guide" && !input.primary_entity_id)} onClick={() => void createJob()} className="rounded-xl bg-[#0d1f18] px-5 py-2 font-black text-white disabled:opacity-50">إنشاء مهمة بدون تشغيل مدفوع</button><span className="text-xs text-[#5c6a62]">الاكتشاف: Flat &amp; Villa وRealEstate.eg. GSC لأداء الموقع فقط. WhatsApp غير موصول.</span></div>

    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="text-start text-[#5c6a62]"><th className="p-2">المهمة</th><th className="p-2">الحالة</th><th className="p-2">الأدلة/الاستثناءات</th><th className="p-2">التكلفة</th><th className="p-2">آخر تحديث</th><th className="p-2">إجراء</th></tr></thead><tbody>{workflow?.jobs.length ? workflow.jobs.map((job) => <tr key={job.id} className="border-t border-[#e7ddc8]"><td className="p-2"><button className="text-start font-black underline" onClick={() => void openDetail(job.id)}>{job.topic}</button><small className="block text-[#5c6a62]">{job.content_type} · {job.current_step}</small></td><td className="p-2"><Badge tone={job.status === "published" ? "ok" : "pending"}>{job.status}</Badge>{job.auto_publish_eligible && <small className="ms-2">فحوص آلية — ليست مراجعة بشرية</small>}</td><td className="p-2">{job.evidence.length} مصدر · {job.exceptions.length} استثناء{job.last_error && <small className="block text-red-700">{job.last_error}</small>}</td><td className="p-2">${(job.cost_used_cents / 100).toFixed(2)} / ${(job.cost_reserved_cents / 100).toFixed(2)}</td><td className="p-2">{new Date(job.updated_at).toLocaleString("ar-EG")}</td><td className="p-2">{["retry_wait","failed","needs_review"].includes(job.status) && job.attempts < 3 ? <button disabled={Boolean(busy)} onClick={() => void retry(job.id)} className="rounded-lg border px-3 py-1 font-bold disabled:opacity-50">إعادة آمنة</button> : "—"}</td></tr>) : <tr><td colSpan={6} className="p-4"><EmptyState title="لا توجد مهام تشغيل بعد" /></td></tr>}</tbody></table></div>
    {detail && <div className="mt-5 rounded-2xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-black">تفاصيل المهمة: {detail.job.topic}</h3><p className="text-xs text-[#5c6a62]">المحاولة {detail.job.attempts} · {detail.job.status} · المراجعة الدلالية مطلوبة قبل أي نشر</p></div><div className="flex gap-2">{detail.job.status === "paused" ? <button disabled={Boolean(busy)} onClick={() => void control("resume")} className="rounded-lg border px-3">استكمال</button> : !["published","publishing","verifying"].includes(detail.job.status) && <button disabled={Boolean(busy)} onClick={() => void control("pause")} className="rounded-lg border px-3">إيقاف</button>}<button onClick={() => setDetail(null)} className="rounded-lg border px-3">إغلاق</button></div></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><h4 className="font-bold">الأدلة والادعاءات</h4><pre dir="ltr" className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f2ea] p-3 text-xs">{JSON.stringify({ evidence: detail.job.evidence, claims: detail.job.claim_evidence, exceptions: detail.job.exceptions }, null, 2)}</pre>{detail.job.status === "needs_review" && <button disabled={Boolean(busy)} onClick={() => void control("resolve_exception", { resolution: { outcome: "acknowledged_not_verified" } })} className="mt-2 rounded-lg border px-3 py-1 text-xs font-bold">تسجيل الاستثناء بدون اعتباره موثّقاً</button>}</div><div><h4 className="font-bold">المعاينة الثنائية</h4><div className="mt-2 max-h-72 overflow-auto rounded-xl bg-[#f7f2ea] p-3"><strong>{detail.job.draft_ar?.title || "لا توجد مسودة عربية بعد"}</strong><p className="mt-2 whitespace-pre-wrap text-sm">{detail.job.draft_ar?.body_markdown}</p><hr className="my-4" /><strong dir="ltr" className="block">{detail.job.draft_en?.title || "No English draft yet"}</strong><p dir="ltr" className="mt-2 whitespace-pre-wrap text-sm">{detail.job.draft_en?.body_markdown}</p></div></div></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><h4 className="font-bold">سجل التدقيق</h4><ul className="mt-2 text-xs">{detail.events.map((event) => <li key={event.id}>{new Date(event.created_at).toLocaleString("ar-EG")} · {event.event_type} · {event.from_status || "—"} → {event.to_status || "—"}</li>)}</ul></div><div><h4 className="font-bold">نسخ المسودة</h4><div className="mt-2 flex flex-wrap gap-2">{detail.versions.map((version) => <button key={version.id} disabled={Boolean(busy)} onClick={() => void control("rollback", { version_id: version.id })} className="rounded-lg border px-3 py-1 text-xs">استعادة v{version.version_number}</button>)}</div></div></div></div>}
    <p className="mt-3 text-xs text-[#5c6a62]">الإعداد الافتراضي المقترح: الاثنين 09:00 بتوقيت Africa/Cairo. لن يعمل حتى إصدار مختبر وتفعيل صريح.</p>
    </>}
  </section>;
}
