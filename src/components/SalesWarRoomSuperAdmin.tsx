import { useEffect, useMemo, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

const stages = ["New Lead","Contacted","Cold","Warm","Hot / Very Potential","Hold","Meeting Scheduled","Meeting Held","Negotiation / Closing","Won","Lost / Dead"];
const stageAr: Record<string,string> = {
  "New Lead":"ليد جديد","Contacted":"تم التواصل","Cold":"Cold","Warm":"Warm","Hot / Very Potential":"Hot / قوي جدًا","Hold":"Hold","Meeting Scheduled":"ميعاد متحدد","Meeting Held":"تم الاجتماع","Negotiation / Closing":"تفاوض / Closing","Won":"مكسب","Lost / Dead":"خسارة / Dead"
};
const fmt=(d:Date)=>d.toISOString().slice(0,10);
const monthStart=()=>{const d=new Date();d.setDate(1);return fmt(d)};
const money=(n:number)=>n>=1_000_000_000?`EGP ${(n/1_000_000_000).toFixed(1)}B`:n>=1_000_000?`EGP ${(n/1_000_000).toFixed(1)}M`:`EGP ${Math.round(n).toLocaleString()}`;

type Tab="overview"|"pipeline"|"agents";

export default function SalesWarRoomSuperAdmin(){
  const tokenKey="warRoomAdminToken";
  const [token,setToken]=useState(()=>localStorage.getItem(tokenKey)||"");
  const [password,setPassword]=useState("");
  const [lang,setLang]=useState<"en"|"ar">((localStorage.getItem("warRoomLang") as "en"|"ar")||"en");
  const [from,setFrom]=useState(monthStart());
  const [to,setTo]=useState(fmt(new Date()));
  const [tab,setTab]=useState<Tab>("overview");
  const [data,setData]=useState<any>(null);
  const [salesTotals,setSalesTotals]=useState<any>(null);
  const [pipeline,setPipeline]=useState<any[]>([]);
  const [pipelineLoaded,setPipelineLoaded]=useState(false);
  const [pipelineLoading,setPipelineLoading]=useState(false);
  const [loading,setLoading]=useState(false);
  const [loggingIn,setLoggingIn]=useState(false);
  const [error,setError]=useState("");
  const [openingSlug,setOpeningSlug]=useState("");
  const [leadAgentFilter,setLeadAgentFilter]=useState("all");
  const [leadStageFilter,setLeadStageFilter]=useState("all");
  const [visibleLimit,setVisibleLimit]=useState(50);
  const [editingId,setEditingId]=useState("");
  const [leadDraft,setLeadDraft]=useState<any>(null);
  const [savingLead,setSavingLead]=useState(false);
  const [newAgent,setNewAgent]=useState({name_en:"",name_ar:"",slug:""});
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  useEffect(()=>{
    document.title="Tycoons Sales War Room Super Admin";
    const m=document.createElement("meta");m.name="robots";m.content="noindex,nofollow,noarchive";document.head.appendChild(m);
    return()=>m.remove();
  },[]);
  useEffect(()=>{localStorage.setItem("warRoomLang",lang);document.documentElement.dir=lang==="ar"?"rtl":"ltr"},[lang]);
  useEffect(()=>{if(token)void loadOverview()},[token,from,to]);
  useEffect(()=>{if(token&&tab==="pipeline"&&!pipelineLoaded&&!pipelineLoading)void loadPipeline()},[tab,token,pipelineLoaded,pipelineLoading]);

  async function login(){
    if(!password||loggingIn)return;
    try{
      setLoggingIn(true);setError("");
      const r=await salesWarRoomApi.adminLogin(password);
      localStorage.setItem(tokenKey,r.token);setToken(r.token);setPassword("");
    }catch(e:any){setError(e.message==="invalid_credentials"?t("Wrong password","الباسورد غير صحيح"):e.message)}
    finally{setLoggingIn(false)}
  }
  function logout(){localStorage.removeItem(tokenKey);setToken("");setData(null);setSalesTotals(null);setPipeline([]);setPipelineLoaded(false);setTab("overview")}

  async function loadOverview(){
    try{
      setLoading(true);setError("");
      const [summary,totals]=await Promise.all([
        salesWarRoomApi.adminSummary(token,from,to),
        salesWarRoomApi.getSalesTotals(token),
      ]);
      setData(summary);setSalesTotals(totals);
    }catch(e:any){
      if(["unauthorized","owner_only"].includes(e.message))logout();
      setError(e.message);
    }finally{setLoading(false)}
  }

  async function loadPipeline(force=false){
    if((pipelineLoaded&&!force)||pipelineLoading)return;
    try{
      setPipelineLoading(true);setError("");
      const r=await salesWarRoomApi.getOwnerPipeline(token);
      setPipeline(r.pipeline||[]);setPipelineLoaded(true);setVisibleLimit(50);
    }catch(e:any){
      if(["unauthorized","owner_only"].includes(e.message))logout();
      setError(e.message);
    }finally{setPipelineLoading(false)}
  }

  async function openAgent(slug:string){
    if(openingSlug)return;
    try{
      setOpeningSlug(slug);setError("");
      const r=await salesWarRoomApi.adminAgentAccess(token,slug);
      localStorage.setItem(`warRoomAgentToken:${slug}`,r.token);
      window.location.href=`/sales-war-room/a/${slug}`;
    }catch(e:any){setError(e.message)}finally{setOpeningSlug("")}
  }

  async function addAgent(){
    if(!newAgent.name_en.trim()||!newAgent.slug.trim())return;
    try{
      setError("");
      const r=await salesWarRoomApi.addAdminAgent(token,newAgent);
      setNewAgent({name_en:"",name_ar:"",slug:""});
      if(r.password)alert(`${t("New agent password","باسورد الـAgent الجديد")}: ${r.password}`);
      await loadOverview();
    }catch(e:any){setError(e.message)}
  }

  function startEdit(x:any){
    setEditingId(x.id);
    setLeadDraft({
      id:x.id,client_name:x.client_name||"",phone:x.phone||"",budget:x.budget||"",stage:x.stage||"New Lead",
      expected_sale_m:x.expected_value?String(Number(x.expected_value)/1_000_000):"",next_action:x.next_action||"",
      next_action_date:x.next_action_date||"",next_action_trigger:x.next_action_trigger||"",notes:x.notes||""
    });
  }
  function cancelEdit(){setEditingId("");setLeadDraft(null)}
  async function saveLead(){
    if(!leadDraft||savingLead)return;
    if(!String(leadDraft.client_name||"").trim())return setError(t("Client name is required.","اسم العميل مطلوب."));
    if(leadDraft.stage==="Warm"&&(!String(leadDraft.next_action||"").trim()||(!leadDraft.next_action_date&&!String(leadDraft.next_action_trigger||"").trim())))return setError(t("Warm requires Next Action plus a Date or Trigger.","Warm لازم يكون له Next Action ومعاه Date أو Trigger."));
    const m=Number(leadDraft.expected_sale_m||0);if(!Number.isFinite(m)||m<0)return setError(t("Expected Sale must be valid.","Expected Sale لازم يكون رقم صحيح."));
    try{
      setSavingLead(true);setError("");
      await salesWarRoomApi.ownerUpdateLead(token,{...leadDraft,expected_value:m*1_000_000,next_action_date:leadDraft.next_action_date||null});
      cancelEdit();await loadPipeline(true);await loadOverview();
    }catch(e:any){setError(e.message)}finally{setSavingLead(false)}
  }

  const rows=useMemo(()=>{
    if(!data)return[];
    return (data.agents||[]).map((a:any)=>{
      const scores=(data.scores||[]).filter((s:any)=>s.agent_id===a.id);
      const pipe=(data.pipeline||[]).filter((p:any)=>p.agent_id===a.id);
      const follow=(data.followups||[]).filter((f:any)=>f.agent_id===a.id);
      let calls=0,wins=0,losses=0,potential=0,meetings=0,sales=0;
      for(const s of scores){for(let i=1;i<=4;i++){calls+=Number(s[`match${i}_calls`]||0);if(s[`match${i}_status`]==="win")wins++;if(s[`match${i}_status`]==="loss")losses++;}potential+=Number(s.potential_cases||0);meetings+=Number(s.meetings_scheduled||0);sales+=Number(s.sales_volume||0)}
      return{...a,calls,wins,losses,potential,meetings,sales,warm:pipe.filter((p:any)=>p.stage==="Warm").length,hot:pipe.filter((p:any)=>p.stage==="Hot / Very Potential").length,overdue:follow.length};
    });
  },[data]);

  const filteredLeads=useMemo(()=>{
    if(!data?.agents)return[];
    const agentMap=new Map((data.agents||[]).map((a:any)=>[a.id,a]));
    const priority=(x:any)=>x.stage==="Hot / Very Potential"?0:x.stage==="Warm"?1:x.stage==="Negotiation / Closing"?2:x.stage==="Meeting Scheduled"?3:4;
    return pipeline.filter((p:any)=>leadAgentFilter==="all"||p.agent_id===leadAgentFilter).filter((p:any)=>leadStageFilter==="all"||p.stage===leadStageFilter).map((p:any)=>({...p,agent:agentMap.get(p.agent_id)})).sort((a:any,b:any)=>priority(a)-priority(b)||String(a.next_action_date||"9999").localeCompare(String(b.next_action_date||"9999")));
  },[pipeline,data,leadAgentFilter,leadStageFilter]);

  if(!token)return <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white" dir={lang==="ar"?"rtl":"ltr"}>
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-6 flex items-center justify-between"><div><div className="text-xs font-black tracking-[.18em] text-slate-400">TYCOONS SALES WAR ROOM</div><h1 className="mt-1 text-2xl font-black">Super Admin</h1></div><button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="rounded-full border border-white/20 px-3 py-2 text-xs font-black">{lang==="ar"?"EN":"عربي"}</button></div>
      <input type="password" autoComplete="current-password" autoCapitalize="none" spellCheck={false} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void login()} placeholder={t("Super Admin password","باسورد Super Admin")} className="w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none"/>
      <button disabled={loggingIn||!password} onClick={()=>void login()} className="mt-3 w-full rounded-xl bg-white p-3 font-black text-slate-950 disabled:opacity-50">{loggingIn?t("Signing in…","جاري الدخول…"):t("Login","دخول")}</button>
      {error&&<div className="mt-3 text-sm text-red-300">{error}</div>}
    </div>
  </main>;

  const teamTotals=salesTotals?.team||{};
  return <main className="min-h-screen bg-[#f3f5f7] text-slate-950" dir={lang==="ar"?"rtl":"ltr"}>
    <div className="mx-auto max-w-[1500px] p-3 pb-24 md:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-black tracking-[.18em] text-slate-500">TYCOONS SALES WAR ROOM</div><h1 className="text-2xl font-black">Super Admin</h1></div><div className="flex gap-2"><button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="rounded-full border bg-white px-4 py-2 text-sm font-black">{lang==="ar"?"EN":"عربي"}</button><button onClick={logout} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">{t("Logout","خروج")}</button></div></header>

      <nav className="sticky top-2 z-30 mb-4 grid grid-cols-3 gap-2 rounded-2xl border bg-white/95 p-2 shadow-sm backdrop-blur">
        {(["overview","pipeline","agents"] as Tab[]).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-xl px-3 py-3 text-xs font-black ${tab===x?"bg-slate-950 text-white":"bg-slate-50"}`}>{x==="overview"?t("Overview","Overview"):x==="pipeline"?t("Pipeline Editor","Pipeline Editor"):t("Agents","Agents")}</button>)}
      </nav>

      {error&&<div className="mb-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}

      {tab==="overview"&&<>
        <section className="grid gap-3 rounded-3xl bg-slate-950 p-4 text-white md:grid-cols-[1fr_auto]"><div><div className="text-xs font-black text-slate-400">{t("TEAM PERFORMANCE WINDOW","فترة أداء الفريق")}</div><div className="mt-2 text-2xl font-black">{from} → {to}</div></div><div className="flex gap-2"><label className="text-xs"><span className="mb-1 block text-slate-400">{t("From","من")}</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="max-w-[145px] rounded-xl bg-white p-2 text-slate-950"/></label><label className="text-xs"><span className="mb-1 block text-slate-400">{t("To","إلى")}</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="max-w-[145px] rounded-xl bg-white p-2 text-slate-950"/></label></div></section>
        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Card title={t("Team Calls","Team Calls")} value={rows.reduce((a:number,r:any)=>a+r.calls,0)}/><Card title={t("Match Wins","Match Wins")} value={rows.reduce((a:number,r:any)=>a+r.wins,0)}/><Card title="Warm Pipeline" value={rows.reduce((a:number,r:any)=>a+r.warm,0)}/><Card title="Hot Leads" value={rows.reduce((a:number,r:any)=>a+r.hot,0)}/></section>
        <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"><MoneyCard title={t("Expected Sales","Expected Sales")} value={money(Number(teamTotals.expected_sales||0))}/><MoneyCard title={t("Won Sales","Won Sales")} value={money(Number(teamTotals.won_sales||0))}/><MoneyCard title={t("Lost Sales","Lost Sales")} value={money(Number(teamTotals.lost_sales||0))}/></section>
        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map((r:any)=><button key={r.id} disabled={Boolean(openingSlug)} onClick={()=>void openAgent(r.slug)} className="rounded-2xl border bg-white p-4 text-start shadow-sm active:scale-[.99] disabled:opacity-60"><div className="flex items-start justify-between"><div><div className="text-lg font-black">{lang==="ar"?r.name_ar:r.name_en}</div><div className="mt-1 text-xs text-slate-500">{openingSlug===r.slug?t("Opening…","جاري الفتح…"):t("Open full dashboard","افتح الداشبورد")}</div></div><span className={`rounded-full px-2 py-1 text-xs font-black ${r.warm<10?"bg-red-50 text-red-600":"bg-emerald-50 text-emerald-700"}`}>Warm {r.warm}</span></div><div className="mt-4 grid grid-cols-3 gap-2"><Mini label="Calls" value={r.calls}/><Mini label="W/L" value={`${r.wins}/${r.losses}`}/><Mini label="Hot" value={r.hot}/></div></button>)}</section>
        {loading&&<div className="mt-3 text-center text-xs font-bold text-slate-400">{t("Refreshing…","جاري التحديث…")}</div>}
      </>}

      {tab==="pipeline"&&<section className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><h2 className="text-lg font-black">Pipeline Editor</h2><p className="text-xs text-slate-500">{t("Loaded only when you open this tab to keep mobile fast.","بيتحمل بس لما تفتح التاب علشان الموبايل يفضل سريع.")}</p></div><button disabled={pipelineLoading} onClick={()=>void loadPipeline(true)} className="rounded-xl border bg-slate-50 px-4 py-2 text-xs font-black">{pipelineLoading?t("Loading…","جاري التحميل…"):t("Refresh Pipeline","Refresh Pipeline")}</button></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><select value={leadAgentFilter} onChange={e=>{setLeadAgentFilter(e.target.value);setVisibleLimit(50)}} className="rounded-xl border p-3 text-sm font-bold"><option value="all">{t("All Agents","كل الـAgents")}</option>{(data?.agents||[]).map((a:any)=><option key={a.id} value={a.id}>{lang==="ar"?a.name_ar:a.name_en}</option>)}</select><select value={leadStageFilter} onChange={e=>{setLeadStageFilter(e.target.value);setVisibleLimit(50)}} className="rounded-xl border p-3 text-sm font-bold"><option value="all">{t("All Stages","كل المراحل")}</option>{stages.map(s=><option key={s} value={s}>{lang==="ar"?stageAr[s]:s}</option>)}</select></div>
        {pipelineLoading&&!pipelineLoaded?<div className="p-10 text-center font-bold text-slate-400">{t("Loading pipeline…","جاري تحميل الـPipeline…")}</div>:<div className="mt-4 space-y-2">{filteredLeads.slice(0,visibleLimit).map((x:any)=>editingId===x.id&&leadDraft?<LeadEdit key={x.id} d={leadDraft} setD={setLeadDraft} lang={lang} t={t} saving={savingLead} onSave={()=>void saveLead()} onCancel={cancelEdit}/>:<div key={x.id} className="rounded-2xl border bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{x.client_name}</div><div className="mt-1 text-xs font-bold text-slate-500">{lang==="ar"?x.agent?.name_ar:x.agent?.name_en} · {lang==="ar"?stageAr[x.stage]:x.stage}</div></div><button onClick={()=>startEdit(x)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">✏️ {t("Edit","تعديل")}</button></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><b>{t("Expected","متوقع")}:</b> {money(Number(x.expected_value||0))}</div><div><b>{t("Follow-up","Follow-up")}:</b> {x.next_action_date||"—"}</div></div><div className="mt-2 text-xs text-slate-600"><b>{t("Next","التالي")}:</b> {x.next_action||"—"}</div></div>)}{pipelineLoaded&&!filteredLeads.length&&<div className="p-10 text-center text-sm font-bold text-slate-400">{t("No matching leads.","مفيش Leads مطابقة.")}</div>}{filteredLeads.length>visibleLimit&&<button onClick={()=>setVisibleLimit(v=>v+50)} className="w-full rounded-xl border bg-white p-3 text-sm font-black">{t("Load 50 more","حمّل 50 كمان")} · {visibleLimit}/{filteredLeads.length}</button>}</div>}
      </section>}

      {tab==="agents"&&<section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map((r:any)=><button key={r.id} onClick={()=>void openAgent(r.slug)} className="rounded-2xl border bg-white p-4 text-start shadow-sm"><div className="font-black">{lang==="ar"?r.name_ar:r.name_en}</div><div className="mt-2 text-xs text-slate-500">Calls {r.calls} · Warm {r.warm} · Hot {r.hot}</div><div className="mt-3 rounded-xl bg-slate-950 p-2 text-center text-xs font-black text-white">{t("Open Dashboard","افتح الداشبورد")}</div></button>)}</div><div className="rounded-3xl border bg-white p-4"><h2 className="font-black">{t("Add User","إضافة User")}</h2><div className="mt-3 grid gap-2 md:grid-cols-4"><input value={newAgent.name_en} onChange={e=>setNewAgent({...newAgent,name_en:e.target.value})} placeholder="English name" className="rounded-xl border p-3"/><input value={newAgent.name_ar} onChange={e=>setNewAgent({...newAgent,name_ar:e.target.value})} placeholder="الاسم بالعربي" className="rounded-xl border p-3"/><input value={newAgent.slug} onChange={e=>setNewAgent({...newAgent,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})} placeholder="fixed-url-slug" className="rounded-xl border p-3"/><button onClick={()=>void addAgent()} className="rounded-xl bg-slate-950 p-3 font-black text-white">{t("Create Agent","إنشاء Agent")}</button></div></div></section>}
    </div>
  </main>
}

function LeadEdit({d,setD,lang,t,saving,onSave,onCancel}:any){return <div className="rounded-2xl border-2 border-slate-400 bg-white p-3"><div className="mb-3 flex items-center justify-between"><div className="font-black">✏️ {t("Edit Lead","تعديل Lead")}</div><button onClick={onCancel} className="rounded-lg border px-3 py-2 text-xs font-black">{t("Cancel","إلغاء")}</button></div><div className="grid gap-2 md:grid-cols-4"><input value={d.client_name} onChange={e=>setD({...d,client_name:e.target.value})} placeholder={t("Client name","اسم العميل")} className="rounded-xl border p-3"/><input value={d.phone} onChange={e=>setD({...d,phone:e.target.value})} placeholder={t("Phone","الموبايل")} className="rounded-xl border p-3"/><input value={d.budget} onChange={e=>setD({...d,budget:e.target.value})} placeholder={t("Budget","الميزانية")} className="rounded-xl border p-3"/><select value={d.stage} onChange={e=>setD({...d,stage:e.target.value})} className="rounded-xl border p-3 font-bold">{stages.map(s=><option key={s} value={s}>{lang==="ar"?stageAr[s]:s}</option>)}</select><label className="text-xs font-black text-slate-500">{t("Expected Sale (M EGP)","Expected Sale بالمليون")}<input type="number" min="0" step="0.1" value={d.expected_sale_m} onChange={e=>setD({...d,expected_sale_m:e.target.value})} className="mt-1 w-full rounded-xl border p-3 text-slate-950"/></label><input value={d.next_action} onChange={e=>setD({...d,next_action:e.target.value})} placeholder={t("Next Action","الخطوة الجاية")} className="rounded-xl border p-3 md:col-span-2"/><input type="date" value={d.next_action_date} onChange={e=>setD({...d,next_action_date:e.target.value})} className="rounded-xl border p-3"/><input value={d.next_action_trigger} onChange={e=>setD({...d,next_action_trigger:e.target.value})} placeholder="Trigger" className="rounded-xl border p-3"/><textarea value={d.notes} onChange={e=>setD({...d,notes:e.target.value})} placeholder={t("Feedback / Notes","الفيدباك / الملاحظات")} className="min-h-[100px] rounded-xl border p-3 md:col-span-3"/><button disabled={saving} onClick={onSave} className="rounded-xl bg-slate-950 p-3 font-black text-white disabled:opacity-50">{saving?t("Saving…","جاري الحفظ…"):t("Save Changes","حفظ التعديل")}</button></div></div>}
function Card({title,value}:any){return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-black text-slate-500">{title}</div><div className="mt-1 text-3xl font-black">{value}</div></div>}
function MoneyCard({title,value}:any){return <div className="rounded-2xl bg-[#10261f] p-4 text-white shadow-sm"><div className="text-xs font-black text-emerald-200">{title}</div><div className="mt-2 text-2xl font-black">{value}</div></div>}
function Mini({label,value}:any){return <div className="rounded-xl bg-slate-50 p-2 text-center"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 font-black">{value}</div></div>}
