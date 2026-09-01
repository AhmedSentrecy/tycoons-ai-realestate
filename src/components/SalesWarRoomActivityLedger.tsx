import { useMemo, useState } from "react";
import SalesWarRoomLeadActivity from "./SalesWarRoomLeadActivity";

const closed=new Set(["Won","Lost / Dead"]);

export default function SalesWarRoomActivityLedger({pipeline,token,lang}:{pipeline:any[];token:string;lang:"en"|"ar"}){
  const [open,setOpen]=useState(true);
  const [query,setQuery]=useState("");
  const [scope,setScope]=useState<"active"|"all">("active");
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;
  const rows=useMemo(()=>[...(pipeline||[])]
    .filter(x=>scope==="all"||!closed.has(String(x.stage||"")))
    .filter(x=>!query.trim()||`${x.client_name||""} ${x.phone||""} ${x.stage||""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b)=>String(b.updated_at||b.created_at||"").localeCompare(String(a.updated_at||a.created_at||""))),[pipeline,query,scope]);

  return <div className="mt-5 border-t pt-4">
    <button type="button" onClick={()=>setOpen(v=>!v)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-start text-white">
      <div><div className="text-[10px] font-black tracking-[.14em] text-slate-400">FOLLOW-UP LOG</div><h3 className="font-black">{t("Lead Activity & Feedback Timeline","Timeline المتابعة والـFeedback")}</h3><div className="mt-1 text-[10px] font-bold text-slate-400">{t("Every feedback, follow-up change and stage movement is timestamped.","كل Feedback وتغيير متابعة أو Stage متسجل بتاريخ ووقت.")}</div></div>
      <span className="text-sm font-black">{open?"▲":"▼"}</span>
    </button>
    {open&&<div className="mt-3 rounded-3xl border bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("Search client / phone / stage","دور باسم العميل / الموبايل / Stage")} className="min-w-[220px] flex-1 rounded-xl border bg-white p-3 text-sm outline-none"/>
        <div className="grid grid-cols-2 rounded-xl border bg-white p-1 text-xs font-black"><button onClick={()=>setScope("active")} className={`rounded-lg px-3 py-2 ${scope==="active"?"bg-slate-950 text-white":""}`}>{t("Active","Active")}</button><button onClick={()=>setScope("all")} className={`rounded-lg px-3 py-2 ${scope==="all"?"bg-slate-950 text-white":""}`}>{t("All","الكل")}</button></div>
      </div>
      <div className="space-y-3">{rows.length?rows.map(x=><div key={x.id} className="rounded-2xl border bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-black text-slate-950">{x.client_name}</div><div className="mt-0.5 text-[10px] font-bold text-slate-400">{x.stage} {x.phone?`· ${x.phone}`:""}</div></div><div className="text-end text-[10px] font-black text-slate-500">{x.next_action_date?`${x.next_action_date}${x.next_action_time?` · ${String(x.next_action_time).slice(0,5)}`:""}`:t("No dated follow-up","مفيش Follow-up بتاريخ")}</div></div>
        <SalesWarRoomLeadActivity lead={x} token={token} lang={lang}/>
      </div>):<div className="p-6 text-center text-sm font-bold text-slate-400">{t("No matching leads","مفيش Leads مطابقة")}</div>}</div>
    </div>}
  </div>;
}
