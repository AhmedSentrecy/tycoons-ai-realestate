import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'
import {
  getNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotificationInbox,
  type WarRoomNotificationItem,
} from '../lib/warRoomNotifications'

function slugFromPath(pathname: string) {
  const match = pathname.match(/^\/sales-war-room\/a\/([^/]+)/)
  if (match?.[1]) return match[1]
  if (pathname === '/sales-war-room/app') return localStorage.getItem('warRoomLastAgent') || ''
  return ''
}

export default function SalesWarRoomNotificationCenter() {
  const location = useLocation()
  const navigate = useNavigate()
  const slug = useMemo(() => slugFromPath(location.pathname), [location.pathname])
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<WarRoomNotificationItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const lang = (localStorage.getItem('warRoomLang') as 'en' | 'ar') || 'en'
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en)

  const token = slug ? localStorage.getItem(`warRoomAgentToken:${slug}`) || '' : ''
  const unread = items.filter(item => !item.readAt).length

  function reloadLocal() {
    if (!slug) return setItems([])
    setItems(getNotificationInbox(slug))
  }

  async function refresh() {
    if (!slug || !token || refreshing) return
    try {
      setRefreshing(true)
      const data = await salesWarRoomApi.getAgent(slug, token)
      const next = syncNotificationInbox(slug, data.pipeline || [])
      setItems(next)
    } catch {
      reloadLocal()
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setOpen(false)
    reloadLocal()
    if (slug && token) void refresh()

    const onChanged = (event: Event) => {
      const custom = event as CustomEvent<{ slug?: string }>
      if (!custom.detail?.slug || custom.detail.slug === slug) reloadLocal()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === `warRoomNotificationInbox:${slug}`) reloadLocal()
    }

    window.addEventListener('war-room-notifications-changed', onChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('war-room-notifications-changed', onChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [slug, token])

  useEffect(() => {
    if (!open || !slug || !token) return
    void refresh()
  }, [open])

  if (!slug || !token) return null

  function openItem(item: WarRoomNotificationItem) {
    markNotificationRead(slug, item.id)
    reloadLocal()
    setOpen(false)
    navigate(item.route)
  }

  function markAll() {
    markAllNotificationsRead(slug)
    reloadLocal()
  }

  return (
    <>
      <button
        type="button"
        aria-label={t('Notifications', 'التنبيهات')}
        onClick={() => setOpen(value => !value)}
        className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-[180] grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-2xl text-white shadow-2xl ring-1 ring-white/10 active:scale-95"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[170] bg-slate-950/25 p-3 backdrop-blur-[1px]" onClick={() => setOpen(false)}>
          <section
            onClick={event => event.stopPropagation()}
            className="absolute bottom-[max(84px,calc(env(safe-area-inset-bottom)+84px))] right-3 max-h-[70vh] w-[min(430px,calc(100vw-24px))] overflow-hidden rounded-3xl border bg-white shadow-2xl"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <header className="flex items-center justify-between gap-3 border-b p-4">
              <div>
                <div className="text-[10px] font-black tracking-[.14em] text-slate-400">SALES WAR ROOM</div>
                <h2 className="text-lg font-black">🔔 {t('Notifications', 'التنبيهات')}</h2>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && <button onClick={markAll} className="rounded-xl border px-3 py-2 text-[11px] font-black">{t('Mark all read', 'تحديد الكل كمقروء')}</button>}
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-black">×</button>
              </div>
            </header>

            <div className="max-h-[calc(70vh-74px)] overflow-y-auto p-3">
              {refreshing && items.length === 0 && <div className="p-6 text-center text-sm font-bold text-slate-400">{t('Refreshing…', 'جاري التحديث…')}</div>}
              {!refreshing && items.length === 0 && <div className="p-8 text-center"><div className="text-3xl">🔕</div><div className="mt-2 font-black">{t('No follow-up notifications yet', 'مفيش تنبيهات Follow-up لسه')}</div><div className="mt-1 text-xs text-slate-400">{t('Due follow-ups will stay here even after the phone notification disappears.', 'الـFollow-ups المستحقة هتفضل موجودة هنا حتى لو Notification الموبايل اختفت.')}</div></div>}

              <div className="space-y-2">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => openItem(item)}
                    className={`w-full rounded-2xl border p-4 text-start transition active:scale-[.99] ${item.readAt ? 'bg-slate-50' : 'border-amber-200 bg-amber-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black">{item.clientName}</div>
                        <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-600">{item.body}</div>
                      </div>
                      {!item.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-black text-slate-400">
                      <span>{item.date}</span>
                      <span>{t('OPEN LEAD →', 'افتح الـLead ←')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
