import { useEffect, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

type Props={
  mode:"agent"|"control";
  token:string;
  scope?:"owner"|"manager";
  lang:"en"|"ar";
};

type PeriodKey="current_week"|"last_week"|"current_month"|"last_month";

const money=(n:any)=>{const v=Number(n||0);if(v>=1_000_000_000)return `EGP ${(v/1_000_000_000).toFixed(1)}B`;if(v>=1_000_000)return `EGP ${(v/1_000_000).toFixed(1)}M`;return `EGP ${Math.round(v).toLocaleString()}`};

export default function SalesWarRoomPeriodResults({mode,token,scope="owner",lang}:Props){
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{
        setLoading(true);setError("");
        const r=mode==="agent"?await salesWarRoomApi.getAgentPeriodResults(token):await salesWarRoomApi.getControlPeriodResults(scope,token);
        if(!cancelled)setData(r);
      }catch(e:any){if(!cancelled)setError(e?.message||"period_results_error")}
      finally{if(!cancelled)setLoading(false)}
    }
    if(token)void load();
    return()=>{cancelled=true};
  },[mode,scope,token]);

  if(loading&&!data)return <section className="mt-4 rounded-3xl border bg-white p-5 text-center text-sm font-black text-slate-400">{t("Loading weekly & monthly results…","جاري تحميل النتائج الأسبوعية والشهرية…")}</section>;
  if(error&&!data)return <section className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</section>;
  if(!data)return null;

  const d=data.dates||{};
  const periods:Record<PeriodKey,any>=mode==="agent"?(data.agents?.[0]?.periods||data.team||{}):(data.team||{});
  const meta:Record<PeriodKey,{title:string;range:string;current:boolean}>={
    current_week:{title:t("Current Week","الأسبوع الحالي"),range:`${d.current_week_start||""} → ${d.current_week_end||""}`,current:true},
    last_week:{title:t("Last Week Result","نتيجة الأسبوع اللي فات"),range:`${d.last_week_start||""} → ${d.last_week_end||""}`,current:false},
    current_month:{title:t("Current Month","الشهر الحالي"),range:`${d.current_month_start||""} → ${d.current_month_end||""}`,current:true},
    last_month:{title:t("Last Month Result","نتيجة الشهر اللي فات"),range:`${d.last_month_start||""} → ${d.last_month_end||""}`,current:false},
  };

  const card=(key:PeriodKey)=>{const p=periods[key]||{};const m=meta[key];return <div key={key} className={`rounded-2xl border p-4 ${m.current?"bg-slate-950 text-white":"bg-white text-slate-950"}`}>
    <div className={`text-[10px] font-black uppercase tracking-[.13em] ${m.current?"text-slate-400":"text-slate-400"}`}>{m.title}</div>
    <div className={`mt-1 text-[10px] font-bold ${m.current?"text-slate-400":"text-slate-500"}`}>{m.range}</div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <Mini label="Calls" value={Number(p.calls||0).toLocaleString()} dark={m.current}/>
      <Mini label={t("W / L","W / L")} value={`${Number(p.wins||0)} / ${Number(p.losses||0)}`} dark={m.current}/>
      <Mini label={t("Win Rate","Win Rate")} value={`${Number(p.win_rate||0)}%`} dark={m.current}/>
      <Mini label={t("Potential","Potential")} value={Number(p.potential_cases||0).toLocaleString()} dark={m.current}/>
      <Mini label={t("Meetings","Meetings")} value={Number(p.meetings_held||0).toLocaleString()} dark={m.current}/>
      <Mini label={t("Sales","Sales")} value={money(p.sales_volume)} dark={m.current}/>
    </div>
  </div>};

  if(mode==="agent")return <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><div className="text-[10px] font-black tracking-[.15em] text-slate-400">PERFORMANCE RESULTS</div><h2 className="font-black">{t("Week resets every Saturday","الأسبوع بيتصفر كل يوم سبت")}</h2></div><div className="text-[10px] font-bold text-slate-400">{t("Saturday → Friday · Cairo time","السبت → الجمعة · بتوقيت القاهرة")}</div></div>
    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{(["current_week","last_week","current_month","last_month"] as PeriodKey[]).map(card)}</div>
  </section>;

  const agents=data.agents||[];
  return <section className="mt-4 space-y-3">
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><div className="text-[10px] font-black tracking-[.15em] text-slate-400">TEAM RESULTS</div><h2 className="font-black">{t("Saturday weekly reset + monthly history","نتيجة أسبوعية من السبت + تاريخ شهري")}</h2></div><div className="text-[10px] font-bold text-slate-400">{t("No history is deleted when counters reset","مفيش بيانات بتتمسح وقت التصفير")}</div></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{(["current_week","last_week","current_month","last_month"] as PeriodKey[]).map(card)}</div>
    </div>

    <div className="overflow-x-auto rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-3"><div className="text-[10px] font-black tracking-[.15em] text-slate-400">AGENT RESULTS</div><h3 className="font-black">{t("Weekly & monthly comparison by agent","مقارنة أسبوعية وشهرية لكل Agent")}</h3></div>
      <table className="w-full min-w-[1050px] text-xs">
        <thead><tr className="border-b text-[10px] font-black uppercase text-slate-400"><th className="p-2 text-start">Agent</th><th className="p-2 text-start">{t("Current Week","الأسبوع الحالي")}</th><th className="p-2 text-start">{t("Last Week","الأسبوع اللي فات")}</th><th className="p-2 text-start">{t("Current Month","الشهر الحالي")}</th><th className="p-2 text-start">{t("Last Month","الشهر اللي فات")}</th></tr></thead>
        <tbody>{agents.map((a:any)=>{const p=a.periods||{};return <tr key={a.id} className="border-b last:border-0 align-top"><td className="p-2 font-black">{lang==="ar"?(a.name_ar||a.name_en):a.name_en}</td><PeriodCell p={p.current_week}/><PeriodCell p={p.last_week}/><PeriodCell p={p.current_month}/><PeriodCell p={p.last_month}/></tr>})}</tbody>
      </table>
    </div>
  </section>;
}

function Mini({label,value,dark}:{label:string;value:string;dark:boolean}){return <div className={`rounded-xl p-2 ${dark?"bg-white/10":"bg-slate-50"}`}><div className={`text-[9px] font-black uppercase ${dark?"text-slate-400":"text-slate-400"}`}>{label}</div><div className="mt-0.5 font-black">{value}</div></div>}
function PeriodCell({p}:{p:any}){const x=p||{};return <td className="p-2"><div className="font-black">{Number(x.calls||0).toLocaleString()} Calls</div><div className="mt-1 text-[10px] font-bold text-slate-500">W {Number(x.wins||0)} · L {Number(x.losses||0)} · {Number(x.win_rate||0)}%</div><div className="mt-1 text-[10px] text-slate-400">Potential {Number(x.potential_cases||0)} · Meetings {Number(x.meetings_held||0)} · {money(x.sales_volume)}</div></td>}
