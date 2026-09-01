import { useEffect, useMemo, useState } from "react";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

type Scope = "owner" | "manager";
type Period = "today" | "week" | "month";

type Props = {
  scope: Scope;
  token: string;
  lang: "en" | "ar";
};

const stageOrder = ["New Lead","Contacted","Cold","Warm","Hot / Very Potential","Hold","Meeting Scheduled","Meeting Held","Negotiation / Closing","Won","Lost / Dead"];
const stageAr: Record<string,string> = {
  "New Lead":"ليد جديد","Contacted":"تم التواصل","Cold":"Cold","Warm":"Warm","Hot / Very Potential":"Hot / قوي جدًا","Hold":"Hold","Meeting Scheduled":"ميعاد متحدد","Meeting Held":"تم الاجتماع","Negotiation / Closing":"تفاوض / Closing","Won":"مكسب","Lost / Dead":"خسارة / Dead"
};

const money = (n: number) => n >= 1_000_000_000 ? `EGP ${(n/1_000_000_000).toFixed(1)}B` : n >= 1_000_000 ? `EGP ${(n/1_000_000).toFixed(1)}M` : `EGP ${Math.round(n||0).toLocaleString()}`;
const num = (n: unknown) => Number(n || 0).toLocaleString();
const delta = (current: number, previous: number) => previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

function Delta({current,previous,suffix="%"}:{current:number;previous:number;suffix?:string}){
  const d=delta(current,previous);
  return <span className={`text-[10px] font-black ${d>0?"text-emerald-600":d<0?"text-red-600":"text-slate-400"}`}>{d>0?"▲":d<0?"▼":"•"} {Math.abs(d)}{suffix}</span>;
}

function MetricCard({title,value,sub,current,previous}:{title:string;value:string|number;sub?:string;current?:number;previous?:number}){
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">{title}</div>
    <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    <div className="mt-2 flex min-h-4 items-center justify-between gap-2">{sub?<span className="text-[10px] font-bold text-slate-400">{sub}</span>:<span/>}{current!==undefined&&previous!==undefined?<Delta current={current} previous={previous}/>:null}</div>
  </div>;
}

export default function SalesWarRoomMeetingAnalytics({scope,token,lang}:Props){
  const [period,setPeriod]=useState<Period>("week");
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  useEffect(()=>{
    let cancelled=false;
    async function run(){
      try{setLoading(true);setError("");const r=await salesWarRoomApi.getMeetingAnalytics(token);if(!cancelled)setData(r)}
      catch(e:any){if(!cancelled)setError(e.message||"analytics_error")}
      finally{if(!cancelled)setLoading(false)}
    }
    if(token)void run();
    return()=>{cancelled=true};
  },[scope,token]);

  const current=data?.periods?.[period]||{};
  const previous=data?.previous?.[period]||{};
  const currentPipe=data?.current||{};
  const agents=data?.agents||[];
  const stageCounts=currentPipe.stage_counts||{};
  const maxStage=Math.max(1,...Object.values(stageCounts).map((x:any)=>Number(x||0)));
  const periodLabel=period==="today"?t("Today","اليوم"):period==="week"?t("This Week","الأسبوع"):t("This Month","الشهر");
  const compareLabel=period==="today"?t("vs yesterday","مقارنة بأمس"):period==="week"?t("vs same days last week","مقارنة بنفس أيام الأسبوع اللي فات"):t("vs same days last month","مقارنة بنفس أيام الشهر اللي فات");

  const sortedAgents=useMemo(()=>[...agents].sort((a:any,b:any)=>Number(b?.[period]?.qualified_leads||0)-Number(a?.[period]?.qualified_leads||0)||Number(b?.[period]?.calls||0)-Number(a?.[period]?.calls||0)),[agents,period]);

  const meetingReview=useMemo(()=>{
    const agentName=(a:any)=>lang==="ar"?(a?.name_ar||a?.name_en||a?.slug):(a?.name_en||a?.name_ar||a?.slug);
    const scored=(agents||[]).map((a:any)=>{
      const m=a?.[period]||{};const p=a?.previous?.[period]||{};
      const qDelta=Number(m.qualified_leads||0)-Number(p.qualified_leads||0);
      const convDelta=Number(m.call_to_qualified_pct||0)-Number(p.call_to_qualified_pct||0);
      const callsDelta=Number(m.calls||0)-Number(p.calls||0);
      return {a,m,p,qDelta,convDelta,callsDelta,score:qDelta*100+convDelta*5+callsDelta/50};
    });
    const improver=[...scored].sort((x:any,y:any)=>y.score-x.score||String(agentName(x.a)).localeCompare(String(agentName(y.a))))[0]||null;
    const negative=scored.filter((x:any)=>x.qDelta<0||x.convDelta<0||x.callsDelta<0);
    const decliner=[...negative].sort((x:any,y:any)=>x.score-y.score||String(agentName(x.a)).localeCompare(String(agentName(y.a))))[0]||null;
    const chain=[
      {label:t("Calls → Potential","Calls → Potential"),from:Number(current.calls||0),to:Number(current.potential_cases||0)},
      {label:t("Potential → Qualified","Potential → Qualified"),from:Number(current.potential_cases||0),to:Number(current.qualified_leads||0)},
      {label:t("Qualified → Meetings","Qualified → Meetings"),from:Number(current.qualified_leads||0),to:Number(current.meetings_held||0)},
      {label:t("Meetings → Deals","Meetings → Deals"),from:Number(current.meetings_held||0),to:Number(current.deals_won||0)},
    ].filter((x:any)=>x.from>0).map((x:any)=>({...x,rate:Math.round((x.to/x.from)*1000)/10}));
    const leak=[...chain].sort((a:any,b:any)=>a.rate-b.rate)[0]||null;
    const followRisk=[...(agents||[])].sort((a:any,b:any)=>Number(b?.current?.overdue||0)-Number(a?.current?.overdue||0)||Number(a?.current?.followup_coverage_pct||0)-Number(b?.current?.followup_coverage_pct||0))[0]||null;
    const attention=Array.isArray(data?.attention_leads)?data.attention_leads:[];
    return {agentName,improver,decliner,leak,followRisk,attention};
  },[agents,period,current,previous,data,lang]);

  if(loading&&!data)return <section className="mt-4 rounded-3xl border bg-white p-8 text-center text-sm font-black text-slate-400">{t("Loading meeting analytics…","جاري تحميل Meeting Analytics…")}</section>;
  if(error&&!data)return <section className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</section>;
  if(!data)return null;

  return <section className="mt-4 space-y-4">
    <div className="rounded-3xl bg-slate-950 p-4 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black tracking-[.16em] text-slate-400">MEETING ANALYTICS</div>
          <h2 className="mt-1 text-xl font-black">{t("Sales Progress & Follow-up Quality","تقدم المبيعات وجودة المتابعة")}</h2>
          <div className="mt-1 text-[11px] font-bold text-slate-400">{current.start} → {current.end} · {compareLabel}</div>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/10 p-1">
          {(["today","week","month"] as Period[]).map(p=><button key={p} onClick={()=>setPeriod(p)} className={`rounded-xl px-3 py-2 text-[11px] font-black ${period===p?"bg-white text-slate-950":"text-slate-300"}`}>{p==="today"?t("Day","يوم"):p==="week"?t("Week","أسبوع"):t("Month","شهر")}</button>)}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <MetricCard title={t("Calls","Calls")} value={num(current.calls)} current={Number(current.calls||0)} previous={Number(previous.calls||0)} sub={periodLabel}/>
      <MetricCard title={t("Potential Cases","Potential Cases")} value={num(current.potential_cases)} current={Number(current.potential_cases||0)} previous={Number(previous.potential_cases||0)} sub={`${Number(current.call_to_potential_pct||0)}% ${t("of calls","من المكالمات")}`}/>
      <MetricCard title={t("Qualified Leads","Qualified Leads")} value={num(current.qualified_leads)} current={Number(current.qualified_leads||0)} previous={Number(previous.qualified_leads||0)} sub={`${Number(current.call_to_qualified_pct||0)}% ${t("Calls → Warm/Hot","Calls → Warm/Hot")}`}/>
      <MetricCard title={t("Feedbacks Logged","Feedbacks")} value={num(current.feedbacks)} current={Number(current.feedbacks||0)} previous={Number(previous.feedbacks||0)} sub={`${num(current.touched_leads)} ${t("leads touched","ليد اتعمله متابعة")}`}/>
      <MetricCard title={t("Meetings Held","Meetings Held")} value={num(current.meetings_held)} current={Number(current.meetings_held||0)} previous={Number(previous.meetings_held||0)} sub={`${num(current.meetings_scheduled)} ${t("scheduled","متحدد")}`}/>
    </div>

    <div className="grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black tracking-[.14em] text-slate-400">CONVERSION CHAIN</div><h3 className="font-black">{t("From activity to qualified pipeline","من النشاط للـPipeline المؤهلة")}</h3></div><div className="text-[10px] font-bold text-slate-400">{compareLabel}</div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          {[
            [t("Calls","Calls"),current.calls],
            [t("Potential","Potential"),current.potential_cases],
            [t("Qualified","Qualified"),current.qualified_leads],
            [t("Meetings","Meetings"),current.meetings_held],
            [t("Deals","Deals"),current.deals_won],
          ].map(([label,value],i)=><div key={String(label)} className="rounded-2xl bg-slate-50 p-3"><div className="text-[10px] font-black text-slate-400">0{i+1}</div><div className="mt-2 text-xl font-black">{num(value)}</div><div className="text-xs font-bold text-slate-600">{label}</div></div>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border p-3"><div className="text-[10px] font-black text-slate-400">CALL → POTENTIAL</div><div className="mt-1 text-xl font-black">{Number(current.call_to_potential_pct||0)}%</div></div>
          <div className="rounded-2xl border p-3"><div className="text-[10px] font-black text-slate-400">CALL → QUALIFIED</div><div className="mt-1 text-xl font-black">{Number(current.call_to_qualified_pct||0)}%</div></div>
          <div className="rounded-2xl border p-3"><div className="text-[10px] font-black text-slate-400">NEW LEADS</div><div className="mt-1 text-xl font-black">{num(current.new_leads)}</div></div>
          <div className="rounded-2xl border p-3"><div className="text-[10px] font-black text-slate-400">SALES</div><div className="mt-1 text-lg font-black">{money(Number(current.sales_volume||0))}</div></div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="text-[10px] font-black tracking-[.14em] text-slate-400">FOLLOW-UP HEALTH</div>
        <h3 className="font-black">{t("Current pipeline discipline","انضباط المتابعة الحالي")}</h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetricCard title={t("Active Leads","Active Leads")} value={num(currentPipe.active_leads)}/>
          <MetricCard title={t("Follow-up Coverage","Follow-up Coverage")} value={`${Number(currentPipe.followup_coverage_pct||0)}%`}/>
          <MetricCard title={t("Overdue","Overdue")} value={num(currentPipe.overdue_followups)}/>
          <MetricCard title={t("Due Today","Due Today")} value={num(currentPipe.due_today)}/>
          <MetricCard title={t("Dormant 7+ Days","Dormant 7+ Days")} value={num(currentPipe.dormant_7d)}/>
          <MetricCard title={t("Follow-up Changes","Follow-up Changes")} value={num(current.followup_changes)} current={Number(current.followup_changes||0)} previous={Number(previous.followup_changes||0)}/>
        </div>
      </div>
    </div>

    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black tracking-[.14em] text-slate-400">AGENT SCORECARD</div><h3 className="font-black">{t("Who is creating pipeline from calls?","مين بيحوّل المكالمات لـPipeline فعلية؟")}</h3></div><div className="text-[10px] font-bold text-slate-400">{t("Qualified = unique lead entering Warm or Hot in period","Qualified = ليد فريدة دخلت Warm أو Hot خلال الفترة")}</div></div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs" dir={lang==="ar"?"rtl":"ltr"}>
          <thead><tr className="border-b text-[10px] font-black uppercase text-slate-400"><th className="p-2">{t("Agent","Agent")}</th><th className="p-2">Calls</th><th className="p-2">Potential</th><th className="p-2">Qualified</th><th className="p-2">Call→Q</th><th className="p-2">Feedbacks</th><th className="p-2">Touched</th><th className="p-2">Warm / Hot</th><th className="p-2">Overdue</th><th className="p-2">Coverage</th></tr></thead>
          <tbody>{sortedAgents.map((a:any)=>{const m=a?.[period]||{};const p=a?.previous?.[period]||{};return <tr key={a.id} className="border-b last:border-0"><td className="p-2 font-black">{lang==="ar"?(a.name_ar||a.name_en):a.name_en}</td><td className="p-2"><div className="font-black">{num(m.calls)}</div><Delta current={Number(m.calls||0)} previous={Number(p.calls||0)}/></td><td className="p-2"><div className="font-black">{num(m.potential_cases)}</div><div className="text-[10px] text-slate-400">{Number(m.call_to_potential_pct||0)}%</div></td><td className="p-2"><div className="font-black">{num(m.qualified_leads)}</div><Delta current={Number(m.qualified_leads||0)} previous={Number(p.qualified_leads||0)}/></td><td className="p-2 font-black">{Number(m.call_to_qualified_pct||0)}%</td><td className="p-2 font-black">{num(m.feedbacks)}</td><td className="p-2 font-black">{num(m.touched_leads)}</td><td className="p-2 font-black">{a.current?.warm||0} / {a.current?.hot||0}</td><td className={`p-2 font-black ${Number(a.current?.overdue||0)>0?"text-red-600":""}`}>{a.current?.overdue||0}</td><td className="p-2 font-black">{Number(a.current?.followup_coverage_pct||0)}%</td></tr>})}</tbody>
        </table>
      </div>
    </div>

    <div className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-[10px] font-black tracking-[.14em] text-slate-400">MEETING REVIEW</div><h3 className="text-lg font-black">{t("What changed, where are we leaking, and what needs action?","إيه اللي اتحسن وإيه اللي اتراجع وفين التسريب وإيه اللي محتاج تدخل؟")}</h3></div>
        <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-500">{periodLabel} · {compareLabel}</div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><div className="text-[10px] font-black text-emerald-700">BEST MOMENTUM</div><div className="mt-1 font-black">{meetingReview.improver?meetingReview.agentName(meetingReview.improver.a):"—"}</div><div className="mt-1 text-[11px] font-bold text-emerald-800">{meetingReview.improver?`${meetingReview.improver.qDelta>=0?"+":""}${meetingReview.improver.qDelta} Qualified · ${meetingReview.improver.callsDelta>=0?"+":""}${meetingReview.improver.callsDelta} Calls`:t("No comparison data yet","مفيش بيانات مقارنة كفاية")}</div></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><div className="text-[10px] font-black text-amber-700">NEEDS ATTENTION</div><div className="mt-1 font-black">{meetingReview.decliner?meetingReview.agentName(meetingReview.decliner.a):t("No clear decline","مفيش تراجع واضح")}</div><div className="mt-1 text-[11px] font-bold text-amber-800">{meetingReview.decliner?`${meetingReview.decliner.qDelta} Qualified · ${meetingReview.decliner.convDelta.toFixed(1)} pts Call→Q`:t("No negative trend in this window","مفيش اتجاه سلبي واضح في الفترة دي")}</div></div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3"><div className="text-[10px] font-black text-red-700">BIGGEST FUNNEL LEAK</div><div className="mt-1 font-black">{meetingReview.leak?.label||"—"}</div><div className="mt-1 text-[11px] font-bold text-red-800">{meetingReview.leak?`${meetingReview.leak.rate}% ${t("conversion","تحويل")}`:t("Not enough funnel volume yet","الحجم لسه مش كفاية للحكم")}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black text-slate-500">FOLLOW-UP RISK</div><div className="mt-1 font-black">{meetingReview.followRisk?meetingReview.agentName(meetingReview.followRisk):"—"}</div><div className="mt-1 text-[11px] font-bold text-slate-600">{meetingReview.followRisk?`${Number(meetingReview.followRisk.current?.overdue||0)} Overdue · ${Number(meetingReview.followRisk.current?.followup_coverage_pct||0)}% Coverage`:"—"}</div></div>
      </div>
      <div className="mt-4 rounded-2xl border bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black text-slate-400">LEADS NEEDING ATTENTION</div><div className="font-black">{t("Stuck, overdue or missing follow-up","ليدز واقفة أو متأخرة أو من غير متابعة")}</div></div><div className="rounded-full bg-white px-2.5 py-1 text-xs font-black">{meetingReview.attention.length}</div></div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {meetingReview.attention.length?meetingReview.attention.slice(0,8).map((lead:any)=><div key={lead.id} className="rounded-xl border bg-white p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{lead.client_name}</div><div className="mt-0.5 text-[10px] font-bold text-slate-400">{lang==="ar"?(lead.agent_name_ar||lead.agent_name_en):lead.agent_name_en} · {lang==="ar"?(stageAr[lead.stage]||lead.stage):lead.stage}</div></div><div className="flex flex-wrap justify-end gap-1">{(lead.issues||[]).map((issue:string)=><span key={issue} className={`rounded-full px-2 py-1 text-[9px] font-black ${issue==="overdue"?"bg-red-100 text-red-700":issue==="dormant"?"bg-amber-100 text-amber-700":"bg-slate-200 text-slate-700"}`}>{issue==="overdue"?t("OVERDUE","متأخر"):issue==="dormant"?t("7+ DAYS","+7 أيام"):t("NO FOLLOW-UP","بدون متابعة")}</span>)}</div></div><div className="mt-2 text-[10px] font-bold text-slate-400">{t("Last update","آخر تعديل")}: {new Date(lead.updated_at).toLocaleString(lang==="ar"?"ar-EG":"en-GB",{timeZone:"Africa/Cairo",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div></div>):<div className="rounded-xl border border-dashed bg-white p-4 text-center text-xs font-bold text-slate-400 lg:col-span-2">{t("No leads need intervention right now.","مفيش ليدز محتاجة تدخل دلوقتي.")}</div>}
        </div>
      </div>
    </div>

    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="text-[10px] font-black tracking-[.14em] text-slate-400">CURRENT PIPELINE</div>
      <h3 className="font-black">{t("Stage distribution","توزيع الـPipeline الحالية")}</h3>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {stageOrder.map(stage=>{const c=Number(stageCounts[stage]||0);return <div key={stage} className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black">{lang==="ar"?(stageAr[stage]||stage):stage}</span><span className="text-sm font-black">{c}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-950" style={{width:`${Math.max(c?5:0,(c/maxStage)*100)}%`}}/></div></div>})}
      </div>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold leading-5 text-amber-900">
      {t("Reading rule: Potential Cases is the team's daily self-reported qualified interest. Qualified Leads is independently measured from actual pipeline stage events (first entry into Warm/Hot), so the meeting can expose gaps between activity reporting and pipeline execution.","قاعدة القراءة: Potential Cases هو الرقم اليومي اللي الفريق بيسجله كاهتمام مؤهل. Qualified Leads بيتحسب بشكل مستقل من أحداث الـPipeline الفعلية عند دخول Warm/Hot، وبالتالي الاجتماع يقدر يكشف الفرق بين النشاط المسجل والتنفيذ الحقيقي في الـPipeline.")}
    </div>
  </section>;
}
