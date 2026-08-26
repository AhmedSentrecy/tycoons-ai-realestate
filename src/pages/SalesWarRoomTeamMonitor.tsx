import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

const stages = ["New Lead","Contacted","Warm","Hot / Very Potential","Meeting Scheduled","Meeting Held","Negotiation / Closing","Won","Lost / Dead"];
const ar:Record<string,string>={
  "New Lead":"ليد جديد","Contacted":"تم التواصل","Warm":"Warm","Hot / Very Potential":"Hot / قوي جدًا","Meeting Scheduled":"ميعاد متحدد","Meeting Held":"تم الاجتماع","Negotiation / Closing":"تفاوض / Closing","Won":"مكسب","Lost / Dead":"خسارة / Dead"
};

type View = "kanban"|"table"|"calendar";

function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function money(value:any){const n=Number(value||0);if(n>=1_000_000_000){const v=n/1_000_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}B`}if(n>=1_000_000){const v=n/1_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}M`}if(n>=1_000){const v=n/1_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}K`}return `EGP ${n.toLocaleString()}`}

export default function SalesWarRoomTeamMonitor(){
  const {slug=""}=useParams();
  const [lang,setLang]=useState<"en"|"ar">((localStorage.getItem("warRoomLang") as "en"|"ar")||"en");
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [view,setView]=useState<View>("kanban");
  const t=(en:string,arr:string)=>lang==="ar"?arr:en;

  async function load(){
    const token=localStorage.getItem("warRoomLimitedAdminToken")||"";
    if(!token){window.location.href="/sales-war-room/team-admin";return;}
    try{
      setLoading(true);setError("");
      const r=await salesWarRoomApi.teamMonitor(token,slug);
      setData(r);
    }catch(e:any){
      if(e.message==="admin_only"||e.message==="unauthorized"){
        localStorage.removeItem("warRoomLimitedAdminToken");
        window.location.href="/sales-war-room/team-admin";
        return;
      }
      setError(e.message||"monitor_failed");
    }finally{setLoading(false)}
  }

  useEffect(()=>{document.title="Tycoons Agent Monitor";const m=document.createElement("meta");m.name="robots";m.content="noindex,nofollow,noarchive";document.head.appendChild(m);void load();return()=>m.remove()},[slug]);
  useEffect(()=>{localStorage.setItem("warRoomLang",lang);document.documentElement.dir=lang==="ar"?"rtl":"ltr"},[lang]);

  const score=data?.score||{};
  const pipeline=data?.pipeline||[];
  const matches=[1,2,3,4].map(i=>({i,calls:Number(score[`match${i}_calls`]||0),status:score[`match${i}_status`]||"open"}));
  const todayCalls=matches.reduce((a,m)=>a+m.calls,0);
  const todayWins=matches.filter(m=>m.status==="win").length;
  const todayLosses=matches.filter(m=>m.status==="loss").length;
  const warm=pipeline.filter((x:any)=>x.stage==="Warm").length;
  const hot=pipeline.filter((x:any)=>x.stage==="Hot / Very Potential").length;
  const expected=pipeline.filter((x:any)=>["Warm","Hot / Very Potential"].includes(x.stage)).reduce((a:number,x:any)=>a+Number(x.expected_value||0),0);
  const lost=pipeline.filter((x:any)=>x.stage==="Lost / Dead").reduce((a:number,x:any)=>a+Number(x.expected_value||0),0);
  const weekly=useMemo(()=>{const rows=data?.weekScores||[];let calls=0,wins=0,losses=0,potential=0,meetings=0,sales=0;rows.forEach((r:any)=>{for(let i=1;i<=4;i++){calls+=Number(r[`match${i}_calls`]||0);if(r[`match${i}_status`]==="win")wins++;if(r[`match${i}_status`]==="loss")losses++}potential+=Number(r.potential_cases||0);meetings+=Number(r.meetings_scheduled||0);sales+=Number(r.sales_volume||0)});return{calls,wins,losses,potential,meetings,sales,total:wins+losses}},[data]);
  const leaderNames=(items:any[]|undefined)=>items?.length?items.map(x=>lang==="ar"?x.name_ar:x.name_en).join(" + "):t("No leader yet","لسه مفيش متصدر");

  if(loading&&!data)return <main className="grid min-h-screen place-items-center bg-slate-950 text-white">{t("Loading agent monitor…","جاري تحميل متابعة الـAgent…")}</main>;
  if(error&&!data)return <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white"><div className="text-center"><div className="font-black">{t("Monitor unavailable","المتابعة غير متاحة")}</div><div className="mt-2 text-sm text-red-300">{error}</div><button onClick={()=>window.location.href="/sales-war-room/team-admin"} className="mt-4 rounded-xl bg-white px-4 py-2 font-black text-slate-950">{t("Back to Team Admin","الرجوع للـTeam Admin")}</button></div></main>;
  if(!data)return null;

  const name=lang==="ar"?data.agent.name_ar:data.agent.name_en;

  return <main className="min-h-screen bg-[#f3f5f7] text-[#111317]" dir={lang==="ar"?"rtl":"ltr"}>
    <div className="mx-auto max-w-[1600px] p-3 md:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><img src="/images/logo.png" alt="Tycoons" className="h-10 w-10 rounded-xl object-contain"/><div><div className="text-xs font-black tracking-[.2em] text-slate-500">TYCOONS SALES WAR ROOM</div><h1 className="text-2xl font-black">{name}</h1></div></div>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-800">👁 {t("READ ONLY MONITOR","متابعة فقط")}</span><button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="rounded-full border bg-white px-4 py-2 text-sm font-black">{lang==="ar"?"EN":"عربي"}</button><button onClick={()=>window.location.href="/sales-war-room/team-admin"} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">{t("Back to Team Admin","الرجوع للـTeam Admin")}</button></div>
      </header>

      <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">🔒 {t("Monitoring access only. Phone numbers are hidden, Export is disabled, and no changes can be made from this view.","صلاحية متابعة فقط. أرقام التليفونات مخفية، والـExport مقفول، ومفيش أي تعديل من الشاشة دي.")}</div>

      <section className="grid gap-4 rounded-3xl bg-slate-950 p-4 text-white shadow-xl md:grid-cols-[1.15fr_1fr] md:p-6">
        <div className="flex flex-col justify-between gap-6"><div><div className="text-xs font-black tracking-[.18em] text-slate-400">{t("TODAY PERFORMANCE","أداء النهاردة")}</div><div className="mt-4 flex flex-wrap items-end gap-8"><div><div className="text-xs text-slate-400">{t("CALL TARGET","هدف المكالمات")}</div><div className="text-5xl font-black">{todayCalls}<span className="text-2xl text-slate-500">/200</span></div></div><div><div className="text-xs text-slate-400">{t("TODAY'S RECORD","نتيجة اليوم")}</div><div className="text-4xl font-black"><span className="text-emerald-400">{todayWins}W</span> – <span className="text-rose-400">{todayLosses}L</span></div></div></div></div><div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold">{t("Live monitoring — controls are intentionally disabled.","متابعة مباشرة — أدوات التعديل مقفولة عمدًا.")}</div></div>
        <div className="grid grid-cols-2 gap-2">{matches.map(m=><div key={m.i} className="rounded-2xl bg-white p-3 text-slate-950"><div className="flex items-center justify-between text-xs font-black"><span>MATCH {m.i}</span><span className={`rounded-full px-2 py-1 ${m.status==="win"?"bg-emerald-100 text-emerald-700":m.status==="loss"?"bg-rose-100 text-rose-700":"bg-slate-100"}`}>{m.status==="open"?t("LIVE","شغال"):m.status.toUpperCase()}</span></div><div className="mt-2 text-3xl font-black">{m.calls}<span className="text-sm text-slate-400"> / 50</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-slate-950" style={{width:`${m.calls*2}%`}}/></div></div>)}</div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-[1.45fr_.75fr]"><div className="rounded-3xl bg-[#10261f] p-5 text-white"><div className="text-xs font-black tracking-[.14em] text-emerald-200">{name.toUpperCase()} — {t("EXPECTED SALES","المبيعات المتوقعة")}</div><div className="mt-2 text-4xl font-black md:text-5xl">{money(expected)}</div><div className="mt-2 text-xs font-bold text-emerald-100/70">Warm + Hot</div></div><div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900"><div className="text-xs font-black tracking-[.14em] text-red-500">{t("LOST SALES","المبيعات المفقودة")}</div><div className="mt-2 text-4xl font-black">{money(lost)}</div></div></section>

      <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm"><div className="mb-3"><div className="text-xs font-black tracking-[.15em] text-slate-400">{t("TEAM MOTIVATION BOARD","لوحة تحفيز الفريق")}</div><h2 className="text-lg font-black">{t("Who is leading right now?","مين متصدر دلوقتي؟")}</h2></div><div className="grid gap-3 md:grid-cols-2"><Leader title={t("TODAY","النهاردة")} calls={leaderNames(data.leaders?.daily?.calls)} hot={leaderNames(data.leaders?.daily?.hot)} t={t}/><Leader title={t("THIS WEEK","الأسبوع ده")} calls={leaderNames(data.leaders?.weekly?.calls)} hot={leaderNames(data.leaders?.weekly?.hot)} t={t}/></div></section>

      <section className="mt-4 grid gap-3 md:grid-cols-4"><Kpi title="Warm Pipeline" value={`${warm} / 10`} danger={warm<10}/><Kpi title={t("Potential Today","Potential النهاردة")} value={`${score.potential_cases||0} / ~5`}/><Kpi title={t("Weekly Meetings","Meetings الأسبوع")} value={`${weekly.meetings} / 8`} sub={`Hot: ${hot}`}/><Kpi title={t("Weekly Match Score","نتيجة الأسبوع")} value={`${weekly.wins}W / ${weekly.total}`} sub={`${weekly.total?Math.round(weekly.wins/weekly.total*100):0}% ${t("win rate","نسبة فوز")}`}/></section>

      <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">{t("Pipeline View","عرض الـPipeline")}</h2><p className="text-xs text-slate-500">{t("Read-only client monitoring. Phone numbers are not included in the data response.","متابعة العملاء فقط. أرقام التليفونات مش موجودة أصلًا في الداتا الراجعة للأدمن.")}</p></div><select value={view} onChange={e=>setView(e.target.value as View)} className="rounded-xl border bg-white px-3 py-2 text-sm font-black"><option value="kanban">Kanban</option><option value="table">{t("Table","جدول")}</option><option value="calendar">{t("Calendar","تقويم")}</option></select></div>
        {view==="kanban"&&<Kanban pipeline={pipeline} lang={lang} t={t}/>} 
        {view==="table"&&<Table pipeline={pipeline} lang={lang} t={t}/>} 
        {view==="calendar"&&<Calendar pipeline={pipeline} lang={lang} t={t}/>} 
      </section>

      <section className="mt-4 rounded-3xl border bg-white p-4"><h2 className="font-black">{t("Weekly Review","مراجعة الأسبوع")}</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-6"><Metric label="Calls" value={weekly.calls}/><Metric label="Potential" value={weekly.potential}/><Metric label="Wins" value={weekly.wins}/><Metric label="Losses" value={weekly.losses}/><Metric label="Meetings" value={weekly.meetings}/><Metric label="Sales" value={money(weekly.sales)}/></div></section>
    </div>
  </main>
}

function Leader({title,calls,hot,t}:any){return <div className="rounded-2xl border bg-slate-50 p-4"><div className="mb-3 text-xs font-black tracking-[.12em] text-slate-500">{title}</div><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-white p-3"><div className="text-[10px] font-black text-slate-400">🏃 {t("HIGHEST CALLS","أعلى CALLS")}</div><div className="mt-1 text-lg font-black">{calls}</div></div><div className="rounded-xl bg-white p-3"><div className="text-[10px] font-black text-slate-400">🔥 {t("MOST HOT LEADS","أعلى HOT LEADS")}</div><div className="mt-1 text-lg font-black">{hot}</div></div></div></div>}
function Kanban({pipeline,lang,t}:any){return <div className="overflow-x-auto pb-2"><div className="grid min-w-max grid-flow-col auto-cols-[290px] gap-2">{stages.map(stage=><div key={stage} className="min-h-[260px] rounded-2xl border bg-slate-50 p-2"><div className="mb-2 flex items-center justify-between text-xs font-black"><span>{lang==="ar"?ar[stage]:stage}</span><span className="rounded-full bg-white px-2 py-1">{pipeline.filter((x:any)=>x.stage===stage).length}</span></div>{pipeline.filter((x:any)=>x.stage===stage).map((x:any)=><ReadLead key={x.id} x={x} t={t}/>)}</div>)}</div></div>}
function Table({pipeline,lang,t}:any){return <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3 text-start">{t("Client","العميل")}</th><th className="p-3 text-start">{t("Stage","المرحلة")}</th><th className="p-3 text-start">Budget</th><th className="p-3 text-start">{t("Expected Sale","المبيعات المتوقعة")}</th><th className="p-3 text-start">{t("Follow-up Date","تاريخ المتابعة")}</th><th className="p-3 text-start">{t("Next Action","الخطوة الجاية")}</th><th className="p-3 text-start">{t("Feedback","الفيدباك")}</th></tr></thead><tbody>{pipeline.map((x:any)=><tr key={x.id} className="border-t"><td className="p-3 font-black">{x.client_name}</td><td className="p-3 font-bold">{lang==="ar"?ar[x.stage]:x.stage}</td><td className="p-3">{x.budget||"—"}</td><td className="p-3 font-black">{x.expected_value?money(x.expected_value):"—"}</td><td className="p-3" dir="ltr">{x.next_action_date||"—"}</td><td className="max-w-[260px] p-3 text-xs">{x.next_action||"—"}</td><td className="max-w-[340px] p-3 text-xs"><div className="max-h-24 overflow-y-auto whitespace-pre-wrap">{x.notes||"—"}</div></td></tr>)}</tbody></table></div>}
function Calendar({pipeline,lang,t}:any){const dated=[...pipeline].filter((x:any)=>x.next_action_date).sort((a:any,b:any)=>a.next_action_date.localeCompare(b.next_action_date));const groups=dated.reduce((a:Record<string,any[]>,x:any)=>{(a[x.next_action_date]||=[]).push(x);return a},{});return <div className="space-y-3">{Object.entries(groups).map(([date,rows])=><div key={date} className={`rounded-2xl border p-3 ${date<todayLocal()?"border-red-300 bg-red-50":date===todayLocal()?"border-amber-300 bg-amber-50":"bg-slate-50"}`}><div className="mb-2 font-black" dir="ltr">{date}</div><div className="grid gap-2 md:grid-cols-2">{(rows as any[]).map(x=><div key={x.id} className="rounded-xl border bg-white p-3"><div className="font-black">{x.client_name}</div><div className="mt-1 text-xs font-bold text-slate-500">{lang==="ar"?ar[x.stage]:x.stage}</div><div className="mt-2 text-xs">{x.next_action||"—"}</div></div>)}</div></div>)}{!dated.length&&<div className="rounded-2xl border border-dashed p-8 text-center text-sm font-bold text-slate-400">{t("No dated follow-ups yet.","مفيش Follow-ups بتاريخ لسه.")}</div>}</div>}
function ReadLead({x,t}:any){const due=x.next_action_date===todayLocal();const overdue=x.next_action_date&&x.next_action_date<todayLocal();return <div className={`mb-2 rounded-xl border bg-white p-3 ${overdue?"border-red-300":due?"border-amber-300":""}`}><div className="font-black">{x.client_name}</div>{x.expected_value?<div className="mt-2 text-xs font-black text-emerald-700">{t("Expected","متوقع")}: {money(x.expected_value)}</div>:null}{x.budget?<div className="mt-2 text-xs text-slate-500"><b>Budget:</b> {x.budget}</div>:null}{(x.next_action||x.next_action_date||x.next_action_trigger)&&<div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-5"><b>{t("Next Action","الخطوة الجاية")}:</b> {x.next_action||"—"}{x.next_action_date?<><br/><b>{t("Date","التاريخ")}:</b> <span dir="ltr">{x.next_action_date}</span></>:null}{x.next_action_trigger?<><br/><b>Trigger:</b> {x.next_action_trigger}</>:null}</div>}{x.notes?<div className="mt-2 whitespace-pre-wrap break-words rounded-lg border p-2 text-xs text-slate-600">{x.notes}</div>:null}</div>}
function Kpi({title,value,sub,danger=false}:any){return <div className={`rounded-2xl border bg-white p-4 ${danger?"border-red-400":""}`}><div className="text-xs font-black text-slate-500">{title}</div><div className={`mt-1 text-3xl font-black ${danger?"text-red-600":""}`}>{value}</div>{sub&&<div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>}</div>}
function Metric({label,value}:any){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-black">{value}</div></div>}
