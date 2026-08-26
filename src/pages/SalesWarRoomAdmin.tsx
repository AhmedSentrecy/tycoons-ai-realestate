import { useEffect, useMemo, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

const fmt=(d:Date)=>d.toISOString().slice(0,10);
const startOfMonth=()=>{const d=new Date();d.setDate(1);return fmt(d)};
const OWNER_AGENT_SLUG="ahmed-sentrecy";

export default function SalesWarRoomAdmin(){
  const tokenKey="warRoomLimitedAdminToken";
  const [token,setToken]=useState(()=>localStorage.getItem(tokenKey)||"");
  const [password,setPassword]=useState("");
  const [lang,setLang]=useState<"en"|"ar">((localStorage.getItem("warRoomLang") as "en"|"ar")||"en");
  const [from,setFrom]=useState(startOfMonth());
  const [to,setTo]=useState(fmt(new Date()));
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const t=(en:string,arr:string)=>lang==="ar"?arr:en;

  useEffect(()=>{document.title="Tycoons Sales War Room Admin";const m=document.createElement("meta");m.name="robots";m.content="noindex,nofollow,noarchive";document.head.appendChild(m);return()=>m.remove()},[]);
  useEffect(()=>{localStorage.setItem("warRoomLang",lang);document.documentElement.dir=lang==="ar"?"rtl":"ltr"},[lang]);
  useEffect(()=>{if(token)void load()},[token,from,to]);

  async function login(){try{setError("");const r=await salesWarRoomApi.limitedAdminLogin(password);localStorage.setItem(tokenKey,r.token);setToken(r.token);setPassword("")}catch{setError(t("Wrong password","كلمة السر غير صحيحة"))}}
  async function load(){try{setLoading(true);setError("");setData(await salesWarRoomApi.adminSummary(token,from,to))}catch(e:any){if(e.message==="unauthorized"){localStorage.removeItem(tokenKey);setToken("");setData(null)}setError(e.message)}finally{setLoading(false)}}
  function logout(){localStorage.removeItem(tokenKey);setToken("");setData(null)}
  function openAgent(slug:string){if(slug===OWNER_AGENT_SLUG)return;window.open(`/sales-war-room/monitor/${slug}`,"_blank")}

  const rows=useMemo(()=>{
    if(!data)return[];
    return (data.agents||[]).filter((a:any)=>a.slug!==OWNER_AGENT_SLUG).map((a:any)=>{
      const scores=(data.scores||[]).filter((s:any)=>s.agent_id===a.id);
      const pipe=(data.pipeline||[]).filter((p:any)=>p.agent_id===a.id);
      const follow=(data.followups||[]).filter((f:any)=>f.agent_id===a.id);
      let calls=0,wins=0,losses=0,potential=0,meetings=0,sales=0;
      scores.forEach((s:any)=>{for(let i=1;i<=4;i++){calls+=Number(s[`match${i}_calls`]||0);if(s[`match${i}_status`]==="win")wins++;if(s[`match${i}_status`]==="loss")losses++}potential+=Number(s.potential_cases||0);meetings+=Number(s.meetings_scheduled||0);sales+=Number(s.sales_volume||0)});
      return{...a,calls,wins,losses,total:wins+losses,potential,meetings,sales,warm:pipe.filter((p:any)=>p.stage==="Warm").length,hot:pipe.filter((p:any)=>p.stage==="Hot / Very Potential").length,overdue:follow.length};
    });
  },[data]);

  if(!token)return <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white" dir={lang==="ar"?"rtl":"ltr"}><div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-3"><img src="/images/logo.png" alt="Tycoons" className="h-10 w-10 rounded-xl object-contain"/><div><div className="text-xs font-black tracking-[.18em] text-slate-400">TYCOONS SALES WAR ROOM</div><h1 className="text-2xl font-black">{t("Team Admin","Team Admin")}</h1></div></div><button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="rounded-full border border-white/20 px-3 py-2 text-xs font-black">{lang==="ar"?"EN":"عربي"}</button></div><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder={t("Admin password","كلمة سر الأدمن")} className="w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none"/><button onClick={login} className="mt-3 w-full rounded-xl bg-white p-3 font-black text-slate-950">{t("Login","دخول")}</button>{error&&<div className="mt-3 text-sm text-red-300">{error}</div>}</div></main>;

  return <main className="min-h-screen bg-[#f3f5f7] text-slate-950" dir={lang==="ar"?"rtl":"ltr"}><div className="mx-auto max-w-[1600px] p-3 md:p-5">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><img src="/images/logo.png" alt="Tycoons" className="h-10 w-10 rounded-xl object-contain"/><div><div className="text-xs font-black tracking-[.18em] text-slate-500">TYCOONS SALES WAR ROOM</div><h1 className="text-2xl font-black">{t("Team Admin Dashboard","لوحة تحكم الـTeam Admin")}</h1><p className="mt-1 text-xs font-bold text-slate-500">{t("Read-only agent monitoring · phone numbers hidden · no Excel export","متابعة فقط · أرقام التليفونات مخفية · مفيش Excel Export")}</p></div></div><div className="flex items-center gap-2"><button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="rounded-full border bg-white px-4 py-2 text-sm font-black">{lang==="ar"?"EN":"عربي"}</button><button onClick={logout} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">{t("Logout","خروج")}</button></div></header>

    <section className="grid gap-3 rounded-3xl bg-slate-950 p-4 text-white md:grid-cols-[1fr_auto]"><div><div className="text-xs font-black text-slate-400">{t("TEAM PERFORMANCE WINDOW","فترة متابعة أداء الفريق")}</div><div className="mt-2 text-3xl font-black">{from} → {to}</div></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs"><span className="mb-1 block text-slate-400">{t("From","من")}</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-xl bg-white p-2 text-slate-950"/></label><label className="text-xs"><span className="mb-1 block text-slate-400">{t("To","إلى")}</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-xl bg-white p-2 text-slate-950"/></label></div></section>
    {error&&<div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

    <section className="mt-4 grid gap-3 md:grid-cols-4"><Card title={t("Team Calls","مكالمات الفريق")} value={rows.reduce((a:number,r:any)=>a+r.calls,0)}/><Card title={t("Match Wins","Matches مكسب")} value={rows.reduce((a:number,r:any)=>a+r.wins,0)}/><Card title="Warm Pipeline" value={rows.reduce((a:number,r:any)=>a+r.warm,0)}/><Card title={t("Sales Volume","حجم المبيعات")} value={`EGP ${rows.reduce((a:number,r:any)=>a+r.sales,0).toLocaleString()}`}/></section>

    <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map((r:any)=><button key={r.id} onClick={()=>openAgent(r.slug)} className="rounded-2xl border bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-2"><div><div className="text-lg font-black">{lang==="ar"?r.name_ar:r.name_en}</div><div className="mt-1 text-xs font-bold text-emerald-700">👁 {t("Open monitoring dashboard","افتح داشبورد المتابعة")}</div></div><div className={`rounded-full px-2 py-1 text-xs font-black ${r.warm<10?"bg-red-50 text-red-600":"bg-emerald-50 text-emerald-700"}`}>Warm {r.warm}</div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label="Calls" value={r.calls}/><Mini label="W/L" value={`${r.wins}/${r.losses}`}/><Mini label="Hot" value={r.hot}/></div></button>)}</section>

    <section className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="border-b p-4"><h2 className="font-black">{t("Agent Scoreboard","نتيجة الـAgents")}</h2><p className="text-xs text-slate-500">{t("Click an agent name to open the read-only monitoring dashboard.","اضغط على اسم الـAgent عشان تفتح داشبورد المتابعة فقط.")}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[t("Agent","Agent"),"Calls","W/L",t("Win Rate","نسبة الفوز"),"Warm","Hot","Potential","Meetings",t("Overdue","متأخر"),"Sales",t("Monitor","متابعة")].map(x=><th key={x} className="p-3 text-start font-black">{x}</th>)}</tr></thead><tbody>{rows.map((r:any)=><tr key={r.id} className="border-t"><td className="p-3 font-black"><button onClick={()=>openAgent(r.slug)} className="underline decoration-slate-300 underline-offset-4">{lang==="ar"?r.name_ar:r.name_en}</button></td><td className="p-3 font-bold">{r.calls}</td><td className="p-3"><span className="font-black text-emerald-600">{r.wins}W</span> – <span className="font-black text-red-600">{r.losses}L</span></td><td className="p-3">{r.total?Math.round(r.wins/r.total*100):0}%</td><td className={`p-3 font-black ${r.warm<10?"text-red-600":"text-emerald-600"}`}>{r.warm}{r.warm<10?" 🚨":""}</td><td className="p-3 font-black">{r.hot}</td><td className="p-3">{r.potential}</td><td className="p-3">{r.meetings}</td><td className={`p-3 font-black ${r.overdue?"text-red-600":""}`}>{r.overdue}</td><td className="p-3 font-black">EGP {r.sales.toLocaleString()}</td><td className="p-3"><button onClick={()=>openAgent(r.slug)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950">{lang==="ar"?r.name_ar:r.name_en}</button></td></tr>)}</tbody></table></div>{loading&&<div className="p-3 text-xs text-slate-500">{t("Refreshing…","جاري التحديث…")}</div>}</section>

    <section className="mt-4 rounded-3xl border bg-white p-4"><h2 className="font-black">{t("Pipeline Alerts","إنذارات الـPipeline")}</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{rows.filter((r:any)=>r.warm<10).map((r:any)=><button key={r.id} onClick={()=>openAgent(r.slug)} className="rounded-xl border border-red-200 bg-red-50 p-3 text-start text-sm hover:border-red-400"><b>🚨 {lang==="ar"?r.name_ar:r.name_en}</b><div>Warm Pipeline {r.warm}/10</div></button>)}{!rows.some((r:any)=>r.warm<10)&&<div className="text-sm text-slate-500">{t("No red alerts.","مفيش إنذارات حمراء.")}</div>}</div></section>
  </div></main>
}

function Card({title,value}:any){return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-black text-slate-500">{title}</div><div className="mt-1 text-3xl font-black">{value}</div></div>}
function Mini({label,value}:any){return <div className="rounded-xl bg-slate-50 p-2"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 text-base font-black">{value}</div></div>}
