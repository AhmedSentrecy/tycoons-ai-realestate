import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'
import {
  getNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotificationInbox,
  type WarRoomNotificationItem,
} from '../lib/warRoomNotifications'

type ViewNotificationItem = WarRoomNotificationItem & {
  agentName: string
}

type CenterMode = 'agent' | 'owner' | 'supervisor' | 'none'

function routeAgentSlug(pathname: string) {
  return pathname.match(/^\/sales-war-room\/a\/([^/]+)/)?.[1] || ''
}

function activeAgentSlug(pathname: string) {
  const routeSlug = routeAgentSlug(pathname)
  if (routeSlug) return routeSlug
  if (pathname === '/sales-war-room/app' || pathname === '/sales-war-room/app/') {
    return localStorage.getItem('warRoomLastAgent') || ''
  }
  return ''
}

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthStartLocal() {
  const d = new Date()
  d.setDate(1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function displayAgentName(agent: any, lang: 'en' | 'ar') {
  if (lang === 'ar') return String(agent?.name_ar || agent?.name_en || agent?.slug || 'Agent')
  return String(agent?.name_en || agent?.name_ar || agent?.slug || 'Agent')
}

export default function SalesWarRoomNotificationCenter() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ViewNotificationItem[]>([])
  const [syncing, setSyncing] = useState(false)
  const [openingId, setOpeningId] = useState('')
  const [error, setError] = useState('')
  const [, setAuthTick] = useState(0)
  const syncingRef = useRef(false)
  const lang = (localStorage.getItem('warRoomLang') as 'en' | 'ar') || 'en'
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en)

  const ownerToken = localStorage.getItem('warRoomAdminToken') || ''
  const mostafaToken = localStorage.getItem('warRoomAgentToken:mostafa-amr') || ''
  const agentSlug = activeAgentSlug(location.pathname)
  const agentToken = agentSlug ? (localStorage.getItem(`warRoomAgentToken:${agentSlug}`) || '') : ''

  const mode: CenterMode = (() => {
    if ((location.pathname === '/sales-war-room/admin' || location.pathname === '/sales-war-room/owner') && ownerToken) return 'owner'
    if (location.pathname === '/sales-war-room/supervisor' && mostafaToken) return 'supervisor'
    if (agentSlug && agentToken) return 'agent'
    return 'none'
  })()

  useEffect(() => {
    const refreshAuth = () => setAuthTick(v => v + 1)
    const timer = window.setInterval(refreshAuth, 1200)
    window.addEventListener('storage', refreshAuth)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', refreshAuth)
    }
  }, [])

  async function refreshCenter() {
    if (mode === 'none' || syncingRef.current) return
    try {
      syncingRef.current = true
      setSyncing(true)
      setError('')

      if (mode === 'agent') {
        setItems(getNotificationInbox(agentSlug).map(item => ({ ...item, agentName: '' })))
        return
      }

      if (mode === 'owner') {
        const [agentResponse, pipelineResponse] = await Promise.all([
          salesWarRoomApi.adminAgents(ownerToken),
          salesWarRoomApi.getOwnerPipeline(ownerToken),
        ])
        const agents = Array.isArray(agentResponse) ? agentResponse : (agentResponse?.agents || [])
        const pipeline = pipelineResponse?.pipeline || []
        const merged: ViewNotificationItem[] = []

        for (const agent of agents) {
          const agentPipeline = pipeline.filter((lead: any) => lead.agent_id === agent.id)
          const synced = syncNotificationInbox(agent.slug, agentPipeline)
          const agentName = displayAgentName(agent, lang)
          merged.push(...synced.map(item => ({ ...item, agentName })))
        }

        merged.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        setItems(merged)
        return
      }

      const [summary, pipelineResponse] = await Promise.all([
        salesWarRoomApi.supervisorSummary(mostafaToken, monthStartLocal(), todayLocal()),
        salesWarRoomApi.supervisorPipeline(mostafaToken),
      ])
      const agents = summary?.agents || []
      const pipeline = pipelineResponse?.pipeline || []
      const merged: ViewNotificationItem[] = []

      for (const agent of agents) {
        const agentPipeline = pipeline.filter((lead: any) => lead.agent_id === agent.id)
        const synced = syncNotificationInbox(agent.slug, agentPipeline)
        const agentName = displayAgentName(agent, lang)
        merged.push(...synced.map(item => ({ ...item, agentName })))
      }

      merged.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      setItems(merged)
    } catch (e: any) {
      setError(e?.message || t('Could not refresh notifications', 'تعذر تحديث التنبيهات'))
      if (mode === 'agent') {
        setItems(getNotificationInbox(agentSlug).map(item => ({ ...item, agentName: '' })))
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }

  useEffect(() => {
    setOpen(false)
    setError('')
    if (mode === 'agent') {
      setItems(getNotificationInbox(agentSlug).map(item => ({ ...item, agentName: '' })))
    } else if (mode !== 'none') {
      void refreshCenter()
    } else {
      setItems([])
    }
  }, [location.pathname, mode, agentSlug])

  useEffect(() => {
    if (mode === 'none') return

    if (mode === 'agent') {
      const refreshLocal = () => setItems(getNotificationInbox(agentSlug).map(item => ({ ...item, agentName: '' })))
      window.addEventListener('war-room-notifications-changed', refreshLocal)
      const timer = window.setInterval(refreshLocal, 15_000)
      return () => {
        window.clearInterval(timer)
        window.removeEventListener('war-room-notifications-changed', refreshLocal)
      }
    }

    const timer = window.setInterval(() => void refreshCenter(), 60_000)
    return () => window.clearInterval(timer)
  }, [mode, agentSlug, ownerToken, mostafaToken])

  const unread = useMemo(() => items.filter(item => !item.readAt).length, [items])

  if (mode === 'none') return null

  async function openItem(item: ViewNotificationItem) {
    if (openingId) return
    try {
      setOpeningId(item.id)
      setError('')
      markNotificationRead(item.slug, item.id)

      if (mode === 'owner') {
        const access = await salesWarRoomApi.adminAgentAccess(ownerToken, item.slug)
        localStorage.setItem(`warRoomAgentToken:${item.slug}`, access.token)
        sessionStorage.setItem('warRoomControlReturnTo', '/sales-war-room/admin')
      } else if (mode === 'supervisor') {
        const access = await salesWarRoomApi.supervisorAgentAccess(mostafaToken, item.slug)
        localStorage.setItem(`warRoomAgentToken:${item.slug}`, access.token)
        sessionStorage.setItem('warRoomControlReturnTo', '/sales-war-room/supervisor')
      }

      setOpen(false)
      navigate(item.route)
    } catch (e: any) {
      setError(e?.message || t('Could not open lead', 'تعذر فتح الـLead'))
    } finally {
      setOpeningId('')
    }
  }

  function markAll() {
    const slugs = new Set(items.map(item => item.slug))
    for (const slug of slugs) markAllNotificationsRead(slug)
    const now = new Date().toISOString()
    setItems(items.map(item => ({ ...item, readAt: item.readAt || now })))
  }

  const multiAgent = mode === 'owner' || mode === 'supervisor'

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(value => !value)
          if (!open && multiAgent) void refreshCenter()
        }}
        aria-label={t('Notifications', 'التنبيهات')}
        className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] left-4 z-[2147482000] grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-2xl text-white shadow-2xl ring-1 ring-white/20 active:scale-95"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-600 px-1.5 py-1 text-center text-[10px] font-black leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[2147481900] bg-slate-950/25" onClick={() => setOpen(false)}>
          <section
            onClick={event => event.stopPropagation()}
            className="absolute bottom-[max(84px,calc(env(safe-area-inset-bottom)+76px))] left-3 w-[min(430px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <header className="flex items-center justify-between gap-3 border-b p-4">
              <div>
                <div className="text-[10px] font-black tracking-[.16em] text-slate-400">SALES WAR ROOM</div>
                <h2 className="text-lg font-black">{t('Notifications', 'التنبيهات')}</h2>
                {multiAgent && <div className="mt-0.5 text-[10px] font-bold text-slate-400">{mode === 'owner' ? t('All agents', 'كل الـAgents') : 'Ahmed Yehia + Nour Mohamed'}</div>}
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && unread > 0 && (
                  <button type="button" onClick={markAll} className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-700">
                    {t('Mark all read', 'تحديد الكل كمقروء')}
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 font-black text-white">×</button>
              </div>
            </header>

            {error && <div className="border-b bg-red-50 px-4 py-2 text-xs font-bold text-red-700">{error}</div>}

            <div className="max-h-[min(64vh,580px)] overflow-y-auto p-2">
              {syncing && items.length === 0 ? (
                <div className="p-8 text-center text-sm font-bold text-slate-400">{t('Refreshing notifications…', 'جاري تحديث التنبيهات…')}</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-3xl">🔔</div>
                  <div className="mt-2 font-black text-slate-700">{t('No follow-up notifications yet', 'مفيش تنبيهات متابعة لسه')}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{t('Due follow-ups will stay here even if the phone notification disappears.', 'المتابعات المستحقة هتفضل هنا حتى لو تنبيه الموبايل اختفى.')}</div>
                </div>
              ) : (
                items.map(item => (
                  <button
                    type="button"
                    key={`${item.slug}:${item.id}`}
                    disabled={Boolean(openingId)}
                    onClick={() => void openItem(item)}
                    className={`mb-2 w-full rounded-2xl border p-3 text-start active:scale-[.99] disabled:opacity-60 ${item.readAt ? 'bg-white' : 'border-amber-200 bg-amber-50'}`}
                  >
                    {multiAgent && (
                      <div className="mb-2 inline-flex rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">
                        👤 {item.agentName}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">{item.clientName}</div>
                        <div className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.body}</div>
                      </div>
                      {!item.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-black text-slate-400">
                      <span>{item.date}</span>
                      <span>{openingId === item.id ? t('Opening…', 'جاري الفتح…') : t('Open lead →', 'افتح الـLead ←')}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
