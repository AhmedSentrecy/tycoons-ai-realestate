import { useEffect, useMemo, useState } from 'react'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'

const TOKEN_KEY='warRoomAgentToken:mostafa-amr'
const stages=["New Lead","Contacted","Cold","Warm","Hot / Very Potential","Hold","Meeting Scheduled","Meeting Held","Negotiation / Closing","Won","Lost / Dead"]
const money=(n:number)=>n>=1_000_000_000?`EGP ${(n/1_000_000_000).toFixed(1)}B`:n>=1_000_000?`EGP ${(n/1_000_000).toFixed(1)}M`:`EGP ${Math.round(n).toLocaleString()}`
const fmt=(d:Date)=>d.toISOString().slice(0,10)

export default function SalesWarRoomSupervisor(){
  const token=localStorage.getItem(TOKEN_KEY)||''
  const [from,setFrom]=useState(()=>{const d=new Date();d.setDate(1);return fmt(d)})
  const [to,setTo]=useState(()=>fmt(new Date()))
  const [data,setData]=useState<any>(null)
  const [pipeline,setPipeline]=useState<any[]>([])
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [editing,setEditing]=useState<any>(null)

  useEffect(()=>{document.title='Tycoons Team Control';if(token)void load()},[token,from,to])

  async function load(){
    try{
      setLoading(true);setError('')
      const [summary,p]=await Promise.all([salesWarRoomApi.supervisorSummary(token,from,to),salesWarRoomApi.supervisorPipeline(token)])
      setData(summary);setPipeline(p.pipeline||[])
    }catch(e:any){setError(e.message||'Could not load team control')}
    finally{setLoading(false)}
  }

  async function openAgent(slug:string){
    try{
      setError('')
      const r=await salesWarRoomApi.supervisorAgentAccess(token,slug)
      localStorage.setItem(`warRoomAgentToken:${slug}`,r.token)
      window.location.href=`/sales-war-room/a/${slug}`
    }catch(e:any){setError(e.message||'Could not open agent')}
  }

  async function saveLead(){
    if(!editing)return
    try{
      setError('')
      const expected=Number(editing.expected_sale_m||0)
      await salesWarRoomApi.supervisorUpdateLead(token,{...editing,expected_value:Number.isFinite(expected)?expected*1_000_000:null,next_action_date:editing.next_action_date||null})
      setEditing(null);await load()
    }catch(e:any){setError(e.message||'Could not save lead')}
  }

  const rows=useMemo(()=>{
    if(!data)return[]
    return (data.agents||[]).map((a:any)=>{
      const scores=(data.scores||[]).filter((s:any)=>s.agent_id===a.id)
      const pipe=(data.pipeline||[]).filter((p:any)=>p.agent_id===a.id)
      let calls=0,wins=0,losses=0,meetings=0
      scores.forEach((s:any)=>{for(let i=1;i<=4;i++){calls+=Number(s[`match${i}_calls`]||0);if(s[`match${i}_status`]==='win')wins++;if(s[`match${i}_status`]==='loss')losses++}meetings+=Number(s.meetings_scheduled||0)})
      const sales=(data.agent_sales||[]).find((x:any)=>x.id===a.id)||{}
      return{...a,calls,wins,losses,meetings,warm:pipe.filter((x:any)=>x.stage==='Warm').length,hot:pipe.filter((x:any)=>x.stage==='Hot / Very Potential').length,...sales}
    })
  },[data])

  if(!token)return <main className="grid min-h-screen place-items-center bg-slate-950 p-5 text-white"><div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-center"><div className="text-xs font-black tracking-[.18em] text-slate-400">TYCOONS SALES WAR ROOM</div><h1 className="mt-2 text-2xl font-black">Team Control</h1><p className="mt-3 text-sm text-slate-300">Login to Mostafa Amr's War Room first.</p><button onClick={()=>window.location.href='/sales-war-room/a/mostafa-amr'} className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-slate-950">Login as Mostafa</button></div></main>

  return <main className="min-h-screen bg-[#f3f5f7] p-3 text-slate-950 md:p-5">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-black tracking-[.18em] text-emerald-700">MOSTAFA AMR · TEAM CONTROL</div><h1 className="text-2xl font-black">Ahmed Yehia + Nour Mohamed</h1></div><div className="flex gap-2"><button onClick={()=>window.location.href='/sales-war-room/a/mostafa-amr'} className="rounded-xl border bg-white px-4 py-2 text-sm font-black">My War Room</button><button onClick={()=>window.location.href='/sales-war-room/app'} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Home</button></div></header>

      <section className="grid gap-3 rounded-3xl bg-slate-950 p-4 text-white md:grid-cols-[1fr_auto]"><div><div className="text-xs font-black text-slate-400">TEAM PERFORMANCE WINDOW</div><div className="mt-2 text-3xl font-black">{from} → {to}</div></div><div className="flex gap-2"><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-xl p-2 text-slate-950"/><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-xl p-2 text-slate-950"/></div></section>

      {error&&<div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      <section className="mt-4 grid gap-3 md:grid-cols-3"><Card title="Expected Sales" value={money(Number(data?.team_sales?.expected_sales||0))}/><Card title="Won Sales" value={money(Number(data?.team_sales?.won_sales||0))}/><Card title="Lost Sales" value={money(Number(data?.team_sales?.lost_sales||0))}/></section>

      <section className="mt-4 grid gap-3 md:grid-cols-2">{rows.map((r:any)=><button key={r.id} onClick={()=>openAgent(r.slug)} className="rounded-3xl border bg-white p-5 text-start shadow-sm"><div className="flex items-start justify-between"><div><div className="text-xl font-black">{r.name_en}</div><div className="mt-1 text-xs font-bold text-slate-500">Open full dashboard</div></div><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">OPEN</span></div><div className="mt-4 grid grid-cols-4 gap-2"><Mini label="Calls" value={r.calls}/><Mini label="W/L" value={`${r.wins}/${r.losses}`}/><Mini label="Warm" value={r.warm}/><Mini label="Hot" value={r.hot}/></div><div className="mt-3 grid grid-cols-3 gap-2"><Mini label="Expected" value={money(Number(r.expected_sales||0))}/><Mini label="Won" value={money(Number(r.won_sales||0))}/><Mini label="Lost" value={money(Number(r.lost_sales||0))}/></div></button>)}</section>

      <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm"><div className="mb-4"><h2 className="text-lg font-black">Pipeline Editor</h2><p className="text-xs text-slate-500">Full edit access for Ahmed Yehia and Nour Mohamed only.</p></div><div className="space-y-2">{pipeline.map((x:any)=>{const agent=(data?.agents||[]).find((a:any)=>a.id===x.agent_id);return editing?.id===x.id?<div key={x.id} className="rounded-2xl border-2 border-slate-400 bg-slate-50 p-3"><div className="grid gap-2 md:grid-cols-4"><input value={editing.client_name} onChange={e=>setEditing({...editing,client_name:e.target.value})} className="rounded-xl border p-3"/><input value={editing.phone} onChange={e=>setEditing({...editing,phone:e.target.value})} className="rounded-xl border p-3"/><input value={editing.budget} onChange={e=>setEditing({...editing,budget:e.target.value})} className="rounded-xl border p-3"/><select value={editing.stage} onChange={e=>setEditing({...editing,stage:e.target.value})} className="rounded-xl border p-3">{stages.map(s=><option key={s}>{s}</option>)}</select><input type="number" step="0.1" value={editing.expected_sale_m} onChange={e=>setEditing({...editing,expected_sale_m:e.target.value})} placeholder="Expected Sale M" className="rounded-xl border p-3"/><input value={editing.next_action} onChange={e=>setEditing({...editing,next_action:e.target.value})} placeholder="Next Action" className="rounded-xl border p-3 md:col-span-2"/><input type="date" value={editing.next_action_date||''} onChange={e=>setEditing({...editing,next_action_date:e.target.value})} className="rounded-xl border p-3"/><input value={editing.next_action_trigger} onChange={e=>setEditing({...editing,next_action_trigger:e.target.value})} placeholder="Trigger" className="rounded-xl border p-3"/><textarea value={editing.notes} onChange={e=>setEditing({...editing,notes:e.target.value})} className="min-h-[90px] rounded-xl border p-3 md:col-span-2"/><div className="flex gap-2"><button onClick={()=>setEditing(null)} className="flex-1 rounded-xl border p-3 font-black">Cancel</button><button onClick={saveLead} className="flex-1 rounded-xl bg-slate-950 p-3 font-black text-white">Save</button></div></div></div>:<div key={x.id} className="grid gap-3 rounded-2xl border bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"><div><div className="font-black">{x.client_name}</div><div className="text-xs font-bold text-slate-500">{agent?.name_en}</div></div><div className="text-xs"><b>{x.stage}</b><div>{x.phone||'No phone'}</div></div><div className="text-xs"><b>{money(Number(x.expected_value||0))}</b><div>{x.next_action||'—'} {x.next_action_date?`· ${x.next_action_date}`:''}</div></div><button onClick={()=>setEditing({...x,expected_sale_m:x.expected_value?String(Number(x.expected_value)/1_000_000):''})} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Edit</button></div>})}</div></section>
      {loading&&<div className="mt-3 text-center text-xs font-bold text-slate-500">Refreshing…</div>}
    </div>
  </main>
}

function Card({title,value}:any){return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-black text-slate-500">{title}</div><div className="mt-1 text-3xl font-black">{value}</div></div>}
function Mini({label,value}:any){return <div className="rounded-xl bg-slate-50 p-2"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 text-sm font-black">{value}</div></div>}
