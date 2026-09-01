import { useEffect, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

const ACTIVITY_API="https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room-lead-activity";
const summaryPromises=new Map<string,Promise<Record<string,any>>>();

function getSummary(token:string){
  if(!summaryPromises.has(token))summaryPromises.set(token,fetch(`${ACTIVITY_API}?summary=1`,{headers:{"x-agent-token":token}}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed: ${r.status}`);return d.summary||{}}));
  return summaryPromises.get(token)!;
}

function fmt(value:any){
  if(!value)return "—";
  try{return new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Cairo",day:"2-digit",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value))}
  catch{return String(value)}
}

function actorName(type:string,lang:"en"|"ar"){
  if(type==="manager")return lang==="ar"?"Manager":"Manager";
  if(type==="owner")return lang==="ar"?"Super Admin":"Super Admin";
  if(type==="system")return lang==="ar"?"System":"System";
  return lang==="ar"?"Agent":"Agent";
}

function activityLabel(a:any,lang:"en"|"ar"){
  const ar=lang==="ar";
  if(a.activity_type==="feedback")return ar?"Feedback / متابعة":"Feedback / Follow-up";
  if(a.activity_type==="stage_change")return ar?"تغيير Stage":"Stage changed";
  if(a.activity_type==="followup_change")return ar?"تعديل المتابعة":"Follow-up changed";
  if(a.activity_type==="edit")return ar?"تعديل بيانات":"Lead edited";
  if(a.activity_type==="legacy_note")return ar?"ملاحظة قديمة":"Previous note";
  return ar?"إضافة Lead":"Lead created";
}

function ActivityBody({a,lang}:{a:any;lang:"en"|"ar"}){
  const ar=lang==="ar";
  if(a.activity_type==="feedback"||a.activity_type==="legacy_note")return <div className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-800">{a.body}</div>;
  if(a.activity_type==="stage_change")return <div className="mt-1 text-sm font-bold text-slate-700">{a.from_stage?`${a.from_stage} → `:""}<span className="font-black text-slate-950">{a.to_stage||"—"}</span></div>;
  if(a.activity_type==="followup_change"){
    const to=a.metadata?.to||{};
    return <div className="mt-1 text-sm font-bold leading-6 text-slate-700">
      <div>{to.next_action||a.body|| (ar?"تم تحديث المتابعة":"Follow-up updated")}</div>
      {(to.next_action_date||to.next_action_time)&&<div className="mt-1 text-xs font-black text-slate-500">{to.next_action_date||""}{to.next_action_time?` · ${String(to.next_action_time).slice(0,5)}`:""}</div>}
      {to.next_action_trigger&&<div className="text-xs text-slate-500">{ar?"Trigger":"Trigger"}: {to.next_action_trigger}</div>}
    </div>;
  }
  if(a.activity_type==="edit")return <div className="mt-1 text-xs font-bold text-slate-600">{ar?"تم تعديل":"Updated"}: {(a.metadata?.fields||[]).join(" · ")||"lead details"}</div>;
  return <div className="mt-1 text-xs font-bold text-slate-600">{ar?"تم إدخال العميل في الـPipeline":"Client entered the pipeline"}</div>;
}

export default function SalesWarRoomLeadActivity({lead,token,lang}:{lead:any;token:string;lang:"en"|"ar"}){
  const [summary,setSummary]=useState<any>(null);
  const [open,setOpen]=useState(false);
  const [activities,setActivities]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [feedback,setFeedback]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  useEffect(()=>{let live=true;getSummary(token).then(s=>{if(live)setSummary(s[String(lead.id)]||{feedback_count:0,last_feedback_at:null,last_activity_at:null})}).catch(()=>{if(live)setSummary({feedback_count:0})});return()=>{live=false}},[token,lead.id]);

  async function load(){
    try{setLoading(true);setError("");const r=await salesWarRoomApi.getLeadActivity(token,String(lead.id));setActivities(r.activities||[]);setSummary((x:any)=>({...x,feedback_count:Number(r.feedback_count||0),last_feedback_at:(r.activities||[]).find((a:any)=>a.activity_type==="feedback")?.created_at||x?.last_feedback_at||null}))}
    catch(e:any){setError(e.message||"activity_error")}finally{setLoading(false)}
  }
  async function toggle(){const next=!open;setOpen(next);if(next&&activities.length===0)await load()}
  async function addFeedback(){
    const text=feedback.trim();if(!text||saving)return;
    try{setSaving(true);setError("");await salesWarRoomApi.addLeadFeedback(token,String(lead.id),text);setFeedback("");setSummary((x:any)=>({...x,feedback_count:Number(x?.feedback_count||0)+1,last_feedback_at:new Date().toISOString(),last_activity_at:new Date().toISOString()}));await load()}
    catch(e:any){setError(e.message||"feedback_error")}finally{setSaving(false)}
  }

  return <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <button type="button" onClick={()=>void toggle()} className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-start">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500">
        <span><b className="text-slate-700">{t("Added","اتضاف")}</b> · {fmt(lead.created_at)}</span>
        <span><b className="text-slate-700">{t("Last update","آخر تعديل")}</b> · {fmt(lead.updated_at)}</span>
        <span className="rounded-full bg-slate-950 px-2.5 py-1 font-black text-white">💬 {Number(summary?.feedback_count||0)} {t("feedbacks","Feedback")}</span>
        {summary?.last_feedback_at&&<span><b className="text-slate-700">{t("Last feedback","آخر Feedback")}</b> · {fmt(summary.last_feedback_at)}</span>}
      </div>
      <span className="text-xs font-black text-slate-700">{open?t("Hide log ↑","اقفل الـLog ↑"):t("Activity & Feedback ↓","Activity & Feedback ↓")}</span>
    </button>

    {open&&<div className="border-t bg-slate-50 p-3">
      <div className="rounded-2xl border bg-white p-3">
        <div className="flex items-center justify-between gap-2"><div className="text-xs font-black">{t("Log a new follow-up / feedback","سجل متابعة / Feedback جديدة")}</div><div className="text-[10px] font-bold text-slate-400">{t("Time is saved automatically","الوقت بيتسجل تلقائي")}</div></div>
        <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder={t("What happened with the client? What was agreed? What is the next context?","إيه اللي حصل مع العميل؟ اتفقتوا على إيه؟ وإيه سياق المتابعة؟")} className="mt-2 min-h-20 w-full resize-y rounded-xl border bg-white p-3 text-sm outline-none focus:border-slate-400"/>
        <div className="mt-2 flex items-center justify-between gap-2">{error?<span className="text-xs font-bold text-red-600">{error}</span>:<span className="text-[10px] font-bold text-slate-400">{t("This becomes a permanent timestamped event.","دي بتتحفظ كـEvent دائمة بتاريخ ووقت.")}</span>}<button disabled={saving||!feedback.trim()} onClick={()=>void addFeedback()} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{saving?t("Saving…","جاري الحفظ…"):t("Add Feedback","أضف Feedback")}</button></div>
      </div>

      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between"><div className="text-xs font-black text-slate-700">{t("Lead Timeline","Timeline العميل")}</div><button onClick={()=>void load()} className="text-[10px] font-black text-slate-500">{t("Refresh","تحديث")}</button></div>
        {loading&&activities.length===0?<div className="rounded-xl bg-white p-4 text-center text-xs font-bold text-slate-400">{t("Loading log…","جاري تحميل الـLog…")}</div>:activities.length===0?<div className="rounded-xl bg-white p-4 text-center text-xs font-bold text-slate-400">{t("No activity yet","مفيش Activity لسه")}</div>:<div className="space-y-2">{activities.map(a=><div key={a.id} className={`rounded-2xl border p-3 ${a.activity_type==="feedback"?"border-amber-200 bg-amber-50":"bg-white"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.08em] text-slate-600">{activityLabel(a,lang)}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">{actorName(a.actor_type,lang)}</span></div>
            <time className="text-[10px] font-black text-slate-400">{fmt(a.created_at)}</time>
          </div>
          <ActivityBody a={a} lang={lang}/>
        </div>)}</div>}
      </div>
    </div>}
  </div>;
}
