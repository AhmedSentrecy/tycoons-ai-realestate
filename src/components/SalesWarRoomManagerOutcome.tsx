import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'

function money(value:any){
  const n=Number(value||0)
  if(n>=1_000_000_000){const v=n/1_000_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}B`}
  if(n>=1_000_000){const v=n/1_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}M`}
  if(n>=1_000){const v=n/1_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}K`}
  return `EGP ${n.toLocaleString()}`
}

export default function SalesWarRoomManagerOutcome(){
  const location=useLocation()
  const [target,setTarget]=useState<HTMLElement|null>(null)
  const [totals,setTotals]=useState<any>(null)
  const [lang,setLang]=useState<'en'|'ar'>((localStorage.getItem('warRoomLang') as 'en'|'ar')||'en')
  const active=location.pathname==='/sales-war-room/manager'
  const t=(en:string,ar:string)=>lang==='ar'?ar:en

  useEffect(()=>{
    if(!active){setTotals(null);return}
    let cancelled=false
    async function load(){
      const token=localStorage.getItem('warRoomManagerToken')||''
      if(!token){if(!cancelled)setTotals(null);return}
      try{const data=await salesWarRoomApi.getSalesTotals(token);if(!cancelled)setTotals(data)}catch{if(!cancelled)setTotals(null)}
    }
    void load()
    const timer=window.setInterval(()=>void load(),15000)
    return()=>{cancelled=true;window.clearInterval(timer)}
  },[active])

  useEffect(()=>{
    if(!active)return
    const timer=window.setInterval(()=>setLang((localStorage.getItem('warRoomLang') as 'en'|'ar')||'en'),1000)
    return()=>window.clearInterval(timer)
  },[active])

  useEffect(()=>{
    setTarget(null)
    if(!active||!totals)return
    const id='sales-war-room-manager-outcomes-addon'
    let attempts=0
    const place=()=>{
      attempts++
      document.getElementById(id)?.remove()
      const header=document.querySelector('main header')
      if(!header){if(attempts<40)window.setTimeout(place,150);return}
      const el=document.createElement('div');el.id=id;header.insertAdjacentElement('afterend',el);setTarget(el)
    }
    place()
    return()=>document.getElementById(id)?.remove()
  },[active,Boolean(totals)])

  if(!active||!target||!totals)return null
  const team=totals.team||{}

  return createPortal(
    <section className="mb-4 rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-3"><div className="text-xs font-black tracking-[.15em] text-slate-400">{t('SALES VALUE BOARD','لوحة قيمة المبيعات')}</div><h2 className="text-lg font-black">{t('Expected · Won · Lost by agent','Expected · Won · Lost لكل Agent')}</h2></div>
      <div className="grid gap-3 md:grid-cols-3">
        <ValueCard label={t('TEAM EXPECTED','إجمالي Expected')} value={money(team.expected_sales)} tone="expected" />
        <ValueCard label={t('TEAM WON','إجمالي Won')} value={money(team.won_sales)} sub={`${Number(team.won_deals||0)} ${t('won deal(s)','صفقة Won')}`} tone="won" />
        <ValueCard label={t('TEAM LOST','إجمالي Lost')} value={money(team.lost_sales)} tone="lost" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(totals.agents||[]).map((a:any)=><div key={a.id} className="rounded-2xl border bg-slate-50 p-4"><div className="font-black">{lang==='ar'?a.name_ar:a.name_en}</div><div className="mt-3 grid gap-2 text-xs"><Metric label="Expected" value={money(a.expected_sales)} cls="text-slate-900"/><Metric label="Won" value={money(a.won_sales)} cls="text-emerald-700"/><Metric label="Lost" value={money(a.lost_sales)} cls="text-red-600"/></div></div>)}
      </div>
    </section>,target,
  )
}

function ValueCard({label,value,sub,tone}:any){
  const cls=tone==='won'?'border-emerald-200 bg-emerald-50 text-emerald-950':tone==='lost'?'border-red-200 bg-red-50 text-red-950':'border-slate-800 bg-slate-950 text-white'
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="text-xs font-black tracking-[.12em] opacity-70">{label}</div><div className="mt-2 text-3xl font-black">{value}</div>{sub&&<div className="mt-1 text-xs font-bold opacity-70">{sub}</div>}</div>
}
function Metric({label,value,cls}:any){return <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-500">{label}</span><span className={`font-black ${cls}`}>{value}</span></div>}
