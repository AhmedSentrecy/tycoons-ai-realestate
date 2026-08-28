import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useLocation, useNavigate } from 'react-router'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'
import {
  getNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  syncFollowupNotifications,
  syncNotificationInbox,
  type WarRoomNotificationItem,
} from '../lib/warRoomNotifications'

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

export default function SalesWarRoomNotifications() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<WarRoomNotificationItem[]>([])
  const [syncing, setSyncing] = useState(false)
  const slug = activeAgentSlug(location.pathname)
  const token = slug ? (localStorage.getItem(`warRoomAgentToken:${slug}`) || '') : ''

  const unread = useMemo(() => items.filter(item => !item.readAt).length, [items])

  useEffect(() => {
    if (!slug || !token) {
      setItems([])
      setOpen(false)
      return
    }

    let cancelled = false
    let actionHandle: { remove: () => Promise<void> } | undefined

    const refreshInbox = () => {
      if (!cancelled) setItems(getNotificationInbox(slug))
    }

    async function sync() {
      if (cancelled || syncing) return
      try {
        setSyncing(true)
        const agentData = await salesWarRoomApi.getAgent(slug, token)
        if (Capacitor.isNativePlatform()) await syncFollowupNotifications(slug, agentData.pipeline || [])
        else syncNotificationInbox(slug, agentData.pipeline || [])
        refreshInbox()
      } catch {
        // Dashboard owns auth. Notification center remains silent.
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    refreshInbox()
    void sync()

    if (Capacitor.isNativePlatform()) {
      void LocalNotifications.addListener('localNotificationActionPerformed', event => {
        const route = event.notification.extra?.route
        const leadId = String(event.notification.extra?.leadId || '')
        const date = String(event.notification.schedule?.at || '').slice(0, 10)
        if (leadId && date) markNotificationRead(slug, `${leadId}:${date}`)
        if (typeof route === 'string' && route.startsWith('/sales-war-room/')) {
          window.location.href = route
        }
      }).then(listener => {
        if (cancelled) void listener.remove()
        else actionHandle = listener
      })
    }

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail?.slug || detail.slug === slug) refreshInbox()
    }
    const onFocus = () => void sync()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    const timer = window.setInterval(() => void sync(), 60_000)
    window.addEventListener('war-room-notifications-changed', onChanged)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('war-room-notifications-changed', onChanged)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      if (actionHandle) void actionHandle.remove()
    }
  }, [slug, token])

  if (!slug || !token) return null

  function openItem(item: WarRoomNotificationItem) {
    markNotificationRead(slug, item.id)
    setItems(getNotificationInbox(slug))
    setOpen(false)
    navigate(item.route)
  }

  function markAll() {
    markAllNotificationsRead(slug)
    setItems(getNotificationInbox(slug))
  }

  return <>
    <button
      aria-label="Notifications"
      onClick={() => setOpen(v => !v)}
      className="fixed bottom-4 right-4 z-[120] grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-2xl text-white shadow-2xl"
    >
      🔔
      {unread > 0 && <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-600 px-1.5 py-1 text-center text-[10px] font-black leading-none text-white">{unread > 99 ? '99+' : unread}</span>}
    </button>

    {open && <>
      <button aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-[121] bg-black/35" />
      <aside className="fixed bottom-20 right-3 top-[max(16px,env(safe-area-inset-top))] z-[122] flex w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-xs font-black tracking-[.15em] text-slate-400">SALES WAR ROOM</div>
            <h2 className="text-xl font-black">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && <button onClick={markAll} className="rounded-xl border px-3 py-2 text-xs font-black">Mark all read</button>}
            <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 font-black">×</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {syncing && !items.length && <div className="p-6 text-center text-sm font-bold text-slate-400">Refreshing reminders…</div>}
          {!syncing && !items.length && <div className="p-8 text-center"><div className="text-3xl">🔔</div><div className="mt-2 font-black">No due reminders</div><div className="mt-1 text-xs text-slate-500">Due and overdue follow-ups will stay here for 30 days.</div></div>}
          <div className="space-y-2">
            {items.map(item => <button key={item.id} onClick={() => openItem(item)} className={`w-full rounded-2xl border p-4 text-start transition active:scale-[.99] ${item.readAt ? 'bg-white' : 'border-amber-300 bg-amber-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="font-black">{item.clientName}</div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{item.date}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-700">{item.body}</div>
              <div className="mt-2 text-xs font-black text-emerald-700">Open lead →</div>
            </button>)}
          </div>
        </div>
      </aside>
    </>}
  </>
}
