import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'

const stages = ['New Lead','Contacted','Cold','Warm','Hot / Very Potential','Hold','Meeting Scheduled','Meeting Held','Negotiation / Closing','Won','Lost / Dead']

function phoneForCall(phone:string){return String(phone||'').replace(/[^\d+]/g,'')}
function phoneForWhatsApp(phone:string){let digits=String(phone||'').replace(/\D/g,'');if(digits.startsWith('00'))digits=digits.slice(2);if(/^01\d{9}$/.test(digits))digits=`20${digits.slice(1)}`;return digits}
function formatEgp(value:any){const n=Number(value||0);if(n>=1_000_000_000){const v=n/1_000_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}B`}if(n>=1_000_000){const v=n/1_000_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}M`}if(n>=1_000){const v=n/1_000;return `EGP ${Number.isInteger(v)?v:v.toFixed(1)}K`}return `EGP ${n.toLocaleString()}`}

export default function SalesWarRoomLead(){
  const { slug = '', leadId = '' } = useParams()
  const navigate = useNavigate()
  const sessionKey = `warRoomAgentToken:${slug}`
  const ownerToken = localStorage.getItem('warRoomAdminToken') || ''
  const [token,setToken] = useState(()=>localStorage.getItem(sessionKey)||'')
  const [password,setPassword] = useState('')
  const [data,setData] = useState<any>(null)
  const [lead,setLead] = useState<any>(null)
  const [draft,setDraft] = useState<any>(null)
  const [editing,setEditing] = useState(false)
  const [loading,setLoading] = useState(Boolean(token||ownerToken))
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const lang = (localStorage.getItem('warRoomLang') as 'en'|'ar') || 'en'
  const t=(en:string,ar:string)=>lang==='ar'?ar:en

  useEffect(()=>{
    document.title = 'Sales War Room Lead'
    const m=document.createElement('meta');m.name='robots';m.content='noindex,nofollow,noarchive';document.head.appendChild(m)
    return()=>m.remove()
  },[])

  useEffect(()=>{
    if(slug) localStorage.setItem('warRoomLastAgent',slug)
  },[slug])

  async function load(activeToken=token){
    if(!activeToken)return
    try{
      setLoading(true);setError('')
      const agentData=await salesWarRoomApi.getAgent(slug,activeToken)
      const found=(agentData.pipeline||[]).find((x:any)=>String(x.id)===String(leadId))
      setData(agentData)
      setLead(found||null)
      if(found&&!editing)setDraft({...found})
      if(!found)setError(t('Lead not found or no longer available.','الـLead مش موجود أو مبقاش متاح.'))
    }catch(e:any){
      if(e.message==='unauthorized'){
        localStorage.removeItem(sessionKey);setToken('');setData(null);setLead(null)
        setError(t('Session expired. Enter your password again.','جلسة الدخول انتهت. اكتب الباسورد مرة تانية.'))
      }else setError(e.message)
    }finally{setLoading(false)}
  }

  async function bootstrapOwner(){
    if(token||!ownerToken)return
    try{
      setLoading(true);setError('')
      const r=await salesWarRoomApi.adminAgentAccess(ownerToken,slug)
      localStorage.setItem(sessionKey,r.token);setToken(r.token)
    }catch(e:any){setError(e.message)}finally{setLoading(false)}
  }

  async function login(){
    if(!password)return
    try{
      setLoading(true);setError('')
      const r=await salesWarRoomApi.agentLogin(slug,password)
      localStorage.setItem(sessionKey,r.token);setToken(r.token);setPassword('')
    }catch(e:any){setError(e.message==='invalid_credentials'?t('Wrong password','الباسورد غير صحيح'):e.message)}finally{setLoading(false)}
  }

  useEffect(()=>{if(token)void load(token);else if(ownerToken)void bootstrapOwner();else setLoading(false)},[slug,leadId,token])

  function startEdit(){
    if(!lead)return
    setDraft({
      client_name:lead.client_name||'',phone:lead.phone||'',budget:lead.budget||'',stage:lead.stage||'New Lead',
      next_action:lead.next_action||'',next_action_date:lead.next_action_date||'',next_action_trigger:lead.next_action_trigger||'',notes:lead.notes||''
    })
    setEditing(true)
  }

  async function save(){
    if(!draft||saving)return
    if(!String(draft.client_name||'').trim())return setError(t('Client name is required.','اسم العميل مطلوب.'))
    if(draft.stage==='Warm'&&(!String(draft.next_action||'').trim()||(!draft.next_action_date&&!String(draft.next_action_trigger||'').trim())))return setError(t('Warm requires Next Action plus a Date or Trigger.','Warm لازم يكون له Next Action ومعاه Date أو Trigger.'))
    try{
      setSaving(true);setError('')
      await salesWarRoomApi.updateLead(token,{
        id:leadId,
        client_name:draft.client_name,
        phone:draft.phone,
        budget:draft.budget,
        stage:draft.stage,
        next_action:draft.next_action,
        next_action_date:draft.next_action_date||null,
        next_action_trigger:draft.next_action_trigger,
        notes:draft.notes,
      })
      setEditing(false)
      await load(token)
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }

  if(!token)return <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white" dir={lang==='ar'?'rtl':'ltr'}>
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="text-xs font-black tracking-[.18em] text-slate-400">TYCOONS SALES WAR ROOM</div>
      <h1 className="mt-1 text-2xl font-black">{t('Open Lead','فتح الـLead')}</h1>
      <p className="mt-2 text-sm text-slate-400">{t('Sign in and you will continue directly to this lead.','سجّل دخول وهتكمل مباشرة على الـLead ده.')}</p>
      <input type="password" autoComplete="current-password" autoCapitalize="none" spellCheck={false} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void login()} placeholder={t('Password','الباسورد')} className="mt-5 w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none"/>
      <button disabled={loading||!password} onClick={()=>void login()} className="mt-3 w-full rounded-xl bg-white p-3 font-black text-slate-950 disabled:opacity-50">{loading?t('Signing in…','جاري الدخول…'):t('Open Lead','افتح الـLead')}</button>
      {error&&<div className="mt-3 text-sm text-red-300">{error}</div>}
    </div>
  </main>

  if(loading&&!data)return <main className="grid min-h-screen place-items-center bg-slate-950 text-white">{t('Opening lead…','جاري فتح الـLead…')}</main>

  if(!lead)return <main className="grid min-h-screen place-items-center bg-[#f3f5f7] p-4 text-slate-950"><div className="max-w-sm rounded-3xl border bg-white p-6 text-center shadow-sm"><div className="text-3xl">🔎</div><h1 className="mt-2 text-xl font-black">{t('Lead unavailable','الـLead غير متاح')}</h1><div className="mt-2 text-sm text-slate-500">{error}</div><button onClick={()=>navigate(`/sales-war-room/a/${slug}`)} className="mt-4 rounded-xl bg-slate-950 px-4 py-3 font-black text-white">{t('Back to Pipeline','ارجع للـPipeline')}</button></div></main>

  const phone=String(lead.phone||'')
  const call=phoneForCall(phone)
  const wa=phoneForWhatsApp(phone)
  const agentName=lang==='ar'?data?.agent?.name_ar:data?.agent?.name_en

  return <main className="min-h-screen bg-[#f3f5f7] text-slate-950" dir={lang==='ar'?'rtl':'ltr'}>
    <div className="mx-auto max-w-3xl p-3 pb-24 md:p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <button onClick={()=>navigate(`/sales-war-room/a/${slug}`)} className="rounded-full border bg-white px-4 py-2 text-sm font-black shadow-sm">← {t('Pipeline','Pipeline')}</button>
        <div className="text-end"><div className="text-[10px] font-black tracking-[.16em] text-slate-400">{agentName||'SALES WAR ROOM'}</div><div className="text-xs font-bold text-slate-500">{t('Lead detail','تفاصيل الـLead')}</div></div>
      </header>

      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-xs font-black tracking-[.14em] text-slate-400">CLIENT</div><h1 className="mt-1 text-3xl font-black">{lead.client_name}</h1><div className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black">{lead.stage}</div></div>
          {!editing&&<button onClick={startEdit} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950">✏️ {t('Edit','تعديل')}</button>}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Metric label={t('Budget','Budget')} value={lead.budget||'—'}/>
          <Metric label={t('Expected Sale','Expected Sale')} value={formatEgp(lead.expected_value)}/>
          <Metric label={t('Follow-up','Follow-up')} value={lead.next_action_date||'—'}/>
          <Metric label={t('Trigger','Trigger')} value={lead.next_action_trigger||'—'}/>
        </div>
      </section>

      {phone&&<section className="mt-4 grid grid-cols-2 gap-3">
        <a href={`tel:${call}`} className="rounded-2xl bg-slate-950 p-4 text-center font-black text-white">📞 {t('Call','اتصال')}</a>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-600 p-4 text-center font-black text-white">WhatsApp</a>
      </section>}

      {!editing?<section className="mt-4 space-y-3">
        <Info title={t('Phone','Phone')} value={phone||'—'}/>
        <Info title={t('Next Action','Next Action')} value={lead.next_action||'—'}/>
        <Info title={t('Client Feedback / Notes','Client Feedback / Notes')} value={lead.notes||'—'}/>
      </section>:<section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">{t('Edit Lead','تعديل الـLead')}</h2><button onClick={()=>setEditing(false)} className="rounded-xl border px-3 py-2 text-xs font-black">{t('Cancel','إلغاء')}</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={draft.client_name||''} onChange={e=>setDraft({...draft,client_name:e.target.value})} placeholder={t('Client name','اسم العميل')} className="rounded-xl border p-3"/>
          <input value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})} placeholder={t('Phone','الموبايل')} className="rounded-xl border p-3"/>
          <input value={draft.budget||''} onChange={e=>setDraft({...draft,budget:e.target.value})} placeholder={t('Budget','الميزانية')} className="rounded-xl border p-3"/>
          <select value={draft.stage||'New Lead'} onChange={e=>setDraft({...draft,stage:e.target.value})} className="rounded-xl border bg-white p-3 font-bold">{stages.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <input value={draft.next_action||''} onChange={e=>setDraft({...draft,next_action:e.target.value})} placeholder={t('Next Action','الخطوة الجاية')} className="rounded-xl border p-3 md:col-span-2"/>
          <label className="text-xs font-black text-slate-500">{t('Follow-up Date','تاريخ المتابعة')}<input type="date" value={draft.next_action_date||''} onChange={e=>setDraft({...draft,next_action_date:e.target.value})} className="mt-1 w-full rounded-xl border p-3 text-slate-950"/></label>
          <input value={draft.next_action_trigger||''} onChange={e=>setDraft({...draft,next_action_trigger:e.target.value})} placeholder="Trigger" className="rounded-xl border p-3"/>
          <textarea value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder={t('Client Feedback / Notes','الفيدباك / الملاحظات')} className="min-h-[130px] rounded-xl border p-3 md:col-span-2"/>
        </div>
        {error&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        <button disabled={saving} onClick={()=>void save()} className="mt-3 w-full rounded-xl bg-slate-950 p-3 font-black text-white disabled:opacity-50">{saving?t('Saving…','جاري الحفظ…'):t('Save Changes','حفظ التعديل')}</button>
      </section>}
    </div>
  </main>
}

function Metric({label,value}:{label:string,value:any}){return <div className="rounded-2xl bg-white/10 p-3"><div className="text-[10px] font-black text-slate-400">{label}</div><div className="mt-1 break-words font-black">{value}</div></div>}
function Info({title,value}:{title:string,value:any}){return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-xs font-black text-slate-400">{title}</div><div className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800">{value}</div></div>}
