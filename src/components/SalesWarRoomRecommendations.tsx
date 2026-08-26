import { useEffect, useMemo, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

type Recommendation = {
  id:string;
  project_slug?:string;
  project_name:string;
  developer:string;
  location:string;
  unit_type:string;
  bedrooms_text?:string;
  area_sqm?:number|null;
  starting_price:number;
  down_payment_text?:string;
  installments_text?:string;
  delivery_text?:string;
  finishing?:string;
  match_score:number;
  reasons:string[];
};

type RecommendationResponse = {
  lead:any;
  intent:any;
  ai:{used:boolean;reason?:string;model?:string|null};
  recommendations:Recommendation[];
};

function money(value:any){
  const n=Number(value||0);
  if(n>=1_000_000_000){const v=n/1_000_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}B`}
  if(n>=1_000_000){const v=n/1_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}M`}
  return `EGP ${Math.round(n).toLocaleString()}`;
}

function pathSlug(){
  const m=window.location.pathname.match(/^\/sales-war-room\/a\/([^/]+)/);
  return m?decodeURIComponent(m[1]):"";
}

export default function SalesWarRoomRecommendations(){
  const slug=pathSlug();
  const sessionKey=slug?`warRoomAgentToken:${slug}`:"";
  const [open,setOpen]=useState(false);
  const [pipeline,setPipeline]=useState<any[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [result,setResult]=useState<RecommendationResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [loadingPipeline,setLoadingPipeline]=useState(false);
  const [error,setError]=useState("");
  const [lang,setLang]=useState<"en"|"ar">((localStorage.getItem("warRoomLang") as "en"|"ar")||"en");
  const [sessionReady,setSessionReady]=useState(()=>Boolean(sessionKey&&localStorage.getItem(sessionKey)));
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  useEffect(()=>{
    if(!slug)return;
    const sync=()=>{
      const next=(localStorage.getItem("warRoomLang") as "en"|"ar")||"en";
      setLang(next);
      setSessionReady(Boolean(localStorage.getItem(`warRoomAgentToken:${slug}`)));
    };
    sync();
    const id=window.setInterval(sync,750);
    return()=>window.clearInterval(id);
  },[slug]);

  async function loadPipeline(){
    if(!slug)return;
    const token=localStorage.getItem(`warRoomAgentToken:${slug}`)||"";
    if(!token){setError(t("Open the agent dashboard first.","افتح داشبورد الـAgent الأول."));return;}
    try{
      setLoadingPipeline(true);setError("");
      const data=await salesWarRoomApi.getAgent(slug,token);
      const active=(data.pipeline||[]).filter((x:any)=>!["Won","Lost / Dead"].includes(x.stage));
      const priority=(x:any)=>x.stage==="Hot / Very Potential"?0:x.stage==="Warm"?1:2;
      active.sort((a:any,b:any)=>priority(a)-priority(b)||Number(b.expected_value||0)-Number(a.expected_value||0));
      setPipeline(active);
      if(!selectedId&&active.length)setSelectedId(active[0].id);
    }catch(e:any){setError(e.message||"load_failed")}
    finally{setLoadingPipeline(false)}
  }

  useEffect(()=>{if(open&&sessionReady)void loadPipeline()},[open,slug,sessionReady]);
  useEffect(()=>{setResult(null);setError("")},[selectedId]);

  const selected=useMemo(()=>pipeline.find(x=>x.id===selectedId),[pipeline,selectedId]);

  async function recommend(){
    if(!selectedId||!slug)return;
    const token=localStorage.getItem(`warRoomAgentToken:${slug}`)||"";
    if(!token)return setError(t("Agent session not found.","جلسة الـAgent مش موجودة."));
    try{
      setLoading(true);setError("");
      const r=await salesWarRoomApi.getRecommendations(token,selectedId,false);
      setResult(r);
    }catch(e:any){setError(e.message||"recommendation_failed")}
    finally{setLoading(false)}
  }

  if(!slug||!sessionReady)return null;

  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-5 end-5 z-[90] rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-2xl ring-4 ring-white/70 transition hover:-translate-y-0.5">
      ✨ {t("Smart Match","Smart Match")}
    </button>

    {open&&<div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[2px]" onClick={()=>setOpen(false)}>
      <aside onClick={e=>e.stopPropagation()} className="absolute inset-y-0 end-0 flex w-full max-w-[720px] flex-col overflow-hidden bg-[#f5f7f8] shadow-2xl" dir={lang==="ar"?"rtl":"ltr"}>
        <div className="flex items-start justify-between border-b bg-white p-4 md:p-5">
          <div>
            <div className="text-xs font-black tracking-[.16em] text-emerald-700">TYCOONS SMART MATCH</div>
            <h2 className="mt-1 text-2xl font-black">{t("Lead → Website Inventory","الـLead → Inventory الموقع")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("Expected Sale + feedback + budget are matched against live available units.","Expected Sale + الفيدباك + الميزانية بيتقارنوا بالوحدات الـAvailable على الموقع.")}</p>
          </div>
          <button onClick={()=>setOpen(false)} className="rounded-full border bg-white px-3 py-2 text-sm font-black">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <label className="text-xs font-black text-slate-500">{t("CLIENT","العميل")}</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="min-w-0 flex-1 rounded-xl border bg-white p-3 text-sm font-bold">
                {!pipeline.length&&<option value="">{loadingPipeline?t("Loading…","جاري التحميل…"):t("No active leads","مفيش Leads نشطة")}</option>}
                {pipeline.map((x:any)=><option key={x.id} value={x.id}>{x.client_name} · {x.stage} · {money(x.expected_value)}</option>)}
              </select>
              <button disabled={!selectedId||loading} onClick={recommend} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                {loading?t("Matching…","جاري المطابقة…"):t("Find Best Units","طلع أفضل وحدات")}
              </button>
            </div>
            {selected&&<>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                <Info label={t("Expected Sale","Expected Sale")} value={money(selected.expected_value)}/>
                <Info label={t("Budget","Budget")} value={selected.budget||"—"}/>
                <Info label={t("Stage","Stage")} value={selected.stage}/>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black tracking-[.12em] text-slate-400">{t("CLIENT FEEDBACK","فيدباك العميل")}</div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800">{selected.notes||t("No feedback added yet.","مفيش Feedback متسجل لسه.")}</div>
                {(selected.next_action||selected.next_action_date||selected.next_action_trigger)&&<div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <Info label={t("Next Action","Next Action")} value={selected.next_action||"—"}/>
                  <Info label={t("Follow-up Date","Follow-up Date")} value={selected.next_action_date||"—"}/>
                  <Info label={t("Trigger","Trigger")} value={selected.next_action_trigger||"—"}/>
                </div>}
              </div>
            </>}
          </div>

          {error&&<div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

          {result&&<>
            <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><div className="text-xs font-black text-slate-400">{t("WHAT THE SYSTEM UNDERSTOOD","السيستم فهم إيه")}</div><div className="mt-1 font-black">{result.intent?.summary||t("Structured from price + feedback + follow-up context","اتحللت من السعر + الفيدباك + سياق المتابعة")}</div></div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black ${result.ai?.used?"bg-violet-100 text-violet-700":"bg-emerald-100 text-emerald-700"}`}>{result.ai?.used?`AI · ${result.ai.model||"ON"}`:t("SMART MATCH","SMART MATCH")}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {result.intent?.target_price>0&&<Chip>{t("Target","Target")}: {money(result.intent.target_price)}</Chip>}
                {(result.intent?.locations||[]).map((x:string)=><Chip key={x}>📍 {x}</Chip>)}
                {(result.intent?.unit_types||[]).map((x:string)=><Chip key={x}>🏠 {x}</Chip>)}
                {result.intent?.bedrooms&&<Chip>🛏 {result.intent.bedrooms}</Chip>}
                {result.intent?.ready_to_move&&<Chip>⚡ {t("Ready to move","استلام قريب/فوري")}</Chip>}
                {result.intent?.finished&&<Chip>✨ {t("Finished","متشطب")}</Chip>}
                {result.intent?.low_down_payment&&<Chip>💳 {t("Low DP","مقدم قليل")}</Chip>}
              </div>
              {!result.ai?.used&&<p className="mt-3 text-[11px] text-slate-400">{t("AI intent parsing is ready in the backend; until an OpenAI API key is connected, the live system uses deterministic smart matching.","طبقة فهم الـAI جاهزة في الـbackend؛ لحد ما نوصل OpenAI API key، النسخة الـLive بتستخدم Smart Matching ثابت ومراجع.")}</p>}
            </div>

            <div className="mt-4 flex items-end justify-between"><div><div className="text-xs font-black text-slate-400">TOP MATCHES</div><h3 className="text-xl font-black">{t("Recommended Units","الوحدات المقترحة")}</h3></div><div className="text-xs font-bold text-slate-500">{result.recommendations?.length||0} / 5</div></div>
            <div className="mt-2 space-y-3">
              {(result.recommendations||[]).map((r:Recommendation)=><RecommendationCard key={r.id} r={r} t={t}/>) }
              {!result.recommendations?.length&&<div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm font-bold text-slate-400">{t("No strong match found yet.","لسه مفيش Match قوي كفاية.")}</div>}
            </div>
          </>}
        </div>
      </aside>
    </div>}
  </>
}

function Info({label,value}:any){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black text-slate-400">{label}</div><div className="mt-1 font-black">{value}</div></div>}
function Chip({children}:any){return <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{children}</span>}
function RecommendationCard({r,t}:any){
  const url=r.project_slug?`/projects/${r.project_slug}`:`/search?q=${encodeURIComponent(r.project_name)}`;
  return <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-lg font-black">{r.project_name}</div><div className="mt-0.5 text-xs font-bold text-slate-500">{r.developer} · {r.location}</div></div>
      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-emerald-800"><div className="text-[9px] font-black">MATCH</div><div className="text-xl font-black">{r.match_score}%</div></div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <Info label={t("TYPE","النوع")} value={r.unit_type||"—"}/>
      <Info label={t("PRICE","السعر")} value={money(r.starting_price)}/>
      <Info label={t("DOWN PAYMENT","المقدم")} value={r.down_payment_text||"—"}/>
      <Info label={t("INSTALLMENTS","التقسيط")} value={r.installments_text||"—"}/>
    </div>
    {(r.bedrooms_text||r.delivery_text||r.finishing)&&<div className="mt-2 text-xs text-slate-500">{[r.bedrooms_text,r.delivery_text,r.finishing].filter(Boolean).join(" · ")}</div>}
    {!!r.reasons?.length&&<div className="mt-3 rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black text-slate-400">{t("WHY IT MATCHES","ليه مناسب")}</div><div className="mt-1 flex flex-wrap gap-1.5">{r.reasons.map((reason:string)=><span key={reason} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-700">✓ {reason}</span>)}</div></div>}
    <a href={url} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl bg-slate-950 px-4 py-3 text-center text-xs font-black text-white">{t("Open Project on Website","افتح المشروع على الموقع")} ↗</a>
  </div>
}
