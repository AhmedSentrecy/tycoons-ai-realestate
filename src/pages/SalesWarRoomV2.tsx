import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";
import { formatSalesEgp, normalizeSalesValue, salesInputToEgp, salesValueToMillions } from "../lib/salesWarRoomMoney";

/* ------------------------------------------------------------------ */
/* Sales War Room — Version 2 ("My clients", follow-up first)          */
/* Uses exactly the same data and login as the classic version.        */
/* ------------------------------------------------------------------ */

const LEAD_ACTIVITY_API = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room-lead-activity";
const VERSION_KEY = "warRoomVersion";

const stages = ["New Lead","Contacted","Cold","Warm","Hot / Very Potential","Hold","Meeting Scheduled","Meeting Held","Negotiation / Closing","Won","Lost / Dead"];
const closedStages = ["Won","Lost / Dead"];
const arStage: Record<string,string> = {
  "New Lead":"ليد جديد","Contacted":"تم التواصل","Cold":"Cold","Warm":"Warm","Hot / Very Potential":"Hot","Hold":"Hold","Meeting Scheduled":"ميعاد متحدد","Meeting Held":"تم الاجتماع","Negotiation / Closing":"تفاوض / Closing","Won":"مكسب","Lost / Dead":"خسارة / Dead"
};
const shortStage: Record<string,string> = { "Hot / Very Potential":"Hot","Negotiation / Closing":"Negotiation","Meeting Scheduled":"Meeting","Meeting Held":"Met","Lost / Dead":"Lost" };
const stageTone: Record<string,string> = {
  "New Lead":"border-slate-300 bg-slate-50 text-slate-700",
  "Contacted":"border-slate-300 bg-slate-50 text-slate-700",
  "Cold":"border-sky-200 bg-sky-50 text-sky-800",
  "Warm":"border-amber-300 bg-amber-50 text-amber-800",
  "Hot / Very Potential":"border-orange-300 bg-orange-50 text-orange-800",
  "Hold":"border-slate-300 bg-slate-100 text-slate-600",
  "Meeting Scheduled":"border-blue-200 bg-blue-50 text-blue-800",
  "Meeting Held":"border-blue-200 bg-blue-50 text-blue-800",
  "Negotiation / Closing":"border-violet-200 bg-violet-50 text-violet-800",
  "Won":"border-emerald-300 bg-emerald-50 text-emerald-800",
  "Lost / Dead":"border-red-200 bg-red-50 text-red-700"
};

const outcomes = [
  { en:"No answer", ar:"مردش" },
  { en:"Answered", ar:"رد" },
  { en:"Sent details", ar:"بعت تفاصيل" },
  { en:"Meeting booked", ar:"حجز ميعاد" },
  { en:"Not interested", ar:"مش مهتم" },
];

type View = "followups"|"table"|"stages"|"calendar"|"board";
type Lang = "en"|"ar";
type Draft = { client_name:string; phone:string; budget:string; expected_value:string; stage:string; next_action:string; next_action_date:string; next_action_time:string; next_action_trigger:string; notes:string };
const emptyDraft: Draft = { client_name:"",phone:"",budget:"",expected_value:"",stage:"New Lead",next_action:"",next_action_date:"",next_action_time:"",next_action_trigger:"",notes:"" };

/* ---------------- helpers ---------------- */
function pad(n:number){return String(n).padStart(2,"0")}
function toYmd(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function todayLocal(){return toYmd(new Date())}
function addDays(n:number){const d=new Date();d.setDate(d.getDate()+n);return toYmd(d)}
function nextWeekday(){const d=new Date();d.setDate(d.getDate()+7);return toYmd(d)}
function phoneForCall(phone:string){return String(phone||"").replace(/[^\d+]/g,"")}
function phoneForWhatsApp(phone:string){let digits=String(phone||"").replace(/\D/g,"");if(digits.startsWith("00"))digits=digits.slice(2);if(/^01\d{9}$/.test(digits))digits=`20${digits.slice(1)}`;return digits}
function isTouchDevice(){try{return window.matchMedia("(pointer: coarse)").matches}catch{return false}}
function whatsappLink(phone:string){const n=phoneForWhatsApp(phone);if(!n)return "";return isTouchDevice()?`whatsapp://send?phone=${n}`:`https://web.whatsapp.com/send?phone=${n}`}
function timeShort(v:any){return String(v||"").slice(0,5)}
function parseCairoWall(text:any){
  const s=String(text||"").trim();if(!s)return null;
  const d=new Date(s.replace(" ","T"));return Number.isNaN(d.getTime())?null:d;
}
function lastTouchDate(lead:any,summary:any){
  const cands=[summary?.last_activity_at,summary?.last_feedback_at,lead.updated_at,lead.created_at].map(v=>v?new Date(v):null);
  const crm=parseCairoWall(lead.crm_last_feedback_at_cairo);if(crm)cands.push(crm);
  const valid=cands.filter((d):d is Date=>Boolean(d)&&!Number.isNaN((d as Date).getTime()));
  if(!valid.length)return null;
  return valid.reduce((a,b)=>a>b?a:b);
}
function daysSince(d:Date|null){if(!d)return null;return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000))}
function touchLabel(d:Date|null,lang:Lang){
  if(!d)return "—";
  const mins=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
  if(mins<60)return lang==="ar"?`من ${mins} د`:`${mins}m ago`;
  const hrs=Math.floor(mins/60);
  if(hrs<24)return lang==="ar"?`من ${hrs} س`:`${hrs}h ago`;
  const days=Math.floor(hrs/24);
  return lang==="ar"?`من ${days} يوم`:`${days}d ago`;
}
function touchTone(days:number|null){if(days===null)return "bg-slate-100 text-slate-600";if(days>=7)return "bg-red-100 text-red-800";if(days>=3)return "bg-amber-100 text-amber-900";return "bg-emerald-100 text-emerald-800"}
function fmtDateTime(value:any){
  if(!value)return "—";
  try{return new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Cairo",day:"2-digit",month:"short",hour:"numeric",minute:"2-digit"}).format(new Date(value))}catch{return String(value)}
}
function dueInfo(lead:any,lang:Lang){
  const today=todayLocal();const t=(en:string,ar:string)=>lang==="ar"?ar:en;
  const d=lead.next_action_date;const time=timeShort(lead.next_action_time);
  if(!d){
    if(String(lead.next_action_trigger||"").trim())return {kind:"trigger",label:t("Trigger","Trigger"),tone:"bg-slate-100 text-slate-700"};
    return {kind:"none",label:t("No date","مفيش ميعاد"),tone:"bg-red-50 text-red-800"};
  }
  if(d<today){const late=Math.round((new Date(today).getTime()-new Date(d).getTime())/86400000);return {kind:"over",label:t(`${late}d late`,`متأخر ${late} يوم`),tone:"bg-red-700 text-white"}}
  if(d===today)return {kind:"today",label:`${t("Today","النهاردة")}${time?` ${time}`:""}`,tone:"bg-amber-100 text-amber-900"};
  if(d===addDays(1))return {kind:"soon",label:`${t("Tomorrow","بكرة")}${time?` ${time}`:""}`,tone:"bg-slate-100 text-slate-700"};
  return {kind:d<=addDays(7)?"week":"later",label:d.slice(5).split("-").reverse().join("/"),tone:"bg-slate-100 text-slate-700"};
}
function stageLabel(s:string,lang:Lang){return lang==="ar"?(arStage[s]||s):(shortStage[s]||s)}
function sortByDue(a:any,b:any){
  const ad=a.next_action_date||"9999-99-99",bd=b.next_action_date||"9999-99-99";
  return ad.localeCompare(bd)||timeShort(a.next_action_time).localeCompare(timeShort(b.next_action_time))||String(a.client_name||"").localeCompare(String(b.client_name||""));
}
function leadToDraft(x:any):Draft{return {client_name:x.client_name||"",phone:x.phone||"",budget:x.budget||"",expected_value:salesValueToMillions(x.expected_value),stage:x.stage||"New Lead",next_action:x.next_action||"",next_action_date:x.next_action_date||"",next_action_time:timeShort(x.next_action_time),next_action_trigger:x.next_action_trigger||"",notes:x.notes||""}}

/* ---------------- icons ---------------- */
function IconPhone(){return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>}
function IconChat(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.3-4.2a8.5 8.5 0 1 1 15.7-4.5z"/><path d="M9.2 8.2c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c.6 1.2 1.6 2.1 2.8 2.7l.6-.6c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5v.5c0 .3-.1.6-.4.8-.5.4-1.1.5-1.7.4-2.6-.6-4.9-2.8-5.6-5.4-.1-.6 0-1.2.4-1.7z" fill="currentColor" stroke="none"/></svg>}
function IconSearch(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>}
function IconX(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>}

/* ================================================================== */
export default function SalesWarRoomV2(){
  const { slug = "" } = useParams();
  const sessionKey=`warRoomAgentToken:${slug}`;
  const viewKey=`warRoomV2View:${slug}`;
  const ownerToken=localStorage.getItem("warRoomAdminToken")||"";
  const isOwnerView=Boolean(ownerToken);
  const [lang,setLang]=useState<Lang>((localStorage.getItem("warRoomLang") as Lang)||"en");
  const [token,setToken]=useState(()=>localStorage.getItem(sessionKey)||"");
  const [password,setPassword]=useState("");
  const [data,setData]=useState<any>(null);
  const [summary,setSummary]=useState<Record<string,any>>({});
  const [loading,setLoading]=useState(Boolean(token||ownerToken));
  const [err,setErr]=useState("");
  const [toast,setToast]=useState("");
  const [view,setView]=useState<View>(()=>(localStorage.getItem(viewKey) as View)||"followups");
  const [query,setQuery]=useState("");
  const [stageFilter,setStageFilter]=useState("all");
  const [campaignFilter,setCampaignFilter]=useState("all");
  const [showClosed,setShowClosed]=useState(false);
  const [stageTab,setStageTab]=useState("Warm");
  const [selectedId,setSelectedId]=useState("");
  const [adding,setAdding]=useState(false);
  const searchRef=useRef<HTMLInputElement|null>(null);
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  function clearSession(){localStorage.removeItem(sessionKey);setToken("");setData(null)}
  function flash(msg:string){setToast(msg);window.setTimeout(()=>setToast(""),3500)}

  async function loadSummary(activeToken:string){
    try{
      const r=await fetch(`${LEAD_ACTIVITY_API}?summary=1`,{headers:{"x-agent-token":activeToken}});
      const d=await r.json().catch(()=>({}));
      if(r.ok)setSummary(d.summary||{});
    }catch{/* summary is optional */}
  }

  async function load(){
    if(!token){setLoading(false);return}
    try{
      setLoading(true);
      const agentData=await salesWarRoomApi.getAgent(slug,token);
      setData(agentData);setErr("");
      void loadSummary(token);
    }catch(e:any){
      if(e.message==="unauthorized"){clearSession();setErr(t("Session expired. Enter your password again.","انتهت جلسة الدخول. اكتب الباسورد مرة تانية."))}
      else setErr(e.message);
    }finally{setLoading(false)}
  }

  async function bootstrapOwnerAccess(){
    if(token||!ownerToken)return;
    try{setLoading(true);setErr("");const r=await salesWarRoomApi.adminAgentAccess(ownerToken,slug);localStorage.setItem(sessionKey,r.token);setToken(r.token)}
    catch(e:any){if(e.message==="unauthorized")localStorage.removeItem("warRoomAdminToken");setErr(e.message)}
    finally{setLoading(false)}
  }

  async function login(){
    try{setLoading(true);setErr("");const r=await salesWarRoomApi.agentLogin(slug,password);localStorage.setItem(sessionKey,r.token);setToken(r.token);setPassword("")}
    catch(e:any){setErr(e.message==="invalid_credentials"?t("Wrong password","الباسورد غير صحيح"):e.message)}finally{setLoading(false)}
  }

  function goClassic(){localStorage.setItem(VERSION_KEY,"v1");window.location.href=`/sales-war-room/a/${slug}`}

  useEffect(()=>{document.title="Sales War Room · V2";const m=document.createElement("meta");m.name="robots";m.content="noindex,nofollow,noarchive";document.head.appendChild(m);return()=>m.remove()},[]);
  useEffect(()=>{localStorage.setItem(VERSION_KEY,"v2");if(slug)localStorage.setItem("warRoomLastAgent",slug)},[slug]);
  useEffect(()=>{if(token)void load();else if(ownerToken)void bootstrapOwnerAccess();else setLoading(false)},[slug,token]);
  useEffect(()=>{localStorage.setItem("warRoomLang",lang);document.documentElement.dir=lang==="ar"?"rtl":"ltr"},[lang]);
  useEffect(()=>{localStorage.setItem(viewKey,view)},[view,viewKey]);
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      const tag=(e.target as HTMLElement)?.tagName;
      if(e.key==="/"&&tag!=="INPUT"&&tag!=="TEXTAREA"&&tag!=="SELECT"){e.preventDefault();searchRef.current?.focus()}
      if(e.key==="Escape"&&tag!=="INPUT"&&tag!=="TEXTAREA"){setSelectedId("");setAdding(false)}
    }
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[]);

  const pipeline:any[]=data?.pipeline||[];
  const score=data?.score||{};
  const campaigns=useMemo(()=>[...new Set<string>(pipeline.map((x:any)=>String(x.campaign||"").trim()).filter(Boolean))].sort(),[pipeline]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return pipeline.filter((x:any)=>{
      if(!showClosed&&view!=="stages"&&closedStages.includes(x.stage))return false;
      if(stageFilter!=="all"&&x.stage!==stageFilter)return false;
      if(campaignFilter!=="all"&&String(x.campaign||"")!==campaignFilter)return false;
      if(q){const hay=`${x.client_name||""} ${x.phone||""} ${x.budget||""} ${x.next_action||""} ${x.notes||""} ${x.campaign||""}`.toLowerCase();if(!hay.includes(q))return false}
      return true;
    });
  },[pipeline,query,stageFilter,campaignFilter,showClosed,view]);
  const selected=pipeline.find((x:any)=>String(x.id)===selectedId)||null;

  const todayCalls=[1,2,3,4].reduce((a,i)=>a+Number(score[`match${i}_calls`]||0),0);
  const warm=pipeline.filter((l:any)=>l.stage==="Warm").length;
  const expected=pipeline.filter((l:any)=>["Warm","Hot / Very Potential"].includes(l.stage)).reduce((s:number,l:any)=>s+normalizeSalesValue(l.expected_value),0);
  const activeCount=pipeline.filter((l:any)=>!closedStages.includes(l.stage)).length;
  const overdueCount=pipeline.filter((l:any)=>!closedStages.includes(l.stage)&&l.next_action_date&&l.next_action_date<todayLocal()).length;

  /* ---------- writes ---------- */
  function warmProblem(x:{stage:string;next_action:string;next_action_date:string;next_action_trigger:string}){
    return x.stage==="Warm"&&(!String(x.next_action||"").trim()||(!x.next_action_date&&!String(x.next_action_trigger||"").trim()));
  }
  async function patchLead(id:string,body:Record<string,unknown>){
    await salesWarRoomApi.updateLead(token,{id,...body});
    await load();
  }
  async function changeStage(lead:any,stage:string){
    if(stage===lead.stage)return;
    if(warmProblem({stage,next_action:lead.next_action,next_action_date:lead.next_action_date,next_action_trigger:lead.next_action_trigger})){
      setSelectedId(String(lead.id));
      flash(t("Warm needs a Next step + a date (or trigger). Set it in the panel first.","Warm محتاج خطوة جاية + ميعاد (أو Trigger). حددها من الـPanel الأول."));
      return;
    }
    try{await patchLead(String(lead.id),{stage});flash(t("Stage updated","اتغيرت المرحلة"))}catch(e:any){flash(e.message)}
  }

  /* ---------- auth screens ---------- */
  if(!token&&ownerToken&&loading)return <main className="grid min-h-screen place-items-center bg-[#17191E] text-white">{t("Opening agent dashboard as Owner…","جاري فتح داشبورد الـAgent كـOwner…")}</main>;
  if(!token)return <main className="grid min-h-screen place-items-center bg-[#17191E] p-4 text-white" dir={lang==="ar"?"rtl":"ltr"}>
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-6 flex items-center justify-between"><div><div className="text-xs font-bold tracking-[.18em] text-slate-400">TYCOONS SALES WAR ROOM · V2</div><h1 className="mt-1 text-2xl font-bold">{t("Agent Access","دخول الـAgent")}</h1></div><button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="rounded-full border border-white/20 px-3 py-2 text-xs font-bold">{lang==="ar"?"EN":"عربي"}</button></div>
      <input type="password" autoFocus autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void login()} placeholder={t("Password","الباسورد")} className="w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none"/>
      <button disabled={loading||!password} onClick={()=>void login()} className="mt-3 w-full rounded-xl bg-white p-3 font-bold text-slate-950 disabled:opacity-50">{loading?t("Checking…","جاري التحقق…"):t("Open","ادخل")}</button>
      {err&&<div className="mt-3 text-sm text-red-300">{err}</div>}
      <button onClick={goClassic} className="mt-4 w-full text-center text-xs font-bold text-slate-400 underline">{t("Use classic version","استخدم النسخة القديمة")}</button>
    </div>
  </main>;
  if(loading&&!data)return <main className="grid min-h-screen place-items-center bg-[#F3F1EC] text-slate-700">{t("Loading…","جاري التحميل…")}</main>;
  if(err&&!data)return <main className="grid min-h-screen place-items-center bg-[#F3F1EC] p-4"><div className="text-center"><div>{t("Dashboard unavailable","الداشبورد غير متاحة")}</div><div className="mt-2 text-sm text-red-600">{err}</div><button onClick={clearSession} className="mt-4 rounded-xl bg-[#17191E] px-4 py-2 font-bold text-white">{t("Sign in again","دخول من جديد")}</button></div></main>;

  const name=lang==="ar"?(data.agent?.name_ar||data.agent?.name_en):(data.agent?.name_en||data.agent?.name_ar);
  const rowProps={lang,t,summary,selectedId,onOpen:(id:string)=>setSelectedId(id),onStage:changeStage};

  return <main className="min-h-screen bg-[#F3F1EC] text-[#17191E]" dir={lang==="ar"?"rtl":"ltr"} style={{fontFamily:"'IBM Plex Sans Arabic', system-ui, sans-serif"}}>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"/>

    {/* ---------- top bar ---------- */}
    <header className="sticky top-0 z-30 bg-[#17191E] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-3 py-2.5 md:px-6">
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-[.18em] text-slate-400">TYCOONS · SALES WAR ROOM · V2</div>
          <div className="truncate text-base font-bold">{name}</div>
        </div>
        <label className="order-3 flex h-10 w-full items-center gap-2 rounded-xl bg-[#2A2D34] px-3 text-slate-300 md:order-none md:ms-4 md:w-80">
          <IconSearch/>
          <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("Search my clients…  ( / )","دور في عملائي…  ( / )")} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"/>
        </label>
        <div className="ms-auto flex items-center gap-2 text-xs text-slate-300">
          <span className="hidden lg:inline">{t("Calls","مكالمات")} <b className="font-mono text-white">{todayCalls}/200</b></span>
          <span className={`hidden lg:inline ${warm<10?"text-red-300":""}`}>Warm <b className="font-mono text-white">{warm}</b>{warm<10?" ⚠":""}</span>
          <span className="hidden xl:inline">{t("Expected","متوقع")} <b className="font-mono text-white">{formatSalesEgp(expected)}</b></span>
          <button onClick={goClassic} className="h-9 rounded-xl border border-slate-600 px-3 font-bold text-white hover:bg-white/10">{t("Classic version","النسخة القديمة")}</button>
          <button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="h-9 rounded-xl border border-slate-600 px-3 font-bold text-white hover:bg-white/10">{lang==="ar"?"EN":"عربي"}</button>
          {isOwnerView?<button onClick={()=>window.location.href="/sales-war-room/admin"} className="h-9 rounded-xl border border-slate-600 px-3 font-bold text-white">{t("Owner","Owner")}</button>:<button onClick={clearSession} className="hidden h-9 rounded-xl border border-slate-600 px-3 font-bold text-white md:block">{t("Logout","خروج")}</button>}
          <button onClick={()=>setAdding(true)} className="h-9 rounded-xl bg-[#F2B544] px-3 text-sm font-bold text-[#17191E]">+ {t("Add client","عميل جديد")}</button>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-[1600px] px-3 pt-4 md:px-6">
      {/* ---------- title + views + filters ---------- */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="text-xl font-bold">{t("My clients","عملائي")} <span className="font-mono text-base text-slate-500">{activeCount}</span></div>
          <div className="text-xs text-slate-500">{overdueCount?<span className="font-bold text-red-700">{t(`${overdueCount} overdue follow-ups`,`${overdueCount} متابعة متأخرة`)}</span>:t("No overdue follow-ups","مفيش متابعات متأخرة")}</div>
        </div>
        <nav aria-label="Views" className="flex max-w-full gap-0.5 overflow-x-auto rounded-xl bg-[#E4E0D8] p-1 md:ms-4">
          {([["followups",t("Follow-ups","متابعات")],["table",t("Table","جدول")],["stages",t("By stage","حسب المرحلة")],["calendar",t("Calendar","تقويم")],["board",t("Board","Board")]] as [View,string][]).map(([v,label])=>
            <button key={v} onClick={()=>setView(v)} className={`h-9 whitespace-nowrap rounded-lg px-3.5 text-sm ${view===v?"bg-white font-bold shadow-sm":"font-semibold text-slate-600 hover:text-slate-900"}`}>{label}</button>)}
        </nav>
        <div className="flex flex-wrap gap-2 md:ms-auto">
          {view!=="stages"&&<select value={stageFilter} onChange={e=>setStageFilter(e.target.value)} className="h-9 rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold"><option value="all">{t("Stage: All","المرحلة: الكل")}</option>{stages.map(s=><option key={s} value={s}>{stageLabel(s,lang)}</option>)}</select>}
          <select value={campaignFilter} onChange={e=>setCampaignFilter(e.target.value)} className="h-9 max-w-[200px] rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold"><option value="all">{t("Campaign: All","الحملة: الكل")}</option>{campaigns.map(c=><option key={c} value={c}>{c}</option>)}</select>
          {view!=="stages"&&<label className="flex h-9 items-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold"><input type="checkbox" checked={showClosed} onChange={e=>setShowClosed(e.target.checked)}/>{t("Show Won / Lost","اعرض المكسب / الخسارة")}</label>}
        </div>
      </div>

      {/* ---------- body ---------- */}
      <div className="mt-4 flex gap-4 pb-10">
        <section className="min-w-0 flex-1">
          {view==="followups"&&<FollowUpsView rows={filtered} {...rowProps}/>}
          {view==="table"&&<TableView rows={filtered} {...rowProps} onPatch={async(id:string,body:any)=>{try{await patchLead(id,body);flash(t("Saved","اتحفظ"))}catch(e:any){flash(e.message)}}}/>}
          {view==="stages"&&<StagesView rows={filtered} stageTab={stageTab} setStageTab={setStageTab} {...rowProps}/>}
          {view==="calendar"&&<CalendarView rows={filtered} {...rowProps}/>}
          {view==="board"&&<BoardView rows={filtered} {...rowProps}/>}
        </section>

        {selected&&<LeadPanel key={String(selected.id)} lead={selected} token={token} lang={lang} t={t} summary={summary[String(selected.id)]}
          onClose={()=>setSelectedId("")}
          onSaved={async(msg:string)=>{await load();flash(msg)}}
          onError={(msg:string)=>flash(msg)}
          warmProblem={warmProblem}/>}
      </div>
    </div>

    {adding&&<AddLeadModal lang={lang} t={t} onClose={()=>setAdding(false)} warmProblem={warmProblem}
      onSave={async(d:Draft)=>{await salesWarRoomApi.addLead(token,{slug,...d,expected_value:salesInputToEgp(d.expected_value),next_action_date:d.next_action_date||null,next_action_time:d.next_action_date?(d.next_action_time||"09:00"):null});setAdding(false);await load();flash(t("Client added","العميل اتضاف"))}}/>}

    {toast&&<div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[#17191E] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
  </main>;
}

/* ================================================================== */
/* Shared bits                                                         */
/* ================================================================== */
function StagePicker({lead,lang,onStage,compact}:any){
  return <select aria-label="Stage" value={lead.stage} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();onStage(lead,e.target.value)}}
    className={`max-w-full cursor-pointer rounded-full border font-bold ${compact?"h-7 px-2 text-[11px]":"h-8 px-2.5 text-xs"} ${stageTone[lead.stage]||stageTone["New Lead"]}`}>
    {stages.map(s=><option key={s} value={s}>{stageLabel(s,lang)}</option>)}
  </select>;
}

function QuickActions({lead,t,onOpen}:any){
  const call=phoneForCall(lead.phone),wa=whatsappLink(lead.phone);
  return <div className="flex shrink-0 gap-1.5" onClick={e=>e.stopPropagation()}>
    {call?<a href={`tel:${call}`} aria-label={t("Call","اتصال")} className="grid h-9 w-9 place-items-center rounded-lg border border-[#E4E0D8] bg-white hover:bg-slate-50"><IconPhone/></a>:null}
    {wa?<a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-lg bg-[#25D366] text-white hover:bg-[#1EBE5A]"><IconChat/></a>:null}
    <button onClick={()=>onOpen(String(lead.id))} className="h-9 whitespace-nowrap rounded-lg bg-[#17191E] px-3 text-xs font-bold text-white hover:bg-black">+ {t("Feedback","فيدباك")}</button>
  </div>;
}

function TouchBadge({lead,summary,lang}:any){
  const d=lastTouchDate(lead,summary?.[String(lead.id)]);const days=daysSince(d);
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${touchTone(days)}`} title={d?d.toLocaleString():""}>{touchLabel(d,lang)}</span>;
}

function LeadRow({lead,lang,t,summary,selectedId,onOpen,onStage}:any){
  const due=dueInfo(lead,lang);const sel=selectedId===String(lead.id);
  const fbCount=Number(summary?.[String(lead.id)]?.feedback_count||0);
  return <div onClick={()=>onOpen(String(lead.id))} className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-[#EEEBE5] px-3 py-2.5 md:grid-cols-[150px_100px_70px_minmax(0,1fr)_130px_auto] md:px-4 ${sel?"bg-[#F6F4EF] shadow-[inset_3px_0_0_#17191E]":"bg-white hover:bg-[#FBFAF7]"}`}>
    <div className="min-w-0">
      <div className="truncate text-sm font-bold">{lead.client_name}</div>
      <div className="truncate text-xs text-slate-500">{[lead.budget,lead.expected_value?formatSalesEgp(lead.expected_value):"",lead.campaign].filter(Boolean).join(" · ")||"—"}</div>
    </div>
    <div className="hidden md:block"><StagePicker lead={lead} lang={lang} onStage={onStage} compact/></div>
    <div className="justify-self-end md:justify-self-start"><TouchBadge lead={lead} summary={summary} lang={lang}/></div>
    <div className="col-span-2 max-h-20 min-w-0 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-[#F6F4EF] px-3 py-2 text-[13px] leading-6 text-slate-700 md:col-span-1">{lead.notes?String(lead.notes).trim():<span className="text-slate-400">{fbCount?t(`${fbCount} feedbacks`,`${fbCount} فيدباك`):t("No feedback yet","مفيش فيدباك لسه")}</span>}</div>
    <div className="min-w-0">
      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold ${due.tone}`}>{due.label}</span>
      <div className="mt-0.5 truncate text-xs font-semibold">{lead.next_action||(due.kind==="none"?<span className="text-red-700">+ {t("Set follow-up","حدد متابعة")}</span>:"—")}</div>
    </div>
    <QuickActions lead={lead} t={t} onOpen={onOpen}/>
  </div>;
}

function Group({title,hint,tone,rows,...rest}:any){
  if(!rows.length)return null;
  return <section className="mb-3 overflow-hidden rounded-2xl border border-[#E4E0D8] bg-white">
    <div className={`flex items-center gap-2 px-4 py-2 ${tone}`}><span className="text-sm font-bold">{title}</span><span className="font-mono text-xs font-semibold">{rows.length}</span>{hint&&<span className="truncate text-xs font-medium opacity-80">· {hint}</span>}</div>
    {rows.map((x:any)=><LeadRow key={x.id} lead={x} {...rest}/>)}
  </section>;
}

function EmptyState({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-[#D8D3C9] bg-white p-8 text-center text-sm font-semibold text-slate-500">{text}</div>}

/* ================================================================== */
/* Views                                                               */
/* ================================================================== */
function FollowUpsView({rows,...rest}:any){
  const {t}=rest;const today=todayLocal(),week=addDays(7);
  const sorted=[...rows].sort(sortByDue);
  const overdue=sorted.filter(x=>x.next_action_date&&x.next_action_date<today);
  const todayRows=sorted.filter(x=>x.next_action_date===today);
  const noNext=sorted.filter(x=>!x.next_action_date&&!String(x.next_action_trigger||"").trim());
  const thisWeek=sorted.filter(x=>x.next_action_date&&x.next_action_date>today&&x.next_action_date<=week);
  const later=sorted.filter(x=>(x.next_action_date&&x.next_action_date>week)||(!x.next_action_date&&String(x.next_action_trigger||"").trim()));
  if(!rows.length)return <EmptyState text={t("No clients match these filters.","مفيش عملاء بالفلاتر دي.")}/>;
  return <div>
    <div className="mb-2 hidden grid-cols-[150px_100px_70px_minmax(0,1fr)_130px_auto] gap-x-3 px-4 text-[11px] font-bold tracking-wide text-slate-500 md:grid">
      <span>{t("CLIENT","العميل")}</span><span>{t("STAGE","المرحلة")}</span><span>{t("TOUCH","آخر تواصل")}</span><span>{t("FEEDBACK","الفيدباك")}</span><span>{t("NEXT STEP","الخطوة الجاية")}</span><span className="w-[170px]"></span>
    </div>
    <Group title={t("Overdue","متأخر")} hint={t("follow-up date passed","ميعاد المتابعة عدى")} tone="bg-red-50 text-red-800" rows={overdue} {...rest}/>
    <Group title={t("Today","النهاردة")} hint="" tone="bg-amber-50 text-amber-900" rows={todayRows} {...rest}/>
    <Group title={t("No next step","من غير متابعة جاية")} hint={t("these are the clients that get lost — set a follow-up","دول اللي بيضيعوا — حدد لهم متابعة")} tone="bg-slate-100 text-slate-800" rows={noNext} {...rest}/>
    <Group title={t("This week","الأسبوع ده")} hint="" tone="bg-[#F6F4EF] text-slate-800" rows={thisWeek} {...rest}/>
    <Group title={t("Later","بعدين")} hint="" tone="bg-[#F6F4EF] text-slate-600" rows={later} {...rest}/>
  </div>;
}

function StagesView({rows,stageTab,setStageTab,...rest}:any){
  const {lang,t}=rest;const list=[...rows.filter((x:any)=>x.stage===stageTab)].sort(sortByDue);
  return <div>
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{stages.map(s=>{const n=rows.filter((x:any)=>x.stage===s).length;return <button key={s} onClick={()=>setStageTab(s)} className={`h-9 whitespace-nowrap rounded-full border px-3 text-xs font-bold ${stageTab===s?"border-[#17191E] bg-[#17191E] text-white":"border-[#D8D3C9] bg-white"}`}>{stageLabel(s,lang)} · {n}</button>})}</div>
    {list.length?<div className="overflow-hidden rounded-2xl border border-[#E4E0D8] bg-white">{list.map((x:any)=><LeadRow key={x.id} lead={x} {...rest}/>)}</div>:<EmptyState text={t("No clients in this stage.","مفيش عملاء في المرحلة دي.")}/>}
  </div>;
}

function CalendarView({rows,...rest}:any){
  const {t,lang}=rest;const today=todayLocal();
  const dated=rows.filter((x:any)=>x.next_action_date);
  const groups=dated.reduce((acc:Record<string,any[]>,x:any)=>{(acc[x.next_action_date]||=[]).push(x);return acc},{});
  const dates=Object.keys(groups).sort();
  if(!dates.length)return <EmptyState text={t("No dated follow-ups yet.","مفيش متابعات بتاريخ لسه.")}/>;
  return <div className="space-y-3">{dates.map(date=>{
    const label=new Intl.DateTimeFormat(lang==="ar"?"ar-EG":"en-GB",{weekday:"long",day:"numeric",month:"short"}).format(new Date(`${date}T12:00:00`));
    const tone=date<today?"bg-red-50 text-red-800":date===today?"bg-amber-50 text-amber-900":"bg-[#F6F4EF] text-slate-800";
    return <section key={date} className="overflow-hidden rounded-2xl border border-[#E4E0D8] bg-white"><div className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${tone}`}>{label}<span className="font-mono text-xs">{groups[date].length}</span>{date<today&&<span className="text-xs">· {t("overdue","متأخر")}</span>}{date===today&&<span className="text-xs">· {t("today","النهاردة")}</span>}</div>{[...groups[date]].sort(sortByDue).map((x:any)=><LeadRow key={x.id} lead={x} {...rest}/>)}</section>;
  })}</div>;
}

function BoardView({rows,...rest}:any){
  const {lang,t,onOpen,selectedId}=rest;
  const cols=stages.filter(s=>rows.some((x:any)=>x.stage===s));
  if(!cols.length)return <EmptyState text={t("No clients match these filters.","مفيش عملاء بالفلاتر دي.")}/>;
  return <div className="overflow-x-auto pb-2"><div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-3">{cols.map(s=>{const list=[...rows.filter((x:any)=>x.stage===s)].sort(sortByDue);const sum=list.reduce((a:number,x:any)=>a+normalizeSalesValue(x.expected_value),0);return <div key={s} className="rounded-2xl bg-[#EAE7E0] p-2.5">
    <div className="mb-2 flex items-center gap-2 px-1 text-sm font-bold">{stageLabel(s,lang)}<span className="font-mono text-xs text-slate-500">{list.length}</span><span className="ms-auto font-mono text-xs text-slate-600">{sum?formatSalesEgp(sum):""}</span></div>
    <div className="space-y-2">{list.map((x:any)=>{const due=dueInfo(x,lang);return <div key={x.id} onClick={()=>onOpen(String(x.id))} className={`cursor-pointer space-y-2 rounded-xl border bg-white p-3 shadow-sm ${selectedId===String(x.id)?"border-2 border-[#17191E]":"border-[#E4E0D8]"}`}>
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{x.client_name}</div><div className="truncate text-xs text-slate-500">{x.budget||"—"}</div></div>{x.expected_value?<span className="font-mono text-xs font-semibold text-emerald-700">{formatSalesEgp(x.expected_value).replace("EGP ","")}</span>:null}</div>
      <div className="flex items-center gap-1.5"><span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${due.tone}`}>{due.label}</span><span className="truncate text-xs font-semibold">{x.next_action||"—"}</span></div>
      <div className="flex items-center justify-between"><TouchBadge lead={x} summary={rest.summary} lang={lang}/><QuickActions lead={x} t={t} onOpen={onOpen}/></div>
    </div>})}</div>
  </div>})}</div></div>;
}

function TableView({rows,onPatch,...rest}:any){
  const {lang,t,summary,selectedId,onOpen,onStage}=rest;
  const [sortKey,setSortKey]=useState<"due"|"name"|"touch"|"value"|"stage">("due");
  const sorted=useMemo(()=>{
    const r=[...rows];
    if(sortKey==="due")r.sort(sortByDue);
    if(sortKey==="name")r.sort((a,b)=>String(a.client_name||"").localeCompare(String(b.client_name||"")));
    if(sortKey==="value")r.sort((a,b)=>normalizeSalesValue(b.expected_value)-normalizeSalesValue(a.expected_value));
    if(sortKey==="stage")r.sort((a,b)=>stages.indexOf(a.stage)-stages.indexOf(b.stage));
    if(sortKey==="touch")r.sort((a,b)=>{const da=lastTouchDate(a,summary[String(a.id)])?.getTime()||0,db=lastTouchDate(b,summary[String(b.id)])?.getTime()||0;return da-db});
    return r;
  },[rows,sortKey,summary]);
  const th=(key:typeof sortKey|null,label:string)=><th className="whitespace-nowrap p-2.5 text-start">{key?<button onClick={()=>setSortKey(key)} className={`font-bold ${sortKey===key?"text-slate-900":""}`}>{label}{sortKey===key?" ↓":" ↕"}</button>:label}</th>;
  if(!rows.length)return <EmptyState text={t("No clients match these filters.","مفيش عملاء بالفلاتر دي.")}/>;
  return <div className="overflow-x-auto rounded-2xl border border-[#E4E0D8] bg-white">
    <div className="border-b border-[#EEEBE5] px-3 py-2 text-xs text-slate-500">{t("Click Next step or Follow-up to edit in place · Enter saves · Esc cancels · click the name to open the client","دوس على الخطوة الجاية أو الميعاد تعدلهم مكانهم · Enter للحفظ · Esc للإلغاء · دوس على الاسم تفتح العميل")}</div>
    <table className="w-full min-w-[1100px] text-sm">
      <thead className="bg-[#F6F4EF] text-[11px] tracking-wide text-slate-500"><tr>
        {th("name",t("CLIENT","العميل"))}{th(null,t("PHONE","الموبايل"))}{th("stage",t("STAGE","المرحلة"))}{th(null,t("BUDGET","الميزانية"))}{th("value",t("EXPECTED","متوقع"))}{th("touch",t("LAST TOUCH","آخر تواصل"))}{th("due",t("FOLLOW-UP","المتابعة"))}{th(null,t("NEXT STEP","الخطوة الجاية"))}<th className="p-2.5"></th>
      </tr></thead>
      <tbody>{sorted.map((x:any)=>{const due=dueInfo(x,lang);return <tr key={x.id} className={`border-t border-[#EEEBE5] ${selectedId===String(x.id)?"bg-[#F6F4EF]":"hover:bg-[#FBFAF7]"}`}>
        <td className="p-2.5"><button onClick={()=>onOpen(String(x.id))} className="text-start font-bold hover:underline">{x.client_name}</button></td>
        <td className="whitespace-nowrap p-2.5 font-mono text-xs" dir="ltr">{x.phone||"—"}</td>
        <td className="p-2.5"><StagePicker lead={x} lang={lang} onStage={onStage} compact/></td>
        <td className="p-2.5 text-xs">{x.budget||"—"}</td>
        <td className="whitespace-nowrap p-2.5 font-mono text-xs font-semibold text-emerald-700">{x.expected_value?formatSalesEgp(x.expected_value):"—"}</td>
        <td className="p-2.5"><TouchBadge lead={x} summary={summary} lang={lang}/></td>
        <td className="p-2.5"><InlineDate lead={x} label={due.label} tone={due.tone} onSave={(date:string)=>onPatch(String(x.id),{next_action_date:date||null,next_action_time:date?(timeShort(x.next_action_time)||"09:00"):null})}/></td>
        <td className="p-2.5"><InlineText value={x.next_action||""} placeholder={t("+ Add next step","+ ضيف خطوة")} onSave={(v:string)=>onPatch(String(x.id),{next_action:v})}/></td>
        <td className="p-2.5"><QuickActions lead={x} t={t} onOpen={onOpen}/></td>
      </tr>})}</tbody>
    </table>
  </div>;
}

function InlineText({value,placeholder,onSave}:any){
  const [editing,setEditing]=useState(false);const [v,setV]=useState(value);
  useEffect(()=>{if(!editing)setV(value)},[value,editing]);
  if(!editing)return <button onClick={()=>setEditing(true)} className="block w-full max-w-[260px] truncate rounded-md px-1.5 py-1 text-start text-xs font-semibold hover:bg-slate-100">{value||<span className="text-slate-400">{placeholder}</span>}</button>;
  return <input autoFocus value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{setEditing(false);if(v!==value)onSave(v)}} onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLInputElement).blur();if(e.key==="Escape"){setV(value);setEditing(false)}}} className="h-8 w-full max-w-[260px] rounded-md border-2 border-[#17191E] px-2 text-xs outline-none"/>;
}

function InlineDate({lead,label,tone,onSave}:any){
  const [editing,setEditing]=useState(false);
  if(!editing)return <button onClick={()=>setEditing(true)} className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold ${tone}`}>{label}</button>;
  return <input autoFocus type="date" defaultValue={lead.next_action_date||""} onBlur={e=>{setEditing(false);if(e.target.value!==(lead.next_action_date||""))onSave(e.target.value)}} onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLInputElement).blur();if(e.key==="Escape")setEditing(false)}} className="h-8 rounded-md border-2 border-[#17191E] px-1 text-xs"/>;
}

/* ================================================================== */
/* Lead panel: details + one-save feedback + history                   */
/* ================================================================== */
function LeadPanel({lead,token,lang,t,summary,onClose,onSaved,onError,warmProblem}:any){
  const [outcome,setOutcome]=useState("");
  const [note,setNote]=useState("");
  const [nextAction,setNextAction]=useState(lead.next_action||"");
  const [nextDate,setNextDate]=useState(lead.next_action_date||"");
  const [nextTime,setNextTime]=useState(timeShort(lead.next_action_time));
  const [saving,setSaving]=useState(false);
  const [editDetails,setEditDetails]=useState(false);
  const [details,setDetails]=useState<Draft>(leadToDraft(lead));
  const [activities,setActivities]=useState<any[]>([]);
  const [loadingLog,setLoadingLog]=useState(true);

  async function loadLog(){
    try{setLoadingLog(true);const r=await salesWarRoomApi.getLeadActivity(token,String(lead.id));setActivities(r.activities||[])}
    catch{setActivities([])}finally{setLoadingLog(false)}
  }
  useEffect(()=>{void loadLog()},[lead.id]);

  const quick=[
    {label:t("Tomorrow 11:00","بكرة 11ص"),date:addDays(1),time:"11:00"},
    {label:t("+3 days","+3 أيام"),date:addDays(3),time:"11:00"},
    {label:t("Next week","الأسبوع الجاي"),date:nextWeekday(),time:"11:00"},
  ];
  const followChanged=nextAction!==(lead.next_action||"")||nextDate!==(lead.next_action_date||"")||nextTime!==timeShort(lead.next_action_time);
  const canSave=Boolean(outcome||note.trim()||followChanged);

  async function saveFeedback(){
    if(!canSave||saving)return;
    if(warmProblem({stage:lead.stage,next_action:nextAction,next_action_date:nextDate,next_action_trigger:lead.next_action_trigger})){onError(t("Warm needs a Next step + a date.","Warm محتاج خطوة جاية + ميعاد."));return}
    try{
      setSaving(true);
      const outcomeObj=outcomes.find(o=>o.en===outcome);
      const body=[outcomeObj?`[${lang==="ar"?outcomeObj.ar:outcomeObj.en}]`:"",note.trim()].filter(Boolean).join(" ");
      if(body)await salesWarRoomApi.addLeadFeedback(token,String(lead.id),body);
      if(followChanged)await salesWarRoomApi.updateLead(token,{id:String(lead.id),next_action:nextAction,next_action_date:nextDate||null,next_action_time:nextDate?(nextTime||"09:00"):null});
      setOutcome("");setNote("");
      await loadLog();
      await onSaved(t("Feedback saved","الفيدباك اتحفظ"));
    }catch(e:any){onError(e.message||"save_error")}finally{setSaving(false)}
  }

  async function saveDetails(){
    if(!details.client_name.trim()){onError(t("Client name is required","اسم العميل مطلوب"));return}
    if(details.expected_value.trim()&&!(Number(details.expected_value)>=0)){onError(t("Expected sale must be a number in millions","Expected لازم يكون رقم بالمليون"));return}
    if(warmProblem(details)){onError(t("Warm needs a Next step + a date (or trigger).","Warm محتاج خطوة جاية + ميعاد (أو Trigger)."));return}
    try{
      setSaving(true);
      await salesWarRoomApi.updateLead(token,{id:String(lead.id),...details,expected_value:salesInputToEgp(details.expected_value),next_action_date:details.next_action_date||null,next_action_time:details.next_action_date?(details.next_action_time||"09:00"):null});
      setEditDetails(false);
      await loadLog();
      await onSaved(t("Client updated","بيانات العميل اتحدثت"));
    }catch(e:any){onError(e.message||"save_error")}finally{setSaving(false)}
  }

  async function setStage(stage:string){
    if(stage===lead.stage)return;
    if(warmProblem({stage,next_action:nextAction,next_action_date:nextDate,next_action_trigger:lead.next_action_trigger})){onError(t("Warm needs a Next step + a date. Fill 'Next follow-up' below first.","Warm محتاج خطوة جاية + ميعاد. املى 'المتابعة الجاية' تحت الأول."));return}
    try{
      setSaving(true);
      await salesWarRoomApi.updateLead(token,{id:String(lead.id),stage,...(stage==="Warm"?{next_action:nextAction,next_action_date:nextDate||null,next_action_time:nextDate?(nextTime||"09:00"):null}:{})});
      await loadLog();
      await onSaved(t("Stage updated","اتغيرت المرحلة"));
    }catch(e:any){onError(e.message)}finally{setSaving(false)}
  }

  const call=phoneForCall(lead.phone),wa=whatsappLink(lead.phone);
  const field="h-10 w-full rounded-lg border border-[#D8D3C9] bg-white px-3 text-sm outline-none focus:border-[#17191E]";

  return <>
    <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose}></div>
    <aside aria-label="Client details" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:sticky lg:inset-auto lg:top-[76px] lg:z-auto lg:max-h-[calc(100vh-92px)] lg:w-[380px] lg:shrink-0 lg:rounded-2xl lg:border lg:border-[#E4E0D8] lg:shadow-none">
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#D8D3C9] lg:hidden"></div>
      <div className="overflow-y-auto">
        {/* header */}
        <div className="border-b border-[#EEEBE5] p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-bold">{lead.client_name}</div>
              <div className="text-xs text-slate-500"><span dir="ltr">{lead.phone||"—"}</span>{lead.campaign?` · ${lead.campaign}`:""}</div>
            </div>
            {call&&<a href={`tel:${call}`} aria-label={t("Call","اتصال")} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E4E0D8]"><IconPhone/></a>}
            {wa&&<a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366] text-white"><IconChat/></a>}
            <button onClick={onClose} aria-label={t("Close","قفل")} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E4E0D8]"><IconX/></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{stages.map(s=><button key={s} disabled={saving} onClick={()=>void setStage(s)} className={`h-8 rounded-full border px-2.5 text-xs ${lead.stage===s?`font-bold ${stageTone[s]}`:"border-[#D8D3C9] bg-white font-semibold text-slate-700 hover:border-slate-500"}`}>{stageLabel(s,lang)}</button>)}</div>
          {!editDetails?<div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#EEEBE5] p-2.5"><div className="text-[10px] font-bold text-slate-500">{t("BUDGET","الميزانية")}</div><div className="text-sm font-semibold">{lead.budget||"—"}</div></div>
            <div className="rounded-xl border border-[#EEEBE5] p-2.5"><div className="text-[10px] font-bold text-slate-500">{t("EXPECTED SALE","البيعة المتوقعة")}</div><div className="font-mono text-sm font-semibold text-emerald-700">{lead.expected_value?formatSalesEgp(lead.expected_value):"—"}</div></div>
            <button onClick={()=>{setDetails(leadToDraft(lead));setEditDetails(true)}} className="col-span-2 h-9 rounded-xl border border-dashed border-[#D8D3C9] text-xs font-bold text-slate-600 hover:border-slate-500">{t("Edit name / phone / budget / notes","عدّل الاسم / الموبايل / الميزانية / الملاحظات")}</button>
          </div>:<div className="mt-3 grid grid-cols-2 gap-2">
            <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Name","الاسم")}<input value={details.client_name} onChange={e=>setDetails({...details,client_name:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">{t("Phone","الموبايل")}<input dir="ltr" value={details.phone} onChange={e=>setDetails({...details,phone:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">{t("Budget","الميزانية")}<input value={details.budget} onChange={e=>setDetails({...details,budget:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">{t("Expected (M EGP)","متوقع (بالمليون)")}<input type="number" min="0" step="0.1" value={details.expected_value} onChange={e=>setDetails({...details,expected_value:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">{t("Trigger","Trigger")}<input value={details.next_action_trigger} onChange={e=>setDetails({...details,next_action_trigger:e.target.value})} className={field}/></label>
            <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Client context / notes","سياق العميل / ملاحظات")}<textarea value={details.notes} onChange={e=>setDetails({...details,notes:e.target.value})} className="min-h-20 w-full rounded-lg border border-[#D8D3C9] p-2 text-sm outline-none focus:border-[#17191E]"/></label>
            <div className="col-span-2 flex gap-2"><button disabled={saving} onClick={()=>void saveDetails()} className="h-10 flex-1 rounded-xl bg-[#17191E] text-sm font-bold text-white disabled:opacity-50">{t("Save details","احفظ البيانات")}</button><button onClick={()=>setEditDetails(false)} className="h-10 rounded-xl border border-[#D8D3C9] px-4 text-sm font-bold">{t("Cancel","إلغاء")}</button></div>
          </div>}
        </div>

        {/* feedback composer */}
        <div className="border-b border-[#EEEBE5] bg-[#FBFAF7] p-4" onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();void saveFeedback()}}}>
          <div className="text-sm font-bold">{t("Log what happened","سجل اللي حصل")}</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap">{outcomes.map(o=><button key={o.en} onClick={()=>setOutcome(outcome===o.en?"":o.en)} className={`h-10 rounded-lg px-2.5 text-xs sm:h-8 ${outcome===o.en?"border-2 border-[#17191E] bg-white font-bold":"border border-[#D8D3C9] bg-white font-semibold"}`}>{lang==="ar"?o.ar:o.en}{outcome===o.en?" ✓":""}</button>)}</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={t("What happened? What did you agree on?","حصل إيه؟ اتفقتوا على إيه؟")} className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#D8D3C9] bg-white p-3 text-sm outline-none focus:border-[#17191E]"/>
          <div className="mt-2 text-[11px] font-bold text-slate-500">{t("NEXT FOLLOW-UP","المتابعة الجاية")}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">{quick.map(q=>{const on=nextDate===q.date&&nextTime===q.time;return <button key={q.label} onClick={()=>{setNextDate(q.date);setNextTime(q.time)}} className={`h-9 rounded-full border px-3 text-xs font-semibold sm:h-8 ${on?"border-[#17191E] bg-[#17191E] text-white":"border-[#D8D3C9] bg-white"}`}>{q.label}</button>})}</div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input type="date" value={nextDate} onChange={e=>{setNextDate(e.target.value);if(e.target.value&&!nextTime)setNextTime("09:00")}} className={field} aria-label={t("Follow-up date","تاريخ المتابعة")}/>
            <input type="time" value={nextTime} disabled={!nextDate} onChange={e=>setNextTime(e.target.value)} className={`${field} w-28 disabled:bg-slate-100`} aria-label={t("Follow-up time","وقت المتابعة")}/>
          </div>
          <input value={nextAction} onChange={e=>setNextAction(e.target.value)} placeholder={t("Next step (e.g. send brochure)","الخطوة الجاية (مثلًا: ابعت البروشور)")} className={`${field} mt-2`}/>
          <div className="mt-3 flex items-center gap-2"><span className="hidden text-[11px] text-slate-500 sm:inline">{t("Ctrl + Enter to save · time saved automatically","Ctrl + Enter للحفظ · الوقت بيتسجل لوحده")}</span><button disabled={!canSave||saving} onClick={()=>void saveFeedback()} className="ms-auto h-11 w-full whitespace-nowrap rounded-xl bg-[#17191E] px-5 text-sm font-bold text-white disabled:opacity-40 sm:h-10 sm:w-auto">{saving?t("Saving…","جاري الحفظ…"):t("Save feedback","احفظ الفيدباك")}</button></div>
        </div>

        {/* history */}
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between"><div className="text-[11px] font-bold tracking-wide text-slate-500">{t("HISTORY","السجل")} · {Number(summary?.feedback_count||0)} {t("feedbacks","فيدباك")}</div><a href={`/sales-war-room/a/${encodeURIComponent(String(lead.agent_slug||""))||""}`} className="hidden"></a></div>
          {loadingLog&&!activities.length?<div className="text-xs text-slate-400">{t("Loading…","جاري التحميل…")}</div>:!activities.length?<div className="text-xs text-slate-400">{t("No history yet","مفيش سجل لسه")}</div>:
          <ol className="space-y-3">{activities.map((a:any)=><li key={a.id} className="flex gap-2.5">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.activity_type==="feedback"||a.activity_type==="legacy_note"?"bg-amber-600":a.actor_type==="manager"||a.actor_type==="owner"?"bg-blue-700":"bg-slate-400"}`}></span>
            <div className="min-w-0">
              <div className="text-xs text-slate-500"><b className="text-slate-900">{activityTitle(a,lang)}</b> · {a.actor_type==="agent"||!a.actor_type?"":`${a.actor_type} · `}{a.metadata?.crm_feedback_at_cairo?`${a.metadata.crm_feedback_at_cairo}`:fmtDateTime(a.created_at)}</div>
              <ActivityText a={a}/>
            </div>
          </li>)}</ol>}
        </div>
      </div>
    </aside>
  </>;
}

function activityTitle(a:any,lang:Lang){
  const ar=lang==="ar";
  if(a.activity_type==="feedback")return ar?"فيدباك":"Feedback";
  if(a.activity_type==="stage_change")return ar?"تغيير المرحلة":"Stage";
  if(a.activity_type==="followup_change")return ar?"تعديل المتابعة":"Follow-up";
  if(a.activity_type==="edit")return ar?"تعديل بيانات":"Edited";
  if(a.activity_type==="legacy_note")return ar?"ملاحظة قديمة":"Previous note";
  return ar?"إضافة العميل":"Client added";
}
function ActivityText({a}:{a:any}){
  if(a.activity_type==="feedback"||a.activity_type==="legacy_note")return <div className="whitespace-pre-wrap break-words text-sm leading-6">{a.body}</div>;
  if(a.activity_type==="stage_change")return <div className="text-sm">{a.from_stage?`${a.from_stage} → `:""}<b>{a.to_stage||"—"}</b></div>;
  if(a.activity_type==="followup_change"){const to=a.metadata?.to||{};return <div className="text-sm">{to.next_action||a.body||""}{to.next_action_date?<span className="text-xs text-slate-500"> · {to.next_action_date}{to.next_action_time?` ${timeShort(to.next_action_time)}`:""}</span>:null}</div>}
  if(a.activity_type==="edit")return <div className="text-xs text-slate-500">{(a.metadata?.fields||[]).join(" · ")}</div>;
  return null;
}

/* ================================================================== */
/* Add client                                                          */
/* ================================================================== */
function AddLeadModal({lang,t,onClose,onSave,warmProblem}:any){
  const [d,setD]=useState<Draft>({...emptyDraft});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const field="h-10 w-full rounded-lg border border-[#D8D3C9] bg-white px-3 text-sm outline-none focus:border-[#17191E]";
  async function save(){
    if(!d.client_name.trim())return setError(t("Client name is required","اسم العميل مطلوب"));
    if(d.expected_value.trim()&&!(Number(d.expected_value)>=0))return setError(t("Expected sale must be a number in millions","Expected لازم يكون رقم بالمليون"));
    if(warmProblem(d))return setError(t("Warm needs a Next step + a date (or trigger).","Warm محتاج خطوة جاية + ميعاد (أو Trigger)."));
    try{setSaving(true);setError("");await onSave(d)}catch(e:any){setError(e.message||"save_error")}finally{setSaving(false)}
  }
  return <div className="fixed inset-0 z-[55] grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl" onClick={e=>e.stopPropagation()} dir={lang==="ar"?"rtl":"ltr"}>
      <div className="mb-3 flex items-center"><div className="text-lg font-bold">{t("Add client","عميل جديد")}</div><button onClick={onClose} aria-label={t("Close","قفل")} className="ms-auto grid h-9 w-9 place-items-center rounded-lg border border-[#E4E0D8]"><IconX/></button></div>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Name *","الاسم *")}<input autoFocus value={d.client_name} onChange={e=>setD({...d,client_name:e.target.value})} className={field}/></label>
        <label className="text-[11px] font-bold text-slate-500">{t("Phone","الموبايل")}<input dir="ltr" value={d.phone} onChange={e=>setD({...d,phone:e.target.value})} className={field}/></label>
        <label className="text-[11px] font-bold text-slate-500">{t("Budget","الميزانية")}<input value={d.budget} onChange={e=>setD({...d,budget:e.target.value})} className={field}/></label>
        <label className="text-[11px] font-bold text-slate-500">{t("Expected (M EGP)","متوقع (بالمليون)")}<input type="number" min="0" step="0.1" value={d.expected_value} onChange={e=>setD({...d,expected_value:e.target.value})} className={field}/></label>
        <label className="text-[11px] font-bold text-slate-500">{t("Stage","المرحلة")}<select value={d.stage} onChange={e=>setD({...d,stage:e.target.value})} className={field}>{stages.map(s=><option key={s} value={s}>{stageLabel(s,lang)}</option>)}</select></label>
        <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Next step","الخطوة الجاية")}<input value={d.next_action} onChange={e=>setD({...d,next_action:e.target.value})} className={field}/></label>
        <label className="text-[11px] font-bold text-slate-500">{t("Follow-up date","تاريخ المتابعة")}<input type="date" min={todayLocal()} value={d.next_action_date} onChange={e=>setD({...d,next_action_date:e.target.value,next_action_time:e.target.value?(d.next_action_time||"09:00"):""})} className={field}/></label>
        <label className="text-[11px] font-bold text-slate-500">{t("Time","الوقت")}<input type="time" disabled={!d.next_action_date} value={d.next_action_time} onChange={e=>setD({...d,next_action_time:e.target.value})} className={`${field} disabled:bg-slate-100`}/></label>
        <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Trigger (optional)","Trigger (اختياري)")}<input value={d.next_action_trigger} onChange={e=>setD({...d,next_action_trigger:e.target.value})} className={field}/></label>
        <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Client context / first feedback","سياق العميل / أول فيدباك")}<textarea value={d.notes} onChange={e=>setD({...d,notes:e.target.value})} className="min-h-20 w-full rounded-lg border border-[#D8D3C9] p-2 text-sm outline-none focus:border-[#17191E]"/></label>
      </div>
      {error&&<div className="mt-2 text-sm font-semibold text-red-700">{error}</div>}
      <button disabled={saving} onClick={()=>void save()} className="mt-4 h-11 w-full rounded-xl bg-[#17191E] text-sm font-bold text-white disabled:opacity-50">{saving?t("Saving…","جاري الحفظ…"):t("Add client","ضيف العميل")}</button>
    </div>
  </div>;
}
