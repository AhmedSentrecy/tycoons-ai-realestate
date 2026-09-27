import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";
import { formatSalesEgp, normalizeSalesValue, salesInputToEgp, salesValueToMillions } from "../lib/salesWarRoomMoney";
import SalesWarRoomPeriodResults from "../components/SalesWarRoomPeriodResults";

/* ------------------------------------------------------------------ */
/* Sales War Room — Version 2 (merged: classic scoreboard + follow-ups) */
/* Same data and login as the classic page.                             */
/* ------------------------------------------------------------------ */

const LEAD_ACTIVITY_API = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room-lead-activity";
const VERSION_KEY = "warRoomVersion";

const stages = ["New Lead","Contacted","Cold","Warm","Hot / Very Potential","Hold","Meeting Scheduled","Meeting Held","Negotiation / Closing","Won","Lost / Dead"];
const closedStages = ["Won","Lost / Dead"];
const arStage: Record<string,string> = {"New Lead":"ليد جديد","Contacted":"تم التواصل","Cold":"Cold","Warm":"Warm","Hot / Very Potential":"Hot","Hold":"Hold","Meeting Scheduled":"ميعاد متحدد","Meeting Held":"تم الاجتماع","Negotiation / Closing":"تفاوض","Won":"مكسب","Lost / Dead":"خسارة"};
const shortStage: Record<string,string> = {"Hot / Very Potential":"Hot","Negotiation / Closing":"Negotiation","Meeting Scheduled":"Meeting","Meeting Held":"Met","Lost / Dead":"Lost"};
const stageTone: Record<string,string> = {
  "New Lead":"border-slate-300 bg-slate-50 text-slate-700","Contacted":"border-slate-300 bg-slate-50 text-slate-700","Cold":"border-sky-200 bg-sky-50 text-sky-800",
  "Warm":"border-amber-300 bg-amber-50 text-amber-800","Hot / Very Potential":"border-orange-300 bg-orange-50 text-orange-800","Hold":"border-slate-300 bg-slate-100 text-slate-600",
  "Meeting Scheduled":"border-blue-200 bg-blue-50 text-blue-800","Meeting Held":"border-blue-200 bg-blue-50 text-blue-800","Negotiation / Closing":"border-violet-200 bg-violet-50 text-violet-800",
  "Won":"border-emerald-300 bg-emerald-50 text-emerald-800","Lost / Dead":"border-red-200 bg-red-50 text-red-700"
};

/* Fixed lists (must match the edge function) */
const INTEREST_TYPES=["Apartment","Duplex","Penthouse","Studio","iVilla","Townhouse","Twin House","Villa","Chalet","Commercial"];
const arInterest:Record<string,string>={"Apartment":"شقة","Duplex":"دوبلكس","Penthouse":"بنتهاوس","Studio":"ستوديو","iVilla":"iVilla","Townhouse":"تاون هاوس","Twin House":"توين هاوس","Villa":"فيلا","Chalet":"شاليه","Commercial":"تجاري"};
const AREAS=["New Cairo","Mostakbal City","New Capital","Sheikh Zayed","6th of October","North Coast","Ain Sokhna","Other"];
const arArea:Record<string,string>={"New Cairo":"التجمع","Mostakbal City":"مستقبل سيتي","New Capital":"العاصمة","Sheikh Zayed":"زايد","6th of October":"أكتوبر","North Coast":"الساحل","Ain Sokhna":"السخنة","Other":"أخرى"};
const LOST_REASONS=["Price","Location","Delivery date","Payment plan","Bought elsewhere","Not reachable","Not serious","Other"];
const arLost:Record<string,string>={"Price":"السعر","Location":"المكان","Delivery date":"ميعاد الاستلام","Payment plan":"نظام السداد","Bought elsewhere":"اشترى من حد تاني","Not reachable":"مبيردش","Not serious":"مش جاد","Other":"سبب تاني"};
const MEETING_LOCATIONS=["Office","Site","Online","Developer office"];
const arMeeting:Record<string,string>={"Office":"المكتب","Site":"الموقع","Online":"أونلاين","Developer office":"مكتب المطور"};
const BUDGET_RANGES=[{id:"all",en:"Budget: Any",ar:"الميزانية: الكل",min:0,max:Infinity},{id:"u3",en:"Under 3M",ar:"أقل من 3M",min:0,max:3},{id:"3-6",en:"3M – 6M",ar:"3 – 6M",min:3,max:6},{id:"6-10",en:"6M – 10M",ar:"6 – 10M",min:6,max:10},{id:"10-20",en:"10M – 20M",ar:"10 – 20M",min:10,max:20},{id:"20+",en:"20M +",ar:"20M +",min:20,max:Infinity}];
/* Days without contact before a client is "going cold", by stage */
const COLD_AFTER:Record<string,number>={"Hot / Very Potential":2,"Negotiation / Closing":2,"Warm":5,"Meeting Scheduled":5,"Meeting Held":5};
const coldAfter=(stage:string)=>COLD_AFTER[stage]??7;

const outcomes=[{en:"No answer",ar:"مردش"},{en:"Answered",ar:"رد"},{en:"Sent details",ar:"بعت تفاصيل"},{en:"Meeting booked",ar:"حجز ميعاد"},{en:"Not interested",ar:"مش مهتم"}];

type View="followups"|"table"|"stages"|"board"|"calendar"|"funnel";
type Lang="en"|"ar";
type Quick="overdue"|"today"|"nonext"|"cold"|"expected";
type Filters={stage:string;interest:string[];area:string;campaign:string;budget:string;quick:Quick[];sort:string;showClosed:boolean};
const emptyFilters:Filters={stage:"all",interest:[],area:"all",campaign:"all",budget:"all",quick:[],sort:"due",showClosed:false};
type Draft={client_name:string;phone:string;budget:string;expected_value:string;stage:string;next_action:string;next_action_date:string;next_action_time:string;next_action_trigger:string;notes:string;interest_types:string[];areas:string[];closing_keys:string[];budget_min:string;budget_max:string;lost_reason:string;meeting_date:string;meeting_time:string;meeting_location:string};
const emptyDraft:Draft={client_name:"",phone:"",budget:"",expected_value:"",stage:"New Lead",next_action:"",next_action_date:"",next_action_time:"",next_action_trigger:"",notes:"",interest_types:[],areas:[],closing_keys:["",""],budget_min:"",budget_max:"",lost_reason:"",meeting_date:"",meeting_time:"",meeting_location:""};

/* ---------------- helpers ---------------- */
function pad(n:number){return String(n).padStart(2,"0")}
function toYmd(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function todayLocal(){return toYmd(new Date())}
function addDays(n:number){const d=new Date();d.setDate(d.getDate()+n);return toYmd(d)}
function phoneForCall(phone:string){return String(phone||"").replace(/[^\d+]/g,"")}
function phoneForWhatsApp(phone:string){let digits=String(phone||"").replace(/\D/g,"");if(digits.startsWith("00"))digits=digits.slice(2);if(/^01\d{9}$/.test(digits))digits=`20${digits.slice(1)}`;return digits}
function isTouchDevice(){try{return window.matchMedia("(pointer: coarse)").matches}catch{return false}}
function whatsappLink(phone:string){const n=phoneForWhatsApp(phone);if(!n)return "";return isTouchDevice()?`whatsapp://send?phone=${n}`:`https://web.whatsapp.com/send?phone=${n}`}
function timeShort(v:any){return String(v||"").slice(0,5)}
function arr(v:any):string[]{return Array.isArray(v)?v.map(String).filter(Boolean):[]}
function parseCairoWall(text:any){const s=String(text||"").trim();if(!s)return null;const d=new Date(s.replace(" ","T"));return Number.isNaN(d.getTime())?null:d}
function lastTouchDate(lead:any,summary:any){
  const c=[summary?.last_activity_at,summary?.last_feedback_at,lead.updated_at,lead.created_at].map(v=>v?new Date(v):null);
  const crm=parseCairoWall(lead.crm_last_feedback_at_cairo);if(crm)c.push(crm);
  const valid=c.filter((d):d is Date=>Boolean(d)&&!Number.isNaN((d as Date).getTime()));
  return valid.length?valid.reduce((a,b)=>a>b?a:b):null;
}
function daysSince(d:Date|null){return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null}
function touchLabel(d:Date|null,lang:Lang){if(!d)return "—";const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(m<60)return lang==="ar"?`${m} د`:`${m}m`;const h=Math.floor(m/60);if(h<24)return lang==="ar"?`${h} س`:`${h}h`;const dd=Math.floor(h/24);return lang==="ar"?`${dd} يوم`:`${dd}d`}
function isCold(lead:any,summary:any){if(closedStages.includes(lead.stage))return false;const d=daysSince(lastTouchDate(lead,summary));return d!==null&&d>=coldAfter(lead.stage)}
function touchTone(lead:any,summary:any){const d=daysSince(lastTouchDate(lead,summary));if(d===null)return "bg-slate-100 text-slate-600";const lim=coldAfter(lead.stage);if(d>=lim)return "bg-red-100 text-red-800";if(d>=Math.ceil(lim/2))return "bg-amber-100 text-amber-900";return "bg-emerald-100 text-emerald-800"}
function fmtDateTime(v:any){if(!v)return "—";try{return new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Cairo",day:"2-digit",month:"short",hour:"numeric",minute:"2-digit"}).format(new Date(v))}catch{return String(v)}}
function dueInfo(lead:any,lang:Lang){
  const today=todayLocal();const t=(en:string,ar:string)=>lang==="ar"?ar:en;const d=lead.next_action_date;const time=timeShort(lead.next_action_time);
  if(!d){if(String(lead.next_action_trigger||"").trim())return {kind:"trigger",label:"Trigger",tone:"bg-slate-100 text-slate-700"};return {kind:"none",label:t("No date","مفيش ميعاد"),tone:"bg-red-50 text-red-800"}}
  if(d<today){const late=Math.round((new Date(today).getTime()-new Date(d).getTime())/86400000);return {kind:"over",label:t(`${late}d late`,`متأخر ${late} يوم`),tone:"bg-red-700 text-white"}}
  if(d===today)return {kind:"today",label:`${t("Today","النهاردة")}${time?` ${time}`:""}`,tone:"bg-amber-100 text-amber-900"};
  if(d===addDays(1))return {kind:"soon",label:`${t("Tomorrow","بكرة")}${time?` ${time}`:""}`,tone:"bg-slate-100 text-slate-700"};
  return {kind:d<=addDays(7)?"week":"later",label:d.slice(5).split("-").reverse().join("/"),tone:"bg-slate-100 text-slate-700"};
}
function stageLabel(s:string,lang:Lang){return lang==="ar"?(arStage[s]||s):(shortStage[s]||s)}
function listLabel(v:string,lang:Lang,map:Record<string,string>){return lang==="ar"?(map[v]||v):v}
function budgetMillions(v:any){const n=normalizeSalesValue(v);return n?n/1_000_000:null}
function budgetText(lead:any){
  const a=budgetMillions(lead.budget_min),b=budgetMillions(lead.budget_max);const f=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
  if(a!==null&&b!==null)return `${f(a)}–${f(b)}M`;if(a!==null)return `${f(a)}M+`;if(b!==null)return `≤${f(b)}M`;return String(lead.budget||"");
}
function budgetMatches(lead:any,rangeId:string){
  if(rangeId==="all")return true;const r=BUDGET_RANGES.find(x=>x.id===rangeId);if(!r)return true;
  const a=budgetMillions(lead.budget_min),b=budgetMillions(lead.budget_max);if(a===null&&b===null)return false;
  const lo=a??b??0,hi=b??a??0;return hi>=r.min&&lo<r.max;
}
function sortByDue(a:any,b:any){const ad=a.next_action_date||"9999-99-99",bd=b.next_action_date||"9999-99-99";return ad.localeCompare(bd)||timeShort(a.next_action_time).localeCompare(timeShort(b.next_action_time))||String(a.client_name||"").localeCompare(String(b.client_name||""))}
function sortManual(a:any,b:any){return Number(b.sort_position||0)-Number(a.sort_position||0)||sortByDue(a,b)}
function leadToDraft(x:any):Draft{const keys=arr(x.closing_keys);return {client_name:x.client_name||"",phone:x.phone||"",budget:x.budget||"",expected_value:salesValueToMillions(x.expected_value),stage:x.stage||"New Lead",next_action:x.next_action||"",next_action_date:x.next_action_date||"",next_action_time:timeShort(x.next_action_time),next_action_trigger:x.next_action_trigger||"",notes:x.notes||"",interest_types:arr(x.interest_types),areas:arr(x.areas),closing_keys:[keys[0]||"",keys[1]||""],budget_min:salesValueToMillions(x.budget_min),budget_max:salesValueToMillions(x.budget_max),lost_reason:x.lost_reason||"",meeting_date:x.meeting_date||"",meeting_time:timeShort(x.meeting_time),meeting_location:x.meeting_location||""}}
function errorText(code:string,lang:Lang){
  const ar=lang==="ar";
  const map:Record<string,[string,string]>={
    warm_requires_next_action:["Warm needs a Next step + a date (or trigger).","Warm محتاج خطوة جاية + ميعاد (أو Trigger)."],
    lost_reason_required:["Choose why the client was lost.","اختار سبب الخسارة."],
    meeting_details_required:["Meeting needs date, time and place.","الميعاد محتاج تاريخ ووقت ومكان."],
    invalid_budget_range:["Budget 'from' is bigger than 'to'.","الميزانية 'من' أكبر من 'لحد'."],
    invalid_budget:["Budget must be a number in millions.","الميزانية لازم تكون رقم بالمليون."],
    invalid_expected_value:["Expected sale must be a number in millions.","البيعة المتوقعة لازم تكون رقم بالمليون."],
  };
  const m=map[code];return m?(ar?m[1]:m[0]):code;
}

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
  const filterKey=`warRoomV2Filters:${slug}`;
  const stripKey=`warRoomV2Strip:${slug}`;
  const ownerToken=localStorage.getItem("warRoomAdminToken")||"";
  const isOwnerView=Boolean(ownerToken);
  const [lang,setLang]=useState<Lang>((localStorage.getItem("warRoomLang") as Lang)||"en");
  const [token,setToken]=useState(()=>localStorage.getItem(sessionKey)||"");
  const [password,setPassword]=useState("");
  const [data,setData]=useState<any>(null);
  const [leaders,setLeaders]=useState<any>(null);
  const [period,setPeriod]=useState<any>(null);
  const [summary,setSummary]=useState<Record<string,any>>({});
  const [loading,setLoading]=useState(Boolean(token||ownerToken));
  const [err,setErr]=useState("");
  const [toast,setToast]=useState("");
  const [view,setView]=useState<View>(()=>(localStorage.getItem(viewKey) as View)||"followups");
  const [filters,setFilters]=useState<Filters>(()=>{try{return {...emptyFilters,...JSON.parse(localStorage.getItem(filterKey)||"{}")}}catch{return {...emptyFilters}}});
  const [stripOpen,setStripOpen]=useState(()=>localStorage.getItem(stripKey)!=="closed");
  const [query,setQuery]=useState("");
  const [stageTab,setStageTab]=useState("Warm");
  const [selectedId,setSelectedId]=useState("");
  const [adding,setAdding]=useState(false);
  const [showResults,setShowResults]=useState(false);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [stageAsk,setStageAsk]=useState<{lead:any;stage:string}|null>(null);
  const searchRef=useRef<HTMLInputElement|null>(null);
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  function clearSession(){localStorage.removeItem(sessionKey);setToken("");setData(null)}
  function flash(msg:string){setToast(msg);window.setTimeout(()=>setToast(""),3800)}
  function flashError(e:any){flash(errorText(String(e?.message||e),lang))}

  async function loadSide(activeToken:string){
    try{const r=await fetch(`${LEAD_ACTIVITY_API}?summary=1`,{headers:{"x-agent-token":activeToken}});const d=await r.json().catch(()=>({}));if(r.ok)setSummary(d.summary||{})}catch{/* optional */}
    salesWarRoomApi.getLeaders(activeToken).then(setLeaders).catch(()=>{});
    salesWarRoomApi.getAgentPeriodResults(activeToken).then(setPeriod).catch(()=>{});
  }
  async function load(){
    if(!token){setLoading(false);return}
    try{setLoading(true);const agentData=await salesWarRoomApi.getAgent(slug,token);setData(agentData);setErr("");void loadSide(token)}
    catch(e:any){if(e.message==="unauthorized"){clearSession();setErr(t("Session expired. Enter your password again.","انتهت جلسة الدخول. اكتب الباسورد مرة تانية."))}else setErr(e.message)}
    finally{setLoading(false)}
  }
  async function bootstrapOwnerAccess(){
    if(token||!ownerToken)return;
    try{setLoading(true);setErr("");const r=await salesWarRoomApi.adminAgentAccess(ownerToken,slug);localStorage.setItem(sessionKey,r.token);setToken(r.token)}
    catch(e:any){if(e.message==="unauthorized")localStorage.removeItem("warRoomAdminToken");setErr(e.message)}finally{setLoading(false)}
  }
  async function login(){
    try{setLoading(true);setErr("");const r=await salesWarRoomApi.agentLogin(slug,password);localStorage.setItem(sessionKey,r.token);setToken(r.token);setPassword("")}
    catch(e:any){setErr(e.message==="invalid_credentials"?t("Wrong password","الباسورد غير صحيح"):e.message)}finally{setLoading(false)}
  }
  function goClassic(){localStorage.setItem(VERSION_KEY,"v1");window.location.href=`/sales-war-room/a/${slug}`}

  useEffect(()=>{document.title="Sales War Room";const m=document.createElement("meta");m.name="robots";m.content="noindex,nofollow,noarchive";document.head.appendChild(m);return()=>m.remove()},[]);
  useEffect(()=>{localStorage.setItem(VERSION_KEY,"v2");if(slug)localStorage.setItem("warRoomLastAgent",slug)},[slug]);
  useEffect(()=>{if(token)void load();else if(ownerToken)void bootstrapOwnerAccess();else setLoading(false)},[slug,token]);
  useEffect(()=>{localStorage.setItem("warRoomLang",lang);document.documentElement.dir=lang==="ar"?"rtl":"ltr"},[lang]);
  useEffect(()=>{localStorage.setItem(viewKey,view)},[view,viewKey]);
  useEffect(()=>{try{localStorage.setItem(filterKey,JSON.stringify(filters))}catch{/* ignore */}},[filters,filterKey]);
  useEffect(()=>{localStorage.setItem(stripKey,stripOpen?"open":"closed")},[stripOpen,stripKey]);
  useEffect(()=>{
    function onKey(e:KeyboardEvent){const tag=(e.target as HTMLElement)?.tagName;if(e.key==="/"&&tag!=="INPUT"&&tag!=="TEXTAREA"&&tag!=="SELECT"){e.preventDefault();searchRef.current?.focus()}if(e.key==="Escape"&&tag!=="INPUT"&&tag!=="TEXTAREA"){setSelectedId("");setAdding(false)}}
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[]);

  const pipeline:any[]=useMemo(()=>data?.pipeline||[],[data]);
  const score=data?.score||{};
  const campaigns=useMemo(()=>[...new Set<string>(pipeline.map((x:any)=>String(x.campaign||"").trim()).filter(Boolean))].sort(),[pipeline]);
  const today=todayLocal();

  /* filters except stage/interest (so chip counts stay meaningful) */
  const baseFiltered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return pipeline.filter((x:any)=>{
      if(filters.campaign!=="all"&&String(x.campaign||"")!==filters.campaign)return false;
      if(filters.area!=="all"&&!arr(x.areas).includes(filters.area))return false;
      if(!budgetMatches(x,filters.budget))return false;
      for(const qf of filters.quick){
        if(qf==="overdue"&&!(x.next_action_date&&x.next_action_date<today))return false;
        if(qf==="today"&&x.next_action_date!==today)return false;
        if(qf==="nonext"&&(x.next_action_date||String(x.next_action_trigger||"").trim()))return false;
        if(qf==="cold"&&!isCold(x,summary[String(x.id)]))return false;
        if(qf==="expected"&&!normalizeSalesValue(x.expected_value))return false;
      }
      if(q){const hay=`${x.client_name||""} ${x.phone||""} ${x.budget||""} ${x.next_action||""} ${x.notes||""} ${x.campaign||""} ${arr(x.closing_keys).join(" ")}`.toLowerCase();if(!hay.includes(q))return false}
      return true;
    });
  },[pipeline,query,filters,summary,today]);
  const filtered=useMemo(()=>baseFiltered.filter((x:any)=>{
    if(filters.stage!=="all"&&x.stage!==filters.stage)return false;
    if(filters.stage==="all"&&!filters.showClosed&&view!=="stages"&&view!=="funnel"&&closedStages.includes(x.stage))return false;
    if(filters.interest.length&&!arr(x.interest_types).some(i=>filters.interest.includes(i)))return false;
    return true;
  }),[baseFiltered,filters,view]);
  const selected=pipeline.find((x:any)=>String(x.id)===selectedId)||null;
  const activeFilterCount=(filters.stage!=="all"?1:0)+filters.interest.length+(filters.area!=="all"?1:0)+(filters.campaign!=="all"?1:0)+(filters.budget!=="all"?1:0)+filters.quick.length;

  /* ---------- writes ---------- */
  function warmProblem(x:{stage:string;next_action:string;next_action_date:string;next_action_trigger:string}){return x.stage==="Warm"&&(!String(x.next_action||"").trim()||(!x.next_action_date&&!String(x.next_action_trigger||"").trim()))}
  async function patchLead(id:string,body:Record<string,unknown>){await salesWarRoomApi.updateLead(token,{id,rules:"v3",...body});await load()}
  function requestStage(lead:any,stage:string){
    if(stage===lead.stage)return;
    if(stage==="Lost / Dead"||stage==="Meeting Scheduled"){setStageAsk({lead,stage});return}
    if(warmProblem({stage,next_action:lead.next_action,next_action_date:lead.next_action_date,next_action_trigger:lead.next_action_trigger})){setSelectedId(String(lead.id));flash(t("Warm needs a Next step + a date. Set it in the panel first.","Warm محتاج خطوة جاية + ميعاد. حددها من الـPanel الأول."));return}
    void (async()=>{try{await patchLead(String(lead.id),{stage});flash(t("Stage updated","اتغيرت المرحلة"))}catch(e:any){flashError(e)}})();
  }
  async function reorder(ids:string[]){try{await salesWarRoomApi.reorderLeads(token,ids);await load()}catch{flash(t("Could not save order.","مقدرناش نحفظ الترتيب."))}}

  /* ---------- scoreboard actions (same rules as classic) ---------- */
  const matches=[1,2,3,4].map(i=>({i,calls:Number(score[`match${i}_calls`]||0),status:String(score[`match${i}_status`]||"open")}));
  async function changeCalls(i:number,delta:number){
    const m=matches[i-1];if(m.status!=="open")return;
    for(let x=1;x<i;x++)if(matches[x-1].status==="open"){flash(t(`Finish Match ${x} first.`,`اقفل Match ${x} الأول.`));return}
    const calls=Math.max(0,Math.min(50,m.calls+delta));const body:any={slug,[`match${i}_calls`]:calls};if(calls===50)body[`match${i}_status`]="win";
    try{await salesWarRoomApi.patchScore(token,body);await load()}catch(e:any){flashError(e)}
  }
  async function finishMatch(i:number){
    const m=matches[i-1];if(m.status!=="open")return;
    if(m.calls<50&&!window.confirm(t(`Record Match ${i} as LOSS at ${m.calls}/50?`,`نسجل Match ${i} خسارة عند ${m.calls}/50؟`)))return;
    try{await salesWarRoomApi.patchScore(token,{slug,[`match${i}_calls`]:m.calls,[`match${i}_status`]:m.calls===50?"win":"loss"});await load()}catch(e:any){flashError(e)}
  }
  async function potential(d:number){try{await salesWarRoomApi.patchScore(token,{slug,potential_cases:Math.max(0,Number(score.potential_cases||0)+d)});await load()}catch(e:any){flashError(e)}}

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
  const rowProps={lang,t,summary,token,selectedId,onOpen:(id:string)=>setSelectedId(id),onStage:requestStage};
  const warm=pipeline.filter((l:any)=>l.stage==="Warm").length;
  const hot=pipeline.filter((l:any)=>l.stage==="Hot / Very Potential").length;
  const expected=pipeline.filter((l:any)=>["Warm","Hot / Very Potential"].includes(l.stage)).reduce((s:number,l:any)=>s+normalizeSalesValue(l.expected_value),0);
  const lost=pipeline.filter((l:any)=>l.stage==="Lost / Dead").reduce((s:number,l:any)=>s+normalizeSalesValue(l.expected_value),0);
  const wonRows=pipeline.filter((l:any)=>l.stage==="Won");const won=wonRows.reduce((s:number,l:any)=>s+(normalizeSalesValue(l.won_value)||normalizeSalesValue(l.expected_value)),0);
  const activeCount=pipeline.filter((l:any)=>!closedStages.includes(l.stage)).length;
  const week=(()=>{const p=period?.agents?.[0]?.periods?.current_week||{};return {wins:Number(p.wins||0),losses:Number(p.losses||0),meetings:Number(p.meetings_scheduled||0)}})();
  const leaderName=(items:any[]|undefined)=>items?.length?(lang==="ar"?(items[0].name_ar||items[0].name_en):(items[0].name_en||items[0].name_ar)):"—";
  const setF=(patch:Partial<Filters>)=>setFilters(f=>({...f,...patch}));
  const toggleQuick=(q:Quick)=>setFilters(f=>({...f,quick:f.quick.includes(q)?f.quick.filter(x=>x!==q):[...f.quick,q]}));
  const toggleInterest=(i:string)=>setFilters(f=>({...f,interest:f.interest.includes(i)?f.interest.filter(x=>x!==i):[...f.interest,i]}));
  const countStage=(s:string)=>baseFiltered.filter((x:any)=>s==="all"?(filters.showClosed||!closedStages.includes(x.stage)):x.stage===s).length;
  const countInterest=(i:string)=>baseFiltered.filter((x:any)=>arr(x.interest_types).includes(i)&&(filters.stage==="all"?(filters.showClosed||!closedStages.includes(x.stage)):x.stage===filters.stage)).length;
  const quickCount=(q:Quick)=>pipeline.filter((x:any)=>!closedStages.includes(x.stage)&&(q==="overdue"?(x.next_action_date&&x.next_action_date<today):q==="today"?x.next_action_date===today:q==="nonext"?(!x.next_action_date&&!String(x.next_action_trigger||"").trim()):q==="cold"?isCold(x,summary[String(x.id)]):normalizeSalesValue(x.expected_value)>0)).length;
  const chip=(on:boolean,extra="")=>`h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs ${on?"border-[#17191E] bg-[#17191E] font-bold text-white":`border-[#D8D3C9] bg-white font-semibold ${extra}`}`;

  return <main className="min-h-screen bg-[#F3F1EC] text-[#17191E]" dir={lang==="ar"?"rtl":"ltr"} style={{fontFamily:"'IBM Plex Sans Arabic', system-ui, sans-serif"}}>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"/>

    {/* ---------- top bar ---------- */}
    <header className="sticky top-0 z-30 bg-[#17191E] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-3 py-2.5 md:px-6">
        <div className="min-w-0"><div className="text-[10px] font-bold tracking-[.18em] text-slate-400">TYCOONS · SALES WAR ROOM</div><div className="truncate text-base font-bold">{name}</div></div>
        <label className="order-3 flex h-10 w-full items-center gap-2 rounded-xl bg-[#2A2D34] px-3 text-slate-300 md:order-none md:ms-4 md:w-80"><IconSearch/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("Search my clients…  ( / )","دور في عملائي…  ( / )")} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"/></label>
        <div data-war-room-actions className="ms-auto flex items-center gap-2 text-xs">
          <button onClick={goClassic} className="h-9 whitespace-nowrap rounded-xl border border-slate-600 px-3 font-bold text-white hover:bg-white/10"><span className="md:hidden">V1</span><span className="hidden md:inline">{t("Classic version","النسخة القديمة")}</span></button>
          <button onClick={()=>setLang(lang==="ar"?"en":"ar")} className="h-9 rounded-xl border border-slate-600 px-3 font-bold text-white hover:bg-white/10">{lang==="ar"?"EN":"عربي"}</button>
          {isOwnerView?<button onClick={()=>window.location.href="/sales-war-room/admin"} className="h-9 rounded-xl border border-slate-600 px-3 font-bold text-white">Owner</button>:<button onClick={clearSession} className="hidden h-9 rounded-xl border border-slate-600 px-3 font-bold text-white md:block">{t("Logout","خروج")}</button>}
          <button onClick={()=>setAdding(true)} className="h-9 whitespace-nowrap rounded-xl bg-[#F2B544] px-3 text-sm font-bold text-[#17191E]">+ {t("Add client","عميل جديد")}</button>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-[1600px] px-3 pt-3 md:px-6">
      {/* ---------- scoreboard strip ---------- */}
      {stripOpen?<section aria-label="Scoreboard" className="flex gap-2.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-[minmax(360px,1.6fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)_minmax(0,1.4fr)_40px] lg:overflow-visible">
        <div className="min-w-[340px] shrink-0 rounded-2xl bg-[#17191E] p-3 text-white lg:min-w-0">
          <div className="flex items-baseline gap-2"><span className="text-[10px] font-bold tracking-[.1em] text-slate-400">{t("TODAY'S MATCHES","ماتشات النهاردة")}</span><span className="ms-auto font-mono text-sm font-semibold">{matches.reduce((a,m)=>a+m.calls,0)}<span className="text-[11px] text-slate-400">/200</span></span><span className="text-[11px] font-bold text-emerald-300">W{matches.filter(m=>m.status==="win").length}</span><span className="text-[11px] font-bold text-red-300">L{matches.filter(m=>m.status==="loss").length}</span></div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">{matches.map(m=>{const live=m.status==="open"&&matches.slice(0,m.i-1).every(x=>x.status!=="open");const tone=m.status==="win"?"bg-emerald-50 text-emerald-800":m.status==="loss"?"bg-red-50 text-red-800":live?"bg-white text-[#17191E]":"bg-[#2A2D34] text-slate-400";return <div key={m.i} className={`min-w-0 rounded-lg p-1.5 ${tone}`}>
            <div className="flex justify-between text-[10px] font-bold"><span>M{m.i}</span><span>{m.status==="open"?(live?t("LIVE","شغال"):"—"):m.status.toUpperCase()}</span></div>
            <div className="font-mono text-base font-semibold">{m.calls}<span className="text-[10px] opacity-70">/50</span></div>
            {live&&<div className="mt-1 flex gap-1"><button aria-label={t("Minus call","مكالمة −")} onClick={()=>void changeCalls(m.i,-1)} className="h-7 flex-1 rounded-md border border-[#D8D3C9] text-sm font-bold">−</button><button aria-label={t("Add call","مكالمة +")} onClick={()=>void changeCalls(m.i,1)} className="h-7 flex-1 rounded-md bg-[#17191E] text-sm font-bold text-white">+</button></div>}
            {live&&<button onClick={()=>void finishMatch(m.i)} className="mt-1 w-full text-[10px] font-bold text-slate-500 underline">{t("Finish","اقفل")}</button>}
          </div>})}</div>
        </div>
        <StatCard label="WARM PIPELINE" danger={warm<10}><span className="font-mono text-xl font-semibold">{warm}<span className="text-xs text-slate-500"> / 10</span></span><div className="h-1.5 rounded-full bg-[#EEEBE5]"><div className={`h-1.5 rounded-full ${warm<10?"bg-red-600":"bg-emerald-700"}`} style={{width:`${Math.min(100,warm*10)}%`}}></div></div><span className={`text-[11px] font-bold ${warm<10?"text-red-700":"text-emerald-800"}`}>{warm<10?t("RED ALERT — build pipeline","إنذار أحمر — ابني Pipeline"):t("Protected","آمن")}</span></StatCard>
        <StatCard label={t("POTENTIAL TODAY","POTENTIAL النهاردة")}><span className="font-mono text-xl font-semibold">{score.potential_cases||0}<span className="text-xs text-slate-500"> / ~5</span></span><div className="flex gap-1"><button aria-label="−" onClick={()=>void potential(-1)} className="h-7 w-8 rounded-md border border-[#D8D3C9] font-bold">−</button><button aria-label="+" onClick={()=>void potential(1)} className="h-7 w-8 rounded-md bg-[#17191E] font-bold text-white">+</button></div></StatCard>
        <StatCard label={t("MEETINGS · WEEK","MEETINGS الأسبوع")}><span className="font-mono text-xl font-semibold">{week.meetings}<span className="text-xs text-slate-500"> / 8</span></span><span className="text-[11px] text-slate-600">Hot: {hot} · {t("Week","الأسبوع")} W{week.wins} L{week.losses}</span></StatCard>
        <StatCard label={t("EXPECTED SALES","المبيعات المتوقعة")}><span className="font-mono text-xl font-semibold text-emerald-700">{formatSalesEgp(expected).replace("EGP ","")}</span><span className="text-[11px] font-bold text-emerald-800">{t("Won","مكسب")} {formatSalesEgp(won).replace("EGP ","")} · {wonRows.length} {t("deals","ديل")}</span><span className="text-[11px] font-bold text-red-700">{t("Lost","ضايع")} {formatSalesEgp(lost).replace("EGP ","")}</span></StatCard>
        <StatCard label={t("WHO'S LEADING","مين متصدر")}><div className="text-xs leading-5"><b>{t("Today","النهاردة")}</b> · {t("calls","مكالمات")} {leaderName(leaders?.daily?.calls)} · hot {leaderName(leaders?.daily?.hot)}</div><div className="text-xs leading-5"><b>{t("Week","الأسبوع")}</b> · {t("calls","مكالمات")} {leaderName(leaders?.weekly?.calls)} · hot {leaderName(leaders?.weekly?.hot)}</div><button onClick={()=>setShowResults(true)} className="text-start text-[11px] font-bold underline">{t("Period results · Rules →","النتايج · القواعد ←")}</button></StatCard>
        <button aria-label={t("Hide scoreboard","اخفي الـScoreboard")} onClick={()=>setStripOpen(false)} className="shrink-0 rounded-2xl border border-[#E4E0D8] bg-white px-3 font-bold text-slate-500">▴</button>
      </section>:<button onClick={()=>setStripOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-[#E4E0D8] bg-white px-4 py-2 text-xs font-semibold text-slate-600"><span>{t("Scoreboard","الـScoreboard")}</span><span className="font-mono">{matches.reduce((a,m)=>a+m.calls,0)}/200</span><span className={warm<10?"font-bold text-red-700":""}>Warm {warm}/10</span><span className="ms-auto">▾</span></button>}
      {warm<10&&stripOpen&&<div className="mt-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-bold text-red-800">{t("Warm is below 10 — pipeline generation comes first.","الـWarm أقل من 10 — بناء الـPipeline له الأولوية.")}</div>}

      {/* ---------- title + views ---------- */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div><div className="text-xl font-bold">{t("My clients","عملائي")} <span className="font-mono text-base text-slate-500">{activeCount}</span></div><div className="text-xs text-slate-500">{t("Follow-ups first · drag ⋮⋮ to reorder in Board / By stage","المتابعات الأول · اسحب ⋮⋮ للترتيب في Board / حسب المرحلة")}</div></div>
        <nav aria-label="Views" className="flex max-w-full gap-0.5 overflow-x-auto rounded-xl bg-[#E4E0D8] p-1 md:ms-4">
          {([["followups",t("Follow-ups","متابعات")],["table",t("Table","جدول")],["stages",t("By stage","حسب المرحلة")],["board","Board ⇅"],["calendar",t("Calendar","تقويم")],["funnel","Funnel"]] as [View,string][]).map(([v,label])=><button key={v} onClick={()=>setView(v)} className={`h-9 whitespace-nowrap rounded-lg px-3.5 text-sm ${view===v?"bg-white font-bold shadow-sm":"font-semibold text-slate-600 hover:text-slate-900"}`}>{label}</button>)}
        </nav>
      </div>

      {/* ---------- filters ---------- */}
      <button onClick={()=>setFiltersOpen(!filtersOpen)} className="mt-3 flex h-10 w-full items-center justify-between rounded-xl border border-[#D8D3C9] bg-white px-4 text-sm font-bold md:hidden"><span>{t("Filters","الفلاتر")}{activeFilterCount?` (${activeFilterCount})`:""}</span><span>{filtersOpen?"▴":"▾"}</span></button>
      <section aria-label="Filters" className={`mt-3 space-y-2 ${filtersOpen?"block":"hidden"} md:block`}>
        <FilterRow label={t("STAGE","المرحلة")}>
          <button onClick={()=>setF({stage:"all"})} className={chip(filters.stage==="all")}>{t("All","الكل")} <span className="font-mono opacity-70">{countStage("all")}</span></button>
          {stages.map(s=><button key={s} onClick={()=>setF({stage:filters.stage===s?"all":s})} className={chip(filters.stage===s)}>{stageLabel(s,lang)} <span className="font-mono opacity-70">{countStage(s)}</span></button>)}
        </FilterRow>
        <FilterRow label={t("INTEREST","الاهتمام")}>
          {INTEREST_TYPES.map(i=>{const on=filters.interest.includes(i);return <button key={i} onClick={()=>toggleInterest(i)} className={`h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs ${on?"border-blue-900 bg-blue-50 font-bold text-blue-900":"border-[#D8D3C9] bg-white font-semibold"}`}>{listLabel(i,lang,arInterest)} <span className="font-mono opacity-70">{countInterest(i)}</span></button>})}
        </FilterRow>
        <FilterRow label={t("QUICK","سريع")} wrap>
          {([["overdue",t("Overdue","متأخر"),"text-red-800"],["today",t("Due today","النهاردة"),"text-amber-900"],["nonext",t("No next step","من غير متابعة"),"text-slate-800"],["cold",t("Going cold","بيبرد"),"text-red-800"],["expected",t("Has expected sale","ليه بيعة متوقعة"),""]] as [Quick,string,string][]).map(([q,label,tone])=><button key={q} onClick={()=>toggleQuick(q)} className={chip(filters.quick.includes(q),tone)}>{label} <span className="font-mono opacity-70">{quickCount(q)}</span></button>)}
          <span className="hidden flex-1 md:block"></span>
          <select aria-label="Area" value={filters.area} onChange={e=>setF({area:e.target.value})} className="h-8 rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold"><option value="all">{t("Area: All","المنطقة: الكل")}</option>{AREAS.map(a=><option key={a} value={a}>{listLabel(a,lang,arArea)}</option>)}</select>
          <select aria-label="Campaign" value={filters.campaign} onChange={e=>setF({campaign:e.target.value})} className="h-8 max-w-[180px] rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold"><option value="all">{t("Campaign: All","الحملة: الكل")}</option>{campaigns.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select aria-label="Budget" value={filters.budget} onChange={e=>setF({budget:e.target.value})} className="h-8 rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold">{BUDGET_RANGES.map(b=><option key={b.id} value={b.id}>{lang==="ar"?b.ar:b.en}</option>)}</select>
          <select aria-label="Sort" value={filters.sort} onChange={e=>setF({sort:e.target.value})} className="h-8 rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold"><option value="due">{t("Sort: Due date","ترتيب: الميعاد")}</option><option value="touch">{t("Sort: Last touch","ترتيب: آخر تواصل")}</option><option value="value">{t("Sort: Expected sale","ترتيب: البيعة المتوقعة")}</option><option value="name">{t("Sort: Name","ترتيب: الاسم")}</option></select>
          <label className="flex h-8 items-center gap-1.5 rounded-full border border-[#D8D3C9] bg-white px-3 text-xs font-semibold"><input type="checkbox" checked={filters.showClosed} onChange={e=>setF({showClosed:e.target.checked})}/>{t("Won / Lost","مكسب / خسارة")}</label>
          {activeFilterCount>0&&<button onClick={()=>setFilters({...emptyFilters,sort:filters.sort})} className="h-8 rounded-full border border-dashed border-[#A8A29A] px-3 text-xs font-semibold text-slate-600">{t(`Clear filters (${activeFilterCount})`,`امسح الفلاتر (${activeFilterCount})`)}</button>}
        </FilterRow>
      </section>

      {/* ---------- body ---------- */}
      <div className="mt-4 flex gap-4 pb-10">
        <section className="min-w-0 flex-1">
          {view==="followups"&&<FollowUpsView rows={filtered} sortKey={filters.sort} {...rowProps}/>}
          {view==="table"&&<TableView rows={filtered} sortKey={filters.sort} {...rowProps} onPatch={async(id:string,body:any)=>{try{await patchLead(id,body);flash(t("Saved","اتحفظ"))}catch(e:any){flashError(e)}}}/>}
          {view==="stages"&&<StagesView rows={filtered} stageTab={stageTab} setStageTab={setStageTab} onReorder={reorder} {...rowProps}/>}
          {view==="board"&&<BoardView rows={filtered} onReorder={reorder} {...rowProps}/>}
          {view==="calendar"&&<CalendarView rows={filtered} {...rowProps}/>}
          {view==="funnel"&&<FunnelView rows={filtered} lang={lang} t={t} onPick={(s:string)=>{setF({stage:s});setView("followups")}}/>}
        </section>
        {selected&&<LeadPanel key={String(selected.id)} lead={selected} token={token} lang={lang} t={t} summary={summary[String(selected.id)]}
          onClose={()=>setSelectedId("")} onStage={(s:string)=>requestStage(selected,s)}
          onSaved={async(msg:string)=>{await load();flash(msg)}} onError={flashError} warmProblem={warmProblem}/>}
      </div>
    </div>

    {adding&&<AddLeadModal lang={lang} t={t} onClose={()=>setAdding(false)} warmProblem={warmProblem}
      onSave={async(d:Draft)=>{await salesWarRoomApi.addLead(token,{slug,rules:"v3",...draftPayload(d)});setAdding(false);await load();flash(t("Client added","العميل اتضاف"))}}/>}
    {stageAsk&&<StageDetailsModal ask={stageAsk} lang={lang} t={t} onClose={()=>setStageAsk(null)}
      onSave={async(body:any)=>{await patchLead(String(stageAsk.lead.id),{stage:stageAsk.stage,...body});setStageAsk(null);flash(t("Stage updated","اتغيرت المرحلة"))}}/>}
    {showResults&&<Modal onClose={()=>setShowResults(false)} lang={lang} title={t("Results & rules","النتايج والقواعد")}>
      <SalesWarRoomPeriodResults mode="agent" token={token} lang={lang}/>
      <div className="mt-4 rounded-2xl border border-[#E4E0D8] p-4"><div className="font-bold">{t("Operating Rules","قواعد التشغيل")}</div><ol className="mt-2 grid gap-1.5 text-sm text-slate-700 md:grid-cols-2"><li><b>1.</b> {t("No Carryover","مفيش تعويض")}</li><li><b>2.</b> {t("Every Match Starts 0–0","كل Match بيبدأ 0–0")}</li><li><b>3.</b> {t("Warm Pipeline Must Stay Above 10","Warm Pipeline لازم يفضل فوق 10")}</li><li><b>4.</b> {t("Hot Cases Do Not Stop Pipeline Building","Hot Cases ما توقفش بناء Pipeline")}</li><li><b>5.</b> {t("First Priority = Pipeline","الأولوية الأولى = Pipeline")}</li></ol></div>
    </Modal>}
    {toast&&<div role="status" className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-[#17191E] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
  </main>;
}

function draftPayload(d:Draft){
  return {client_name:d.client_name,phone:d.phone,budget:d.budget,stage:d.stage,next_action:d.next_action,next_action_trigger:d.next_action_trigger,notes:d.notes,
    expected_value:salesInputToEgp(d.expected_value),next_action_date:d.next_action_date||null,next_action_time:d.next_action_date?(d.next_action_time||"09:00"):null,
    interest_types:d.interest_types,areas:d.areas,closing_keys:d.closing_keys.map(k=>k.trim()).filter(Boolean).slice(0,2),
    budget_min:salesInputToEgp(d.budget_min),budget_max:salesInputToEgp(d.budget_max),
    lost_reason:d.stage==="Lost / Dead"?(d.lost_reason||null):null,
    meeting_date:d.meeting_date||null,meeting_time:d.meeting_time||null,meeting_location:d.meeting_location||null};
}

/* ================================================================== */
/* Small shared components                                             */
/* ================================================================== */
function StatCard({label,danger,children}:{label:string;danger?:boolean;children:ReactNode}){
  return <div className={`flex min-w-[150px] shrink-0 flex-col gap-1 rounded-2xl border p-3 lg:min-w-0 ${danger?"border-red-300 bg-red-50":"border-[#E4E0D8] bg-white"}`}><span className="text-[10px] font-bold tracking-[.08em] text-slate-500">{label}</span>{children}</div>;
}
function FilterRow({label,wrap,children}:{label:string;wrap?:boolean;children:ReactNode}){
  return <div className={`flex items-center gap-1.5 ${wrap?"flex-wrap":"overflow-x-auto pb-1"}`}><span className="me-1 w-16 shrink-0 text-[10px] font-bold tracking-[.08em] text-slate-500">{label}</span>{children}</div>;
}
function Modal({title,lang,onClose,children}:{title:string;lang:Lang;onClose:()=>void;children:ReactNode}){
  return <div className="fixed inset-0 z-[60] grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-2xl sm:rounded-3xl" onClick={e=>e.stopPropagation()} dir={lang==="ar"?"rtl":"ltr"}>
      <div className="mb-3 flex items-center"><div className="text-lg font-bold">{title}</div><button onClick={onClose} aria-label="Close" className="ms-auto grid h-9 w-9 place-items-center rounded-lg border border-[#E4E0D8]"><IconX/></button></div>
      {children}
    </div>
  </div>;
}
function StagePicker({lead,lang,onStage}:any){
  return <select aria-label="Stage" value={lead.stage} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();onStage(lead,e.target.value)}} className={`h-7 max-w-full cursor-pointer rounded-full border px-2 text-[11px] font-bold ${stageTone[lead.stage]||stageTone["New Lead"]}`}>{stages.map(s=><option key={s} value={s}>{stageLabel(s,lang)}</option>)}</select>;
}
function QuickActions({lead,t,onOpen}:any){
  const call=phoneForCall(lead.phone),wa=whatsappLink(lead.phone);
  return <div className="flex shrink-0 gap-1.5" onClick={e=>e.stopPropagation()}>
    {call?<a href={`tel:${call}`} aria-label={t("Call","اتصال")} className="grid h-9 w-9 place-items-center rounded-lg border border-[#E4E0D8] bg-white hover:bg-slate-50"><IconPhone/></a>:null}
    {wa?<a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-lg bg-[#25D366] text-white hover:bg-[#1EBE5A]"><IconChat/></a>:null}
    <button onClick={()=>onOpen(String(lead.id))} className="h-9 whitespace-nowrap rounded-lg bg-[#17191E] px-3 text-xs font-bold text-white hover:bg-black">+ {t("Feedback","فيدباك")}</button>
  </div>;
}
function TouchBadge({lead,summary,lang}:any){const d=lastTouchDate(lead,summary?.[String(lead.id)]);return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${touchTone(lead,summary?.[String(lead.id)])}`} title={d?d.toLocaleString():""}>{touchLabel(d,lang)}</span>}
function InterestChips({lead,lang}:any){const items=arr(lead.interest_types);if(!items.length)return null;return <div className="mt-1 flex flex-wrap gap-1">{items.map(i=><span key={i} className="rounded-full bg-blue-50 px-2 py-px text-[11px] font-bold text-blue-900">{listLabel(i,lang,arInterest)}</span>)}</div>}
function ClosingKey({lead}:any){const k=arr(lead.closing_keys);if(!k.length)return null;return <div className="mt-1 text-[11px] font-bold leading-4 text-amber-800" title="Closing key">KEY · {k.join(" · ")}</div>}

/* Next step with hover card showing the full feedback history */
const activityCache=new Map<string,Promise<any[]>>();
function loadActivityCached(token:string,id:string){if(!activityCache.has(id))activityCache.set(id,salesWarRoomApi.getLeadActivity(token,id).then((r:any)=>r.activities||[]).catch(()=>{activityCache.delete(id);return []}));return activityCache.get(id)!}
function NextStepHover({lead,t,token,due}:any){
  const [open,setOpen]=useState(false);const [up,setUp]=useState(false);const [items,setItems]=useState<any[]|null>(null);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const box=useRef<HTMLDivElement|null>(null);
  function enter(){if(isTouchDevice())return;timer.current=setTimeout(()=>{const r=box.current?.getBoundingClientRect();setUp(Boolean(r&&window.innerHeight-r.bottom<360&&r.top>360));setOpen(true);loadActivityCached(token,String(lead.id)).then(setItems)},250)}
  function leave(){if(timer.current)clearTimeout(timer.current);setOpen(false)}
  const feedback=(items||[]).filter((a:any)=>a.activity_type==="feedback"||a.activity_type==="legacy_note");
  const keys=arr(lead.closing_keys);
  return <div ref={box} className="relative min-w-0 cursor-help" onMouseEnter={enter} onMouseLeave={leave}>
    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold ${due.tone}`}>{due.label}</span>
    <div className="mt-0.5 truncate text-xs font-semibold underline decoration-slate-400 decoration-dotted underline-offset-4">{lead.next_action||(due.kind==="none"?<span className="text-red-700">+ {t("Set follow-up","حدد متابعة")}</span>:"—")}</div>
    {open&&<div role="tooltip" onClick={e=>e.stopPropagation()} className={`absolute end-0 z-40 flex ${up?"bottom-[calc(100%+6px)]":"top-[calc(100%+6px)]"} w-[380px] max-w-[85vw] cursor-default flex-col gap-2 rounded-xl border border-[#D8D3C9] bg-white p-3 text-start shadow-2xl`}>
      <div className="flex items-center gap-2"><span className="truncate text-sm font-bold">{lead.client_name}</span><span className="text-[11px] font-bold text-slate-500">{t("Feedback history","سجل الفيدباك")} · {items?feedback.length:"…"}</span></div>
      <div className={`rounded-lg px-2.5 py-2 text-xs font-bold ${due.kind==="over"||due.kind==="none"?"bg-red-50 text-red-800":"bg-[#F6F4EF] text-slate-800"}`}>{t("Next","الجاي")}: {lead.next_action||"—"} · {due.label}</div>
      {keys.length>0&&<div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-900">{t("Closing key","مفتاح القفل")}: {keys.join(" · ")}</div>}
      <div className="max-h-52 space-y-2 overflow-y-auto">
        {items===null?<div className="text-xs text-slate-400">{t("Loading…","جاري التحميل…")}</div>:feedback.length===0?<div className="whitespace-pre-wrap text-xs text-slate-500">{lead.notes||t("No feedback yet","مفيش فيدباك لسه")}</div>:
        feedback.map((a:any)=><div key={a.id} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"></span><div className="min-w-0"><div className="text-[11px] text-slate-500">{a.metadata?.crm_feedback_at_cairo||fmtDateTime(a.created_at)}{a.actor_type&&a.actor_type!=="agent"?` · ${a.actor_type}`:""}</div><div className="whitespace-pre-wrap break-words text-[13px] leading-5">{a.body}</div></div></div>)}
      </div>
      <div className="border-t border-[#EEEBE5] pt-1.5 text-[11px] text-slate-500">{t("Click the row to add feedback","دوس على العميل علشان تضيف فيدباك")}</div>
    </div>}
  </div>;
}

function LeadRow({lead,lang,t,summary,token,selectedId,onOpen,onStage,handle}:any){
  const due=dueInfo(lead,lang);const sel=selectedId===String(lead.id);const fbCount=Number(summary?.[String(lead.id)]?.feedback_count||0);
  return <div onClick={()=>onOpen(String(lead.id))} className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-[#EEEBE5] px-3 py-2.5 md:grid-cols-[170px_100px_64px_minmax(0,1fr)_140px_auto] md:px-4 ${sel?"bg-[#F6F4EF] shadow-[inset_3px_0_0_#17191E]":"bg-white hover:bg-[#FBFAF7]"}`}>
    <div className="min-w-0">
      <div className="truncate text-sm font-bold">{handle&&<span aria-hidden="true" className="me-1 cursor-grab font-normal text-slate-400">⋮⋮</span>}{lead.client_name}</div>
      <div className="truncate text-xs text-slate-500">{[budgetText(lead),lead.expected_value?formatSalesEgp(lead.expected_value):"",arr(lead.areas).map(a=>listLabel(a,lang,arArea)).join("/"),lead.campaign].filter(Boolean).join(" · ")||"—"}</div>
      <InterestChips lead={lead} lang={lang}/><ClosingKey lead={lead}/>
    </div>
    <div className="hidden md:block"><StagePicker lead={lead} lang={lang} onStage={onStage}/></div>
    <div className="justify-self-end md:justify-self-start"><TouchBadge lead={lead} summary={summary} lang={lang}/></div>
    <div className="col-span-2 max-h-20 min-w-0 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-[#F6F4EF] px-3 py-2 text-[13px] leading-6 text-slate-700 md:col-span-1">{lead.notes?String(lead.notes).trim():<span className="text-slate-400">{fbCount?t(`${fbCount} feedbacks — hover Next step`,`${fbCount} فيدباك — وقف على الخطوة الجاية`):t("No feedback yet","مفيش فيدباك لسه")}</span>}</div>
    <NextStepHover lead={lead} t={t} token={token} due={due}/>
    <QuickActions lead={lead} t={t} onOpen={onOpen}/>
  </div>;
}
function Group({title,hint,tone,rows,...rest}:any){
  if(!rows.length)return null;
  return <section className="mb-3 rounded-2xl border border-[#E4E0D8] bg-white">
    <div className={`flex items-center gap-2 rounded-t-2xl px-4 py-2 ${tone}`}><span className="text-sm font-bold">{title}</span><span className="font-mono text-xs font-semibold">{rows.length}</span>{hint&&<span className="truncate text-xs font-medium opacity-80">· {hint}</span>}</div>
    {rows.map((x:any)=><LeadRow key={x.id} lead={x} {...rest}/>)}
  </section>;
}
function EmptyState({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-[#D8D3C9] bg-white p-8 text-center text-sm font-semibold text-slate-500">{text}</div>}
function ListHeader({t}:any){return <div className="mb-2 hidden grid-cols-[170px_100px_64px_minmax(0,1fr)_140px_auto] gap-x-3 px-4 text-[11px] font-bold tracking-wide text-slate-500 md:grid"><span>{t("CLIENT","العميل")}</span><span>{t("STAGE","المرحلة")}</span><span>{t("TOUCH","آخر تواصل")}</span><span>{t("FEEDBACK","الفيدباك")}</span><span>{t("NEXT STEP","الخطوة الجاية")}</span><span className="w-[170px]"></span></div>}
function sorter(sortKey:string,summary:any){
  if(sortKey==="touch")return (a:any,b:any)=>(lastTouchDate(a,summary[String(a.id)])?.getTime()||0)-(lastTouchDate(b,summary[String(b.id)])?.getTime()||0);
  if(sortKey==="value")return (a:any,b:any)=>normalizeSalesValue(b.expected_value)-normalizeSalesValue(a.expected_value);
  if(sortKey==="name")return (a:any,b:any)=>String(a.client_name||"").localeCompare(String(b.client_name||""));
  return sortByDue;
}

/* ================================================================== */
/* Views                                                               */
/* ================================================================== */
function FollowUpsView({rows,sortKey,...rest}:any){
  const {t,summary}=rest;const today=todayLocal(),week=addDays(7);
  const sorted=[...rows].sort(sorter(sortKey,summary));
  const open=sorted.filter((x:any)=>!closedStages.includes(x.stage));
  const closed=sorted.filter((x:any)=>closedStages.includes(x.stage));
  if(!rows.length)return <EmptyState text={t("No clients match these filters.","مفيش عملاء بالفلاتر دي.")}/>;
  return <div>
    <ListHeader t={t}/>
    <Group title={t("Overdue","متأخر")} hint={t("follow-up date passed","ميعاد المتابعة عدى")} tone="bg-red-50 text-red-800" rows={open.filter((x:any)=>x.next_action_date&&x.next_action_date<today)} {...rest}/>
    <Group title={t("Today","النهاردة")} hint="" tone="bg-amber-50 text-amber-900" rows={open.filter((x:any)=>x.next_action_date===today)} {...rest}/>
    <Group title={t("No next step","من غير متابعة جاية")} hint={t("these are the clients that get lost — set a follow-up","دول اللي بيضيعوا — حدد لهم متابعة")} tone="bg-slate-100 text-slate-800" rows={open.filter((x:any)=>!x.next_action_date&&!String(x.next_action_trigger||"").trim())} {...rest}/>
    <Group title={t("This week","الأسبوع ده")} hint="" tone="bg-[#F6F4EF] text-slate-800" rows={open.filter((x:any)=>x.next_action_date&&x.next_action_date>today&&x.next_action_date<=week)} {...rest}/>
    <Group title={t("Later","بعدين")} hint="" tone="bg-[#F6F4EF] text-slate-600" rows={open.filter((x:any)=>(x.next_action_date&&x.next_action_date>week)||(!x.next_action_date&&String(x.next_action_trigger||"").trim()))} {...rest}/>
    <Group title={t("Won / Lost","مكسب / خسارة")} hint="" tone="bg-[#F6F4EF] text-slate-500" rows={closed} {...rest}/>
  </div>;
}

/* HTML5 drag helpers for manual order (Board / By stage) */
function useDragOrder(onReorder:(ids:string[])=>void){
  const [dragId,setDragId]=useState("");
  function props(list:any[],x:any){
    return {draggable:true,
      onDragStart:(e:any)=>{setDragId(String(x.id));e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(x.id))},
      onDragEnd:()=>setDragId(""),
      onDragOver:(e:any)=>{if(dragId&&list.some((r:any)=>String(r.id)===dragId))e.preventDefault()},
      onDrop:(e:any)=>{const from=String(e.dataTransfer.getData("text/plain")||dragId);const ids=list.map((r:any)=>String(r.id));if(!ids.includes(from))return;e.preventDefault();e.stopPropagation();if(from===String(x.id))return;const fi=ids.indexOf(from),ti=ids.indexOf(String(x.id));ids.splice(fi,1);ids.splice(ti,0,from);setDragId("");onReorder(ids)}};
  }
  return {dragId,setDragId,props};
}

function StagesView({rows,stageTab,setStageTab,onReorder,...rest}:any){
  const {lang,t}=rest;const list=[...rows.filter((x:any)=>x.stage===stageTab)].sort(sortManual);const drag=useDragOrder(onReorder);
  return <div>
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{stages.map(s=><button key={s} onClick={()=>setStageTab(s)} className={`h-9 whitespace-nowrap rounded-full border px-3 text-xs font-bold ${stageTab===s?"border-[#17191E] bg-[#17191E] text-white":"border-[#D8D3C9] bg-white"}`}>{stageLabel(s,lang)} · {rows.filter((x:any)=>x.stage===s).length}</button>)}</div>
    {list.length?<><ListHeader t={t}/><div className="rounded-2xl border border-[#E4E0D8] bg-white">{list.map((x:any)=><div key={x.id} {...drag.props(list,x)} className={drag.dragId===String(x.id)?"opacity-50":""}><LeadRow lead={x} handle {...rest}/></div>)}</div></>:<EmptyState text={t("No clients in this stage.","مفيش عملاء في المرحلة دي.")}/>}
  </div>;
}

function CalendarView({rows,...rest}:any){
  const {t,lang}=rest;const today=todayLocal();
  type Entry={date:string;lead:any;meeting:boolean};
  const entries:Entry[]=[];
  for(const x of rows){if(x.next_action_date)entries.push({date:x.next_action_date,lead:x,meeting:false});if(x.meeting_date&&x.stage==="Meeting Scheduled")entries.push({date:x.meeting_date,lead:x,meeting:true})}
  const groups=entries.reduce((acc:Record<string,Entry[]>,e)=>{(acc[e.date]||=[]).push(e);return acc},{});
  const dates=Object.keys(groups).sort();
  if(!dates.length)return <EmptyState text={t("No dated follow-ups yet.","مفيش متابعات بتاريخ لسه.")}/>;
  return <div className="space-y-3">{dates.map(date=>{
    const label=new Intl.DateTimeFormat(lang==="ar"?"ar-EG":"en-GB",{weekday:"long",day:"numeric",month:"short"}).format(new Date(`${date}T12:00:00`));
    const tone=date<today?"bg-red-50 text-red-800":date===today?"bg-amber-50 text-amber-900":"bg-[#F6F4EF] text-slate-800";
    const meetings=groups[date].filter(e=>e.meeting);const follow=groups[date].filter(e=>!e.meeting).map(e=>e.lead).sort(sortByDue);
    return <section key={date} className="rounded-2xl border border-[#E4E0D8] bg-white"><div className={`flex items-center gap-2 rounded-t-2xl px-4 py-2 text-sm font-bold ${tone}`}>{label}<span className="font-mono text-xs">{groups[date].length}</span></div>
      {meetings.map(e=><div key={`m-${e.lead.id}`} onClick={()=>rest.onOpen(String(e.lead.id))} className="flex cursor-pointer items-center gap-3 border-t border-[#EEEBE5] bg-blue-50/60 px-4 py-2.5 text-sm"><span className="rounded-md bg-blue-800 px-2 py-0.5 text-[11px] font-bold text-white">{t("MEETING","ميعاد")} {timeShort(e.lead.meeting_time)}</span><b>{e.lead.client_name}</b><span className="text-xs text-slate-600">{listLabel(e.lead.meeting_location||"",lang,arMeeting)}</span></div>)}
      {follow.map((x:any)=><LeadRow key={x.id} lead={x} {...rest}/>)}
    </section>;
  })}</div>;
}

function BoardView({rows,onReorder,...rest}:any){
  const {lang,t,onOpen,selectedId,onStage,summary}=rest;const drag=useDragOrder(onReorder);
  const cols=stages.filter(s=>rows.some((x:any)=>x.stage===s)||["New Lead","Warm","Hot / Very Potential","Meeting Scheduled"].includes(s));
  return <div className="overflow-x-auto pb-2"><div className="grid min-w-max auto-cols-[270px] grid-flow-col gap-3">{cols.map(s=>{
    const list=[...rows.filter((x:any)=>x.stage===s)].sort(sortManual);const sum=list.reduce((a:number,x:any)=>a+normalizeSalesValue(x.expected_value),0);
    return <div key={s} className="rounded-2xl bg-[#EAE7E0] p-2.5"
      onDragOver={e=>{if(drag.dragId&&!list.some((r:any)=>String(r.id)===drag.dragId))e.preventDefault()}}
      onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("text/plain")||drag.dragId;const lead=rows.find((r:any)=>String(r.id)===id);drag.setDragId("");if(lead&&lead.stage!==s)onStage(lead,s)}}>
      <div className="mb-2 flex items-center gap-2 px-1 text-sm font-bold">{stageLabel(s,lang)}<span className="font-mono text-xs text-slate-500">{list.length}</span><span className="ms-auto font-mono text-xs text-slate-600">{sum?formatSalesEgp(sum).replace("EGP ",""):""}</span></div>
      <div className="min-h-16 space-y-2">{list.map((x:any)=>{const due=dueInfo(x,lang);return <div key={x.id} {...drag.props(list,x)} onClick={()=>onOpen(String(x.id))} className={`cursor-pointer space-y-2 rounded-xl border bg-white p-3 shadow-sm ${selectedId===String(x.id)?"border-2 border-[#17191E]":"border-[#E4E0D8]"} ${drag.dragId===String(x.id)?"opacity-50":""}`}>
        <div className="flex items-start gap-2"><span aria-hidden="true" className="cursor-grab text-slate-400">⋮⋮</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{x.client_name}</div><div className="truncate text-xs text-slate-500">{budgetText(x)||"—"}</div><InterestChips lead={x} lang={lang}/><ClosingKey lead={x}/></div>{x.expected_value?<span className="font-mono text-xs font-semibold text-emerald-700">{formatSalesEgp(x.expected_value).replace("EGP ","")}</span>:null}</div>
        <div className="flex items-center gap-1.5"><span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${due.tone}`}>{due.label}</span><span className="truncate text-xs font-semibold">{x.next_action||"—"}</span></div>
        <div className="flex items-center justify-between"><TouchBadge lead={x} summary={summary} lang={lang}/><QuickActions lead={x} t={t} onOpen={onOpen}/></div>
      </div>})}</div>
    </div>})}</div></div>;
}

function FunnelView({rows,lang,t,onPick}:any){
  const max=Math.max(1,...stages.map(s=>rows.filter((x:any)=>x.stage===s).length));
  return <div className="space-y-2 rounded-2xl border border-[#E4E0D8] bg-white p-4">{stages.map(s=>{const n=rows.filter((x:any)=>x.stage===s).length;const w=Math.max(n?8:2,(n/max)*100);return <button key={s} onClick={()=>onPick(s)} className="grid w-full grid-cols-[130px_1fr_40px] items-center gap-3 text-start"><span className="text-xs font-bold">{stageLabel(s,lang)}</span><span className="h-8 overflow-hidden rounded-lg bg-slate-100"><span className="block h-full rounded-lg bg-[#17191E]" style={{width:`${w}%`}}></span></span><span className="text-center font-mono text-sm font-semibold">{n}</span></button>})}<div className="pt-2 text-xs text-slate-500">{t("Click a stage to open its clients.","دوس على مرحلة تفتح عملائها.")}</div></div>;
}

function TableView({rows,onPatch,sortKey,...rest}:any){
  const {lang,t,summary,selectedId,onOpen,onStage}=rest;
  const sorted=useMemo(()=>[...rows].sort(sorter(sortKey,summary)),[rows,sortKey,summary]);
  if(!rows.length)return <EmptyState text={t("No clients match these filters.","مفيش عملاء بالفلاتر دي.")}/>;
  return <div className="overflow-x-auto rounded-2xl border border-[#E4E0D8] bg-white">
    <div className="border-b border-[#EEEBE5] px-3 py-2 text-xs text-slate-500">{t("Click Next step or Follow-up to edit in place · Enter saves · Esc cancels","دوس على الخطوة الجاية أو الميعاد تعدلهم مكانهم · Enter للحفظ · Esc للإلغاء")}</div>
    <table className="w-full min-w-[1250px] text-sm">
      <thead className="bg-[#F6F4EF] text-[11px] tracking-wide text-slate-500"><tr>{[t("CLIENT","العميل"),t("PHONE","الموبايل"),t("STAGE","المرحلة"),t("INTEREST","الاهتمام"),t("AREA","المنطقة"),t("BUDGET","الميزانية"),t("EXPECTED","متوقع"),t("TOUCH","آخر تواصل"),t("FOLLOW-UP","المتابعة"),t("NEXT STEP","الخطوة الجاية"),t("CLOSING KEY","مفتاح القفل"),""].map((h,i)=><th key={i} className="whitespace-nowrap p-2.5 text-start">{h}</th>)}</tr></thead>
      <tbody>{sorted.map((x:any)=>{const due=dueInfo(x,lang);return <tr key={x.id} className={`border-t border-[#EEEBE5] align-top ${selectedId===String(x.id)?"bg-[#F6F4EF]":"hover:bg-[#FBFAF7]"}`}>
        <td className="p-2.5"><button onClick={()=>onOpen(String(x.id))} className="text-start font-bold hover:underline">{x.client_name}</button></td>
        <td className="whitespace-nowrap p-2.5 font-mono text-xs" dir="ltr">{x.phone||"—"}</td>
        <td className="p-2.5"><StagePicker lead={x} lang={lang} onStage={onStage}/></td>
        <td className="p-2.5"><InterestChips lead={x} lang={lang}/></td>
        <td className="p-2.5 text-xs">{arr(x.areas).map(a=>listLabel(a,lang,arArea)).join(" / ")||"—"}</td>
        <td className="whitespace-nowrap p-2.5 text-xs">{budgetText(x)||"—"}</td>
        <td className="whitespace-nowrap p-2.5 font-mono text-xs font-semibold text-emerald-700">{x.expected_value?formatSalesEgp(x.expected_value):"—"}</td>
        <td className="p-2.5"><TouchBadge lead={x} summary={summary} lang={lang}/></td>
        <td className="p-2.5"><InlineDate lead={x} label={due.label} tone={due.tone} onSave={(date:string)=>onPatch(String(x.id),{next_action_date:date||null,next_action_time:date?(timeShort(x.next_action_time)||"09:00"):null})}/></td>
        <td className="p-2.5"><InlineText value={x.next_action||""} placeholder={t("+ Add next step","+ ضيف خطوة")} onSave={(v:string)=>onPatch(String(x.id),{next_action:v})}/></td>
        <td className="max-w-[220px] p-2.5 text-xs font-bold text-amber-800">{arr(x.closing_keys).join(" · ")||"—"}</td>
        <td className="p-2.5"><QuickActions lead={x} t={t} onOpen={onOpen}/></td>
      </tr>})}</tbody>
    </table>
  </div>;
}
function InlineText({value,placeholder,onSave}:any){
  const [editing,setEditing]=useState(false);const [v,setV]=useState(value);
  if(!editing)return <button onClick={()=>{setV(value);setEditing(true)}} className="block w-full max-w-[240px] truncate rounded-md px-1.5 py-1 text-start text-xs font-semibold hover:bg-slate-100">{value||<span className="text-slate-400">{placeholder}</span>}</button>;
  return <input autoFocus value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{setEditing(false);if(v!==value)onSave(v)}} onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLInputElement).blur();if(e.key==="Escape"){setV(value);setEditing(false)}}} className="h-8 w-full max-w-[240px] rounded-md border-2 border-[#17191E] px-2 text-xs outline-none"/>;
}
function InlineDate({lead,label,tone,onSave}:any){
  const [editing,setEditing]=useState(false);
  if(!editing)return <button onClick={()=>setEditing(true)} className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold ${tone}`}>{label}</button>;
  return <input autoFocus type="date" defaultValue={lead.next_action_date||""} onBlur={e=>{setEditing(false);if(e.target.value!==(lead.next_action_date||""))onSave(e.target.value)}} onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLInputElement).blur();if(e.key==="Escape")setEditing(false)}} className="h-8 rounded-md border-2 border-[#17191E] px-1 text-xs"/>;
}

/* ================================================================== */
/* Pickers used in the panel and the add form                          */
/* ================================================================== */
function MultiChips({options,value,onChange,lang,map,tone="blue"}:{options:string[];value:string[];onChange:(v:string[])=>void;lang:Lang;map:Record<string,string>;tone?:"blue"|"slate"}){
  const on=tone==="blue"?"border-blue-900 bg-blue-50 font-bold text-blue-900":"border-[#17191E] bg-[#17191E] font-bold text-white";
  return <div className="flex flex-wrap gap-1.5">{options.map(o=>{const sel=value.includes(o);return <button type="button" key={o} onClick={()=>onChange(sel?value.filter(v=>v!==o):[...value,o])} className={`h-8 rounded-full border px-2.5 text-xs ${sel?on:"border-[#D8D3C9] bg-white font-semibold text-slate-700"}`}>{listLabel(o,lang,map)}{sel?" ✓":""}</button>})}</div>;
}
function ProfileFields({d,setD,lang,t}:{d:Draft;setD:(d:Draft)=>void;lang:Lang;t:(en:string,ar:string)=>string}){
  const field="h-10 w-full rounded-lg border border-[#D8D3C9] bg-white px-3 text-sm outline-none focus:border-[#17191E]";
  return <div className="space-y-3">
    <div><div className="text-[11px] font-bold tracking-wide text-slate-500">{t("INTEREST","الاهتمام")}</div><div className="mt-1.5"><MultiChips options={INTEREST_TYPES} value={d.interest_types} onChange={v=>setD({...d,interest_types:v})} lang={lang} map={arInterest}/></div></div>
    <div><div className="text-[11px] font-bold tracking-wide text-slate-500">{t("AREA","المنطقة")}</div><div className="mt-1.5"><MultiChips options={AREAS} value={d.areas} onChange={v=>setD({...d,areas:v})} lang={lang} map={arArea} tone="slate"/></div></div>
    <div className="grid grid-cols-2 gap-2">
      <label className="text-[11px] font-bold text-slate-500">{t("Budget from (M)","الميزانية من (مليون)")}<input type="number" min="0" step="0.5" value={d.budget_min} onChange={e=>setD({...d,budget_min:e.target.value})} className={field}/></label>
      <label className="text-[11px] font-bold text-slate-500">{t("Budget to (M)","لحد (مليون)")}<input type="number" min="0" step="0.5" value={d.budget_max} onChange={e=>setD({...d,budget_max:e.target.value})} className={field}/></label>
    </div>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5">
      <div className="flex items-center"><span className="text-[11px] font-bold tracking-wide text-amber-900">{t("CLOSING KEY","مفتاح القفل")}</span><span className="ms-auto text-[11px] text-amber-900">{t("max 2 · what closes this deal","بحد أقصى 2 · اللي يقفل الديل")}</span></div>
      {[0,1].map(i=><input key={i} value={d.closing_keys[i]||""} maxLength={160} onChange={e=>{const k=[...d.closing_keys];k[i]=e.target.value;setD({...d,closing_keys:k})}} placeholder={i===0?t("e.g. 8-year installments","مثلًا: قسط 8 سنين"):t("e.g. delivery before 2028","مثلًا: استلام قبل 2028")} className="mt-1.5 h-9 w-full rounded-lg border border-amber-300 bg-white px-2.5 text-sm outline-none focus:border-amber-700"/>)}
    </div>
  </div>;
}
function LostMeetingFields({stage,d,setD,lang,t}:{stage:string;d:Draft;setD:(d:Draft)=>void;lang:Lang;t:(en:string,ar:string)=>string}){
  const field="h-10 w-full rounded-lg border border-[#D8D3C9] bg-white px-3 text-sm outline-none focus:border-[#17191E]";
  if(stage==="Lost / Dead")return <div><div className="text-[11px] font-bold tracking-wide text-red-800">{t("WHY WAS IT LOST? *","ليه خسرناه؟ *")}</div><div className="mt-1.5 grid grid-cols-2 gap-1.5">{LOST_REASONS.map(r=><button type="button" key={r} onClick={()=>setD({...d,lost_reason:r})} className={`h-10 rounded-lg border px-2 text-xs ${d.lost_reason===r?"border-red-700 bg-red-50 font-bold text-red-800":"border-[#D8D3C9] bg-white font-semibold"}`}>{listLabel(r,lang,arLost)}</button>)}</div></div>;
  if(stage==="Meeting Scheduled")return <div className="space-y-2"><div className="text-[11px] font-bold tracking-wide text-blue-900">{t("MEETING DETAILS *","تفاصيل الميعاد *")}</div>
    <div className="grid grid-cols-2 gap-2"><input type="date" aria-label={t("Meeting date","تاريخ الميعاد")} value={d.meeting_date} onChange={e=>setD({...d,meeting_date:e.target.value})} className={field}/><input type="time" aria-label={t("Meeting time","وقت الميعاد")} value={d.meeting_time} onChange={e=>setD({...d,meeting_time:e.target.value})} className={field}/></div>
    <div className="grid grid-cols-2 gap-1.5">{MEETING_LOCATIONS.map(m=><button type="button" key={m} onClick={()=>setD({...d,meeting_location:m})} className={`h-10 rounded-lg border px-2 text-xs ${d.meeting_location===m?"border-blue-900 bg-blue-50 font-bold text-blue-900":"border-[#D8D3C9] bg-white font-semibold"}`}>{listLabel(m,lang,arMeeting)}</button>)}</div></div>;
  return null;
}
function stageDetailsMissing(stage:string,d:Draft){
  if(stage==="Lost / Dead"&&!d.lost_reason)return "lost_reason_required";
  if(stage==="Meeting Scheduled"&&(!d.meeting_date||!d.meeting_time||!d.meeting_location))return "meeting_details_required";
  return "";
}
function budgetProblem(d:Draft){
  for(const v of [d.budget_min,d.budget_max,d.expected_value])if(String(v).trim()&&!(Number(v)>=0))return "invalid_budget";
  if(d.budget_min.trim()&&d.budget_max.trim()&&Number(d.budget_min)>Number(d.budget_max))return "invalid_budget_range";
  return "";
}

function StageDetailsModal({ask,lang,t,onClose,onSave}:any){
  const [d,setD]=useState<Draft>(()=>({...leadToDraft(ask.lead),meeting_date:ask.lead.meeting_date||addDays(1),meeting_time:timeShort(ask.lead.meeting_time)||"12:00"}));
  const [saving,setSaving]=useState(false);const [error,setError]=useState("");
  async function save(){const miss=stageDetailsMissing(ask.stage,d);if(miss)return setError(errorText(miss,lang));
    try{setSaving(true);setError("");await onSave(ask.stage==="Lost / Dead"?{lost_reason:d.lost_reason}:{meeting_date:d.meeting_date,meeting_time:d.meeting_time,meeting_location:d.meeting_location})}catch(e:any){setError(errorText(String(e?.message||e),lang))}finally{setSaving(false)}}
  return <Modal onClose={onClose} lang={lang} title={`${ask.lead.client_name} → ${stageLabel(ask.stage,lang)}`}>
    <LostMeetingFields stage={ask.stage} d={d} setD={setD} lang={lang} t={t}/>
    {error&&<div className="mt-2 text-sm font-semibold text-red-700">{error}</div>}
    <button disabled={saving} onClick={()=>void save()} className="mt-4 h-11 w-full rounded-xl bg-[#17191E] text-sm font-bold text-white disabled:opacity-50">{saving?t("Saving…","جاري الحفظ…"):t("Save","احفظ")}</button>
  </Modal>;
}

/* ================================================================== */
/* Lead panel                                                          */
/* ================================================================== */
function LeadPanel({lead,token,lang,t,summary,onClose,onStage,onSaved,onError,warmProblem}:any){
  const [outcome,setOutcome]=useState("");const [note,setNote]=useState("");
  const [nextAction,setNextAction]=useState(lead.next_action||"");const [nextDate,setNextDate]=useState(lead.next_action_date||"");const [nextTime,setNextTime]=useState(timeShort(lead.next_action_time));
  const [saving,setSaving]=useState(false);const [editDetails,setEditDetails]=useState(false);
  const [details,setDetails]=useState<Draft>(leadToDraft(lead));
  const [profile,setProfile]=useState<Draft>(leadToDraft(lead));
  const [activities,setActivities]=useState<any[]>([]);const [loadingLog,setLoadingLog]=useState(true);
  async function loadLog(){try{setLoadingLog(true);const r=await salesWarRoomApi.getLeadActivity(token,String(lead.id));setActivities(r.activities||[]);activityCache.delete(String(lead.id))}catch{setActivities([])}finally{setLoadingLog(false)}}
  useEffect(()=>{void loadLog()},[lead.id]);

  const base=leadToDraft(lead);
  const profileDirty=JSON.stringify([profile.interest_types,profile.areas,profile.closing_keys.map(k=>k.trim()),profile.budget_min,profile.budget_max])!==JSON.stringify([base.interest_types,base.areas,base.closing_keys.map(k=>k.trim()),base.budget_min,base.budget_max]);
  const quick=[{label:t("Tomorrow 11:00","بكرة 11ص"),date:addDays(1),time:"11:00"},{label:t("+3 days","+3 أيام"),date:addDays(3),time:"11:00"},{label:t("Next week","الأسبوع الجاي"),date:addDays(7),time:"11:00"}];
  const followChanged=nextAction!==(lead.next_action||"")||nextDate!==(lead.next_action_date||"")||nextTime!==timeShort(lead.next_action_time);
  const canSave=Boolean(outcome||note.trim()||followChanged);

  async function saveFeedback(){
    if(!canSave||saving)return;
    if(warmProblem({stage:lead.stage,next_action:nextAction,next_action_date:nextDate,next_action_trigger:lead.next_action_trigger}))return onError("warm_requires_next_action");
    try{setSaving(true);
      const o=outcomes.find(x=>x.en===outcome);const body=[o?`[${lang==="ar"?o.ar:o.en}]`:"",note.trim()].filter(Boolean).join(" ");
      if(body)await salesWarRoomApi.addLeadFeedback(token,String(lead.id),body);
      if(followChanged)await salesWarRoomApi.updateLead(token,{id:String(lead.id),rules:"v3",next_action:nextAction,next_action_date:nextDate||null,next_action_time:nextDate?(nextTime||"09:00"):null});
      setOutcome("");setNote("");await loadLog();await onSaved(t("Feedback saved","الفيدباك اتحفظ"));
    }catch(e:any){onError(e)}finally{setSaving(false)}
  }
  async function saveProfile(){
    const p=budgetProblem(profile);if(p)return onError(p);
    try{setSaving(true);await salesWarRoomApi.updateLead(token,{id:String(lead.id),rules:"v3",interest_types:profile.interest_types,areas:profile.areas,closing_keys:profile.closing_keys.map(k=>k.trim()).filter(Boolean).slice(0,2),budget_min:salesInputToEgp(profile.budget_min),budget_max:salesInputToEgp(profile.budget_max)});await loadLog();await onSaved(t("Client profile saved","بيانات العميل اتحفظت"))}
    catch(e:any){onError(e)}finally{setSaving(false)}
  }
  async function saveDetails(){
    if(!details.client_name.trim())return onError(t("Client name is required","اسم العميل مطلوب"));
    if(details.expected_value.trim()&&!(Number(details.expected_value)>=0))return onError("invalid_expected_value");
    try{setSaving(true);await salesWarRoomApi.updateLead(token,{id:String(lead.id),rules:"v3",client_name:details.client_name,phone:details.phone,budget:details.budget,notes:details.notes,next_action_trigger:details.next_action_trigger,expected_value:salesInputToEgp(details.expected_value)});setEditDetails(false);await loadLog();await onSaved(t("Client updated","بيانات العميل اتحدثت"))}
    catch(e:any){onError(e)}finally{setSaving(false)}
  }

  const call=phoneForCall(lead.phone),wa=whatsappLink(lead.phone);
  const field="h-10 w-full rounded-lg border border-[#D8D3C9] bg-white px-3 text-sm outline-none focus:border-[#17191E]";
  return <>
    <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose}></div>
    <aside aria-label="Client details" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:sticky lg:inset-auto lg:top-[76px] lg:z-auto lg:max-h-[calc(100vh-92px)] lg:w-[400px] lg:shrink-0 lg:rounded-2xl lg:border lg:border-[#E4E0D8] lg:shadow-none">
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#D8D3C9] lg:hidden"></div>
      <div className="overflow-y-auto">
        <div className="border-b border-[#EEEBE5] p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1"><div className="truncate text-lg font-bold">{lead.client_name}</div><div className="text-xs text-slate-500"><span dir="ltr">{lead.phone||"—"}</span>{lead.campaign?` · ${lead.campaign}`:""}</div></div>
            {call&&<a href={`tel:${call}`} aria-label={t("Call","اتصال")} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E4E0D8]"><IconPhone/></a>}
            {wa&&<a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366] text-white"><IconChat/></a>}
            <button onClick={onClose} aria-label={t("Close","قفل")} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E4E0D8]"><IconX/></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{stages.map(s=><button key={s} disabled={saving} onClick={()=>{if(s!==lead.stage&&s==="Warm"&&warmProblem({stage:s,next_action:nextAction,next_action_date:nextDate,next_action_trigger:lead.next_action_trigger}))return onError("warm_requires_next_action");onStage(s)}} className={`h-8 rounded-full border px-2.5 text-xs ${lead.stage===s?`font-bold ${stageTone[s]}`:"border-[#D8D3C9] bg-white font-semibold text-slate-700 hover:border-slate-500"}`}>{stageLabel(s,lang)}</button>)}</div>
          {lead.stage==="Meeting Scheduled"&&lead.meeting_date&&<div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900">{t("Meeting","الميعاد")}: {lead.meeting_date} {timeShort(lead.meeting_time)} · {listLabel(lead.meeting_location||"",lang,arMeeting)}</div>}
          {lead.stage==="Lost / Dead"&&lead.lost_reason&&<div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{t("Lost because","خسرناه بسبب")}: {listLabel(lead.lost_reason,lang,arLost)}</div>}
          {!editDetails?<div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#EEEBE5] p-2.5"><div className="text-[10px] font-bold text-slate-500">{t("BUDGET","الميزانية")}</div><div className="text-sm font-semibold">{budgetText(lead)||"—"}</div></div>
            <div className="rounded-xl border border-[#EEEBE5] p-2.5"><div className="text-[10px] font-bold text-slate-500">{t("EXPECTED SALE","البيعة المتوقعة")}</div><div className="font-mono text-sm font-semibold text-emerald-700">{lead.expected_value?formatSalesEgp(lead.expected_value):"—"}</div></div>
            <button onClick={()=>{setDetails(leadToDraft(lead));setEditDetails(true)}} className="col-span-2 h-9 rounded-xl border border-dashed border-[#D8D3C9] text-xs font-bold text-slate-600 hover:border-slate-500">{t("Edit name / phone / expected / notes","عدّل الاسم / الموبايل / المتوقع / الملاحظات")}</button>
          </div>:<div className="mt-3 grid grid-cols-2 gap-2">
            <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Name","الاسم")}<input value={details.client_name} onChange={e=>setDetails({...details,client_name:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">{t("Phone","الموبايل")}<input dir="ltr" value={details.phone} onChange={e=>setDetails({...details,phone:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">{t("Expected (M EGP)","متوقع (بالمليون)")}<input type="number" min="0" step="0.1" value={details.expected_value} onChange={e=>setDetails({...details,expected_value:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">{t("Budget note","ملاحظة الميزانية")}<input value={details.budget} onChange={e=>setDetails({...details,budget:e.target.value})} className={field}/></label>
            <label className="text-[11px] font-bold text-slate-500">Trigger<input value={details.next_action_trigger} onChange={e=>setDetails({...details,next_action_trigger:e.target.value})} className={field}/></label>
            <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Client context / notes","سياق العميل / ملاحظات")}<textarea value={details.notes} onChange={e=>setDetails({...details,notes:e.target.value})} className="min-h-20 w-full rounded-lg border border-[#D8D3C9] p-2 text-sm outline-none focus:border-[#17191E]"/></label>
            <div className="col-span-2 flex gap-2"><button disabled={saving} onClick={()=>void saveDetails()} className="h-10 flex-1 rounded-xl bg-[#17191E] text-sm font-bold text-white disabled:opacity-50">{t("Save details","احفظ البيانات")}</button><button onClick={()=>setEditDetails(false)} className="h-10 rounded-xl border border-[#D8D3C9] px-4 text-sm font-bold">{t("Cancel","إلغاء")}</button></div>
          </div>}
        </div>

        <div className="border-b border-[#EEEBE5] p-4">
          <ProfileFields d={profile} setD={setProfile} lang={lang} t={t}/>
          {profileDirty&&<div className="mt-3 flex gap-2"><button disabled={saving} onClick={()=>void saveProfile()} className="h-10 flex-1 rounded-xl bg-[#17191E] text-sm font-bold text-white disabled:opacity-50">{t("Save profile","احفظ الاهتمام والميزانية")}</button><button onClick={()=>setProfile(leadToDraft(lead))} className="h-10 rounded-xl border border-[#D8D3C9] px-4 text-sm font-bold">{t("Undo","تراجع")}</button></div>}
        </div>

        <div className="border-b border-[#EEEBE5] bg-[#FBFAF7] p-4" onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();void saveFeedback()}}}>
          <div className="text-sm font-bold">{t("Log what happened","سجل اللي حصل")}</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap">{outcomes.map(o=><button key={o.en} onClick={()=>setOutcome(outcome===o.en?"":o.en)} className={`h-10 rounded-lg px-2.5 text-xs sm:h-8 ${outcome===o.en?"border-2 border-[#17191E] bg-white font-bold":"border border-[#D8D3C9] bg-white font-semibold"}`}>{lang==="ar"?o.ar:o.en}{outcome===o.en?" ✓":""}</button>)}</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={t("What happened? What did you agree on?","حصل إيه؟ اتفقتوا على إيه؟")} className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#D8D3C9] bg-white p-3 text-sm outline-none focus:border-[#17191E]"/>
          <div className="mt-2 text-[11px] font-bold text-slate-500">{t("NEXT FOLLOW-UP","المتابعة الجاية")}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">{quick.map(q=>{const on=nextDate===q.date&&nextTime===q.time;return <button key={q.label} onClick={()=>{setNextDate(q.date);setNextTime(q.time)}} className={`h-9 rounded-full border px-3 text-xs font-semibold sm:h-8 ${on?"border-[#17191E] bg-[#17191E] text-white":"border-[#D8D3C9] bg-white"}`}>{q.label}</button>})}</div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2"><input type="date" value={nextDate} onChange={e=>{setNextDate(e.target.value);if(e.target.value&&!nextTime)setNextTime("09:00")}} className={field} aria-label={t("Follow-up date","تاريخ المتابعة")}/><input type="time" value={nextTime} disabled={!nextDate} onChange={e=>setNextTime(e.target.value)} className={`${field} w-28 disabled:bg-slate-100`} aria-label={t("Follow-up time","وقت المتابعة")}/></div>
          <input value={nextAction} onChange={e=>setNextAction(e.target.value)} placeholder={t("Next step (e.g. send brochure)","الخطوة الجاية (مثلًا: ابعت البروشور)")} className={`${field} mt-2`}/>
          <div className="mt-3 flex items-center gap-2"><span className="hidden text-[11px] text-slate-500 sm:inline">Ctrl + Enter</span><button disabled={!canSave||saving} onClick={()=>void saveFeedback()} className="ms-auto h-11 w-full whitespace-nowrap rounded-xl bg-[#17191E] px-5 text-sm font-bold text-white disabled:opacity-40 sm:h-10 sm:w-auto">{saving?t("Saving…","جاري الحفظ…"):t("Save feedback","احفظ الفيدباك")}</button></div>
        </div>

        <div className="p-4">
          <div className="mb-2 text-[11px] font-bold tracking-wide text-slate-500">{t("HISTORY","السجل")} · {Number(summary?.feedback_count||0)} {t("feedbacks","فيدباك")}</div>
          {loadingLog&&!activities.length?<div className="text-xs text-slate-400">{t("Loading…","جاري التحميل…")}</div>:!activities.length?<div className="text-xs text-slate-400">{t("No history yet","مفيش سجل لسه")}</div>:
          <ol className="space-y-3">{activities.map((a:any)=><li key={a.id} className="flex gap-2.5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.activity_type==="feedback"||a.activity_type==="legacy_note"?"bg-amber-600":a.actor_type==="manager"||a.actor_type==="owner"?"bg-blue-700":"bg-slate-400"}`}></span><div className="min-w-0"><div className="text-xs text-slate-500"><b className="text-slate-900">{activityTitle(a,lang)}</b> · {a.actor_type&&a.actor_type!=="agent"?`${a.actor_type} · `:""}{a.metadata?.crm_feedback_at_cairo||fmtDateTime(a.created_at)}</div><ActivityText a={a}/></div></li>)}</ol>}
        </div>
      </div>
    </aside>
  </>;
}
function activityTitle(a:any,lang:Lang){const ar=lang==="ar";if(a.activity_type==="feedback")return ar?"فيدباك":"Feedback";if(a.activity_type==="stage_change")return ar?"تغيير المرحلة":"Stage";if(a.activity_type==="followup_change")return ar?"تعديل المتابعة":"Follow-up";if(a.activity_type==="edit")return ar?"تعديل بيانات":"Edited";if(a.activity_type==="legacy_note")return ar?"ملاحظة قديمة":"Previous note";return ar?"إضافة العميل":"Client added"}
function ActivityText({a}:{a:any}){
  if(a.activity_type==="feedback"||a.activity_type==="legacy_note")return <div className="whitespace-pre-wrap break-words text-sm leading-6">{a.body}</div>;
  if(a.activity_type==="stage_change")return <div className="text-sm">{a.from_stage?`${a.from_stage} → `:""}<b>{a.to_stage||"—"}</b>{a.metadata?.lost_reason?<span className="text-xs text-red-700"> · {a.metadata.lost_reason}</span>:null}</div>;
  if(a.activity_type==="followup_change"){const to=a.metadata?.to||{};return <div className="text-sm">{to.next_action||a.body||""}{to.next_action_date?<span className="text-xs text-slate-500"> · {to.next_action_date}{to.next_action_time?` ${timeShort(to.next_action_time)}`:""}</span>:null}</div>}
  if(a.activity_type==="edit")return <div className="text-xs text-slate-500">{(a.metadata?.fields||[]).join(" · ")}</div>;
  return null;
}

/* ================================================================== */
/* Add client                                                          */
/* ================================================================== */
function AddLeadModal({lang,t,onClose,onSave,warmProblem}:any){
  const [d,setD]=useState<Draft>({...emptyDraft});const [saving,setSaving]=useState(false);const [error,setError]=useState("");
  const field="h-10 w-full rounded-lg border border-[#D8D3C9] bg-white px-3 text-sm outline-none focus:border-[#17191E]";
  async function save(){
    if(!d.client_name.trim())return setError(t("Client name is required","اسم العميل مطلوب"));
    const p=budgetProblem(d);if(p)return setError(errorText(p,lang));
    if(warmProblem(d))return setError(errorText("warm_requires_next_action",lang));
    const miss=stageDetailsMissing(d.stage,d);if(miss)return setError(errorText(miss,lang));
    try{setSaving(true);setError("");await onSave(d)}catch(e:any){setError(errorText(String(e?.message||e),lang))}finally{setSaving(false)}
  }
  return <Modal onClose={onClose} lang={lang} title={t("Add client","عميل جديد")}>
    <div className="grid grid-cols-2 gap-2">
      <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Name *","الاسم *")}<input autoFocus value={d.client_name} onChange={e=>setD({...d,client_name:e.target.value})} className={field}/></label>
      <label className="text-[11px] font-bold text-slate-500">{t("Phone","الموبايل")}<input dir="ltr" value={d.phone} onChange={e=>setD({...d,phone:e.target.value})} className={field}/></label>
      <label className="text-[11px] font-bold text-slate-500">{t("Expected (M EGP)","متوقع (بالمليون)")}<input type="number" min="0" step="0.1" value={d.expected_value} onChange={e=>setD({...d,expected_value:e.target.value})} className={field}/></label>
      <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Stage","المرحلة")}<select value={d.stage} onChange={e=>setD({...d,stage:e.target.value})} className={field}>{stages.map(s=><option key={s} value={s}>{stageLabel(s,lang)}</option>)}</select></label>
      <div className="col-span-2"><LostMeetingFields stage={d.stage} d={d} setD={setD} lang={lang} t={t}/></div>
      <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Next step","الخطوة الجاية")}<input value={d.next_action} onChange={e=>setD({...d,next_action:e.target.value})} className={field}/></label>
      <label className="text-[11px] font-bold text-slate-500">{t("Follow-up date","تاريخ المتابعة")}<input type="date" min={todayLocal()} value={d.next_action_date} onChange={e=>setD({...d,next_action_date:e.target.value,next_action_time:e.target.value?(d.next_action_time||"09:00"):""})} className={field}/></label>
      <label className="text-[11px] font-bold text-slate-500">{t("Time","الوقت")}<input type="time" disabled={!d.next_action_date} value={d.next_action_time} onChange={e=>setD({...d,next_action_time:e.target.value})} className={`${field} disabled:bg-slate-100`}/></label>
      <div className="col-span-2 mt-1"><ProfileFields d={d} setD={setD} lang={lang} t={t}/></div>
      <label className="col-span-2 text-[11px] font-bold text-slate-500">{t("Client context / first feedback","سياق العميل / أول فيدباك")}<textarea value={d.notes} onChange={e=>setD({...d,notes:e.target.value})} className="min-h-20 w-full rounded-lg border border-[#D8D3C9] p-2 text-sm outline-none focus:border-[#17191E]"/></label>
    </div>
    {error&&<div className="mt-2 text-sm font-semibold text-red-700">{error}</div>}
    <button disabled={saving} onClick={()=>void save()} className="mt-4 h-11 w-full rounded-xl bg-[#17191E] text-sm font-bold text-white disabled:opacity-50">{saving?t("Saving…","جاري الحفظ…"):t("Add client","ضيف العميل")}</button>
  </Modal>;
}
