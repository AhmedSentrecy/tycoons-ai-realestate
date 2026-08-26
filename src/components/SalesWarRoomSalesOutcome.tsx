import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

function money(value:any){
  const n=Number(value||0);
  if(n>=1_000_000_000){const v=n/1_000_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}B`}
  if(n>=1_000_000){const v=n/1_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}M`}
  if(n>=1_000){const v=n/1_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}K`}
  return `EGP ${n.toLocaleString()}`;
}

function calcPipeline(rows:any[]){
  let expected=0,won=0,lost=0,wonDeals=0;
  for(const x of rows||[]){
    const exp=Number(x.expected_value||0);
    const actual=Number(x.won_value||0);
    if(["Warm","Hot / Very Potential"].includes(x.stage))expected+=exp;
    if(x.stage==="Won"){won+=actual||exp;wonDeals+=1;}
    if(x.stage==="Lost / Dead")lost+=exp;
  }
  return {expected_sales:expected,won_sales:won,lost_sales:lost,won_deals:wonDeals};
}

type Mode="agent"|"monitor"|"owner"|"admin"|"none";

export default function SalesWarRoomSalesOutcome(){
  const location=useLocation();
  const [target,setTarget]=useState<HTMLElement|null>(null);
  const [mode,setMode]=useState<Mode>("none");
  const [totals,setTotals]=useState<any>(null);
  const [lang,setLang]=useState<"en"|"ar">((localStorage.getItem("warRoomLang") as "en"|"ar")||"en");
  const t=(en:string,ar:string)=>lang==="ar"?ar:en;

  const slug=useMemo(()=>{
    const agent=location.pathname.match(/^\/sales-war-room\/a\/([^/]+)/);
    const monitor=location.pathname.match(/^\/sales-war-room\/monitor\/([^/]+)/);
    return decodeURIComponent(agent?.[1]||monitor?.[1]||"");
  },[location.pathname]);

  useEffect(()=>{
    const id=window.setInterval(()=>{
      const next=(localStorage.getItem("warRoomLang") as "en"|"ar")||"en";
      setLang(next);
    },1000);
    return()=>window.clearInterval(id);
  },[]);

  useEffect(()=>{
    const path=location.pathname;
    const nextMode:Mode=path.startsWith("/sales-war-room/a/")?"agent":path.startsWith("/sales-war-room/monitor/")?"monitor":path==="/sales-war-room/admin"||path==="/sales-war-room/owner"?"owner":path==="/sales-war-room/team-admin"?"admin":"none";
    setMode(nextMode);
    setTotals(null);
    if(nextMode==="none")return;

    let cancelled=false;
    async function load(){
      try{
        if(nextMode==="agent"){
          const token=localStorage.getItem(`warRoomAgentToken:${slug}`)||"";
          if(!token)return;
          const data=await salesWarRoomApi.getAgent(slug,token);
          if(!cancelled)setTotals({single:calcPipeline(data.pipeline||[]),name_en:data.agent?.name_en,name_ar:data.agent?.name_ar});
          return;
        }
        if(nextMode==="monitor"){
          const token=localStorage.getItem("warRoomLimitedAdminToken")||"";
          if(!token)return;
          const data=await salesWarRoomApi.teamMonitor(token,slug);
          if(!cancelled)setTotals({single:calcPipeline(data.pipeline||[]),name_en:data.agent?.name_en,name_ar:data.agent?.name_ar});
          return;
        }
        const token=nextMode==="owner"?(localStorage.getItem("warRoomAdminToken")||""):(localStorage.getItem("warRoomLimitedAdminToken")||"");
        if(!token)return;
        const data=await salesWarRoomApi.getSalesTotals(token);
        if(!cancelled)setTotals(data);
      }catch{
        if(!cancelled)setTotals(null);
      }
    }
    void load();
    const interval=window.setInterval(()=>void load(),15000);
    const refresh=()=>window.setTimeout(()=>void load(),500);
    window.addEventListener("focus",refresh);
    window.addEventListener("click",refresh);
    return()=>{cancelled=true;window.clearInterval(interval);window.removeEventListener("focus",refresh);window.removeEventListener("click",refresh)};
  },[location.pathname,slug]);

  useEffect(()=>{
    setTarget(null);
    if(mode==="none")return;
    const addonId="sales-war-room-outcomes-addon";
    let attempts=0;
    const place=()=>{
      attempts++;
      document.getElementById(addonId)?.remove();
      const el=document.createElement("div");
      el.id=addonId;
      if(mode==="agent"||mode==="monitor"){
        const section=Array.from(document.querySelectorAll("main section")).find((x:any)=>/EXPECTED SALES|المبيعات المتوقعة/i.test(String(x.textContent||""))) as HTMLElement|undefined;
        if(!section){if(attempts<40)window.setTimeout(place,150);return;}
        section.classList.remove("md:grid-cols-[1.45fr_.75fr]");
        section.classList.add("md:grid-cols-3");
        section.appendChild(el);
      }else{
        const header=document.querySelector("main header");
        if(!header){if(attempts<40)window.setTimeout(place,150);return;}
        header.insertAdjacentElement("afterend",el);
      }
      setTarget(el);
    };
    place();
    return()=>{document.getElementById(addonId)?.remove()};
  },[mode,location.pathname,Boolean(totals)]);

  if(!target||!totals)return null;

  if(mode==="agent"||mode==="monitor"){
    const s=totals.single||{};
    return createPortal(
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
        <div className="text-xs font-black tracking-[.14em] text-emerald-600">{t("WON SALES","المبيعات المكسبة")}</div>
        <div className="mt-2 text-4xl font-black">{money(s.won_sales)}</div>
        <div className="mt-2 text-xs font-bold text-emerald-700/70">{Number(s.won_deals||0)} {t("won deal(s)","صفقة Won")}</div>
      </div>,target,
    );
  }

  const team=totals.team||{};
  return createPortal(
    <section className="mb-4 rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-3"><div className="text-xs font-black tracking-[.15em] text-slate-400">{t("SALES VALUE BOARD","لوحة قيمة المبيعات")}</div><h2 className="text-lg font-black">{t("Expected · Won · Lost by agent","Expected · Won · Lost لكل Agent")}</h2></div>
      <div className="grid gap-3 md:grid-cols-3">
        <ValueCard label={t("TEAM EXPECTED","إجمالي Expected")} value={money(team.expected_sales)} tone="expected" />
        <ValueCard label={t("TEAM WON","إجمالي Won")} value={money(team.won_sales)} sub={`${Number(team.won_deals||0)} ${t("won deal(s)","صفقة Won")}`} tone="won" />
        <ValueCard label={t("TEAM LOST","إجمالي Lost")} value={money(team.lost_sales)} tone="lost" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(totals.agents||[]).map((a:any)=><div key={a.id} className="rounded-2xl border bg-slate-50 p-4"><div className="font-black">{lang==="ar"?a.name_ar:a.name_en}</div><div className="mt-3 grid gap-2 text-xs"><Metric label="Expected" value={money(a.expected_sales)} cls="text-slate-900"/><Metric label="Won" value={money(a.won_sales)} cls="text-emerald-700"/><Metric label="Lost" value={money(a.lost_sales)} cls="text-red-600"/></div></div>)}
      </div>
    </section>,target,
  );
}

function ValueCard({label,value,sub,tone}:any){
  const cls=tone==="won"?"border-emerald-200 bg-emerald-50 text-emerald-950":tone==="lost"?"border-red-200 bg-red-50 text-red-950":"border-slate-800 bg-slate-950 text-white";
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="text-xs font-black tracking-[.12em] opacity-70">{label}</div><div className="mt-2 text-3xl font-black">{value}</div>{sub&&<div className="mt-1 text-xs font-bold opacity-70">{sub}</div>}</div>;
}
function Metric({label,value,cls}:any){return <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-500">{label}</span><span className={`font-black ${cls}`}>{value}</span></div>}
