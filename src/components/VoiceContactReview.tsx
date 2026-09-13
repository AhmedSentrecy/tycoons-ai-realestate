import { useState } from "react";
import { VOICE_INQUIRIES_URL } from "@/lib/voiceRecording";
import type { VoiceDraft } from "@/lib/voiceRecording";

export default function VoiceContactReview({ draft, close }: { draft: VoiceDraft; close: () => void }) {
  const [name,setName]=useState(draft.name);
  const [phone,setPhone]=useState(draft.phone);
  const [summary,setSummary]=useState(draft.summary);
  const [confirmed,setConfirmed]=useState(false);
  const [audio,setAudio]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [saved,setSaved]=useState(false);
  async function submit() {
    let number=phone.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[\s()\-]/g,"");
    if (/^01[0125]\d{8}$/.test(number)) number="+20"+number.slice(1);
    if(number.startsWith("00"))number="+"+number.slice(2);
    if(!/^\+[1-9]\d{7,14}$/.test(number)){setMessage("اكتب رقم الموبايل المصري أو الرقم الدولي بكود الدولة مثل +971.");return;}
    setBusy(true);setMessage("");
    try {
      const form=new FormData();
      form.append("data",JSON.stringify({id:draft.id,name,phone:number,summary,transcript:draft.transcript,confirmed,website:""}));
      if(audio&&draft.audio)form.append("audio",draft.audio,"conversation");
      const response=await fetch(`${VOICE_INQUIRIES_URL}?action=submit`,{method:"POST",body:form});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error==="already_submitted"?"الطلب اتبعت قبل كده؛ متبعتوش تاني. لو مش ظاهر تواصل مع الفريق.":"تعذر حفظ الطلب. البيانات لسه موجودة هنا؛ جرّب لاحقًا أو تواصل واتساب.");
      setSaved(true);
      setMessage(audio&&!data.audio_saved?"بياناتك اتسجلت، لكن رفع الصوت لم ينجح.":"بياناتك وصلت للفريق. شكرًا ليك.");
    } catch(e){setMessage(e instanceof Error?e.message:"تعذر الحفظ");} finally {setBusy(false);}
  }
  return <section role="dialog" aria-modal="true" aria-label="مراجعة بيانات التواصل" dir="rtl" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-h-[85dvh] max-w-lg overflow-auto rounded-2xl border bg-white p-5 text-slate-900 shadow-2xl">
    <h2 className="text-lg font-bold">ملخص محادثتك والمتابعة</h2>
    {saved?<p role="status" className="my-4">{message}</p>:<>
      <p className="my-2 text-sm">راجع اسمك ورقمك قبل إرسال طلب المتابعة. تقدر تقفل النافذة من غير إرسال.</p>
      <label className="block text-sm">الاسم الأول<input maxLength={100} value={name} onChange={e=>setName(e.target.value)} className="mb-2 block w-full rounded border p-2" autoComplete="given-name"/></label>
      <label className="block text-sm">الموبايل / واتساب<input type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} className="mb-2 block w-full rounded border p-2" autoComplete="tel"/></label>
      <label className="block text-sm">ملخص الاحتياج — قابل للتصحيح<textarea maxLength={4000} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="لو الملخص مش جاهز، اكتب أهم احتياج أو سيبه للفريق يراجع المحادثة." className="mb-2 block w-full rounded border p-2"/></label>
      <label className="my-3 flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>الرقم صحيح وأوافق على إرسال بياناتي ونص المحادثة لفريق Tycoons للمتابعة.</label>
      {draft.audio&&<label className="my-3 flex gap-2 text-sm"><input type="checkbox" checked={audio} onChange={e=>setAudio(e.target.checked)}/>إرفاق التسجيل الصوتي أيضًا — اختياري.</label>}
      {draft.incomplete&&<p className="text-xs text-amber-700">التسجيل قد يكون ناقصًا أو غير متاح على جهازك.</p>}
      <p className="text-xs text-slate-500">التسجيل خاص. مراجعة الاحتفاظ بعد 30 يوم؛ لا توجد رسائل تسويقية تلقائية.</p>
      {message&&<p role="alert" className="mt-2 text-sm text-red-700">{message}</p>}
      <button disabled={busy||!confirmed||!name.trim()} onClick={()=>void submit()} className="mt-3 rounded bg-emerald-900 px-4 py-2 text-white disabled:opacity-40">{busy?"جاري الحفظ…":"إرسال طلب المتابعة"}</button>
    </>}
    <button disabled={busy} onClick={close} className="ms-3 mt-3 rounded border px-4 py-2">{saved?"إغلاق":"إغلاق بدون إرسال"}</button>
  </section>;
}
