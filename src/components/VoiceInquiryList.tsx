import { useEffect, useState } from "react";
import { VOICE_INQUIRIES_URL } from "@/lib/voiceRecording";
type Inquiry = {id:string;name:string;phone:string;summary:string;created_at:string;audio_url:string|null;status:string;pipeline_id:string|null;transcript:{speaker:string;text:string}[]};
export default function VoiceInquiryList({token,owner=false,pipelineId}:{token:string;owner?:boolean;pipelineId?:string}) {
  const [rows,setRows]=useState<Inquiry[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [links,setLinks]=useState<Record<string,string>>({});
  const headers=()=>({[owner?"x-admin-token":"x-agent-token"]:token});
  async function load() {
    setBusy(true);setError("");
    try {
      const r=await fetch(VOICE_INQUIRIES_URL+(pipelineId?`?pipeline_id=${encodeURIComponent(pipelineId)}`:""),{headers:headers()});
      if(!r.ok)throw new Error("تعذر تحميل المحادثات؛ تأكد من صلاحية الدخول.");
      setRows((await r.json()).rows);
    }catch(e){setError(String(e instanceof Error?e.message:e));}finally{setBusy(false);}
  }
  useEffect(()=>{void load();},[token,owner,pipelineId]);
  async function link(id:string) {
    setError("");
    const path=links[id]||"";
    const lead=path.match(/(?:lead\/)?([a-f\d]{8}-[a-f\d-]{27,})/i)?.[1];
    if(!lead){setError("الصق رابط كارت العميل المطلوب ربط المحادثة به.");return;}
    try {
    const r=await fetch(VOICE_INQUIRIES_URL,{method:"PATCH",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({id,pipeline_id:lead})});
    if(!r.ok){setError("تعذر الربط. راجع رابط العميل وصلاحيتك.");return;}
    await load();
    } catch { setError("تعذر الاتصال لحفظ الربط. حاول مرة أخرى."); }
  }
  return <section className="mt-4 space-y-3 rounded-2xl border bg-white p-4 text-slate-900" dir="rtl">
    <div className="flex items-center justify-between gap-2"><h2 className="font-bold">محادثات عملاء المساعد الذكي</h2><button onClick={()=>void load()} disabled={busy} className="rounded border px-3 py-1">{busy?"تحميل…":"تحديث"}</button></div>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!busy&&!rows.length&&!error&&<p className="text-sm text-slate-500">لا توجد محادثات محفوظة بعد.</p>}
    {rows.map(row=><article key={row.id} className="space-y-2 rounded-xl border p-3">
      <h3 className="font-bold">{row.name} · <bdi>{row.phone}</bdi></h3>
      <p className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()} — {row.pipeline_id?"مرتبط بكارت عميل":"بانتظار المراجعة والربط"}</p>
      <p className="whitespace-pre-wrap text-sm">{row.summary||"لم يُجهّز ملخص؛ راجع نص المحادثة."}</p>
      {row.audio_url?<audio key={row.audio_url} src={row.audio_url} controls preload="none" className="w-full" aria-label="تشغيل وإيقاف والتقديم والتأخير في التسجيل" onError={()=>setError("تعذر تشغيل التسجيل؛ اضغط تحديث لتجديد الرابط المؤقت.")}/>:<p className="text-xs text-slate-500">{row.status==="audio_failed"?"تعذر رفع الصوت؛ بيانات التواصل محفوظة.":"لا يوجد صوت متاح أو انتهت فترة إتاحته."}</p>}
      <details><summary className="cursor-pointer text-sm">نص المحادثة — قد يحتوي أخطاء تفريغ</summary><div className="max-h-64 space-y-2 overflow-auto p-2 text-sm">{row.transcript.map((line,i)=><p key={i}><strong>{line.speaker==="client"?"العميل: ":"المساعد: "}</strong>{line.text}</p>)}</div></details>
      {owner&&!pipelineId&&<div className="flex flex-wrap gap-2"><input aria-label="رابط كارت العميل" placeholder="الصق رابط كارت العميل من الـPipeline" value={links[row.id]||""} onChange={e=>setLinks({...links,[row.id]:e.target.value})} className="min-w-0 flex-1 rounded border p-2 text-xs"/><button onClick={()=>void link(row.id)} className="rounded bg-emerald-900 px-3 py-2 text-xs text-white">ربط بالكارت</button></div>}
    </article>)}
  </section>;
}
