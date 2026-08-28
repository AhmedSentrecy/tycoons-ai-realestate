import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  getNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
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

export default function SalesWarRoomNotificationCenter() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<WarRoomNotificationItem[]>([])
  const slug = activeAgentSlug(location.pathname)
  const token = slug ? (localStorage.getItem(`warRoomAgentToken:${slug}`) || '') : ''
  const lang = (localStorage.getItem('warRoomLang') as 'en' | 'ar') || 'en'
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en)

  useEffect(() => {
    if (!slug || !token) {
      setItems([])
      setOpen(false)
      return
    }

    const refresh = () => setItems(getNotificationInbox(slug))
    refresh()

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string }>).detail
      if (!detail?.slug || detail.slug === slug) refresh()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === `warRoomNotificationInbox:${slug}`) refresh()
    }

    window.addEventListener('war-room-notifications-changed', onChanged)
    window.addEventListener('storage', onStorage)
    const timer = window.setInterval(refresh, 15_000)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('war-room-notifications-changed', onChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [slug, token])

  const unread = useMemo(() => items.filter(item => !item.readAt).length, [items])

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={t('Notifications', 'التنبيهات')}
        className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] end-4 z-[2147482000] grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-2xl text-white shadow-2xl ring-1 ring-white/20 active:scale-95"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 min-w-6 rounded-full bg-red-600 px-1.5 py-1 text-center text-[10px] font-black leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[2147481900] bg-slate-950/25" onClick={() => setOpen(false)}>
          <section
            onClick={event => event.stopPropagation()}
            className="absolute bottom-[max(84px,calc(env(safe-area-inset-bottom)+76px))] end-3 w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <header className="flex items-center justify-between gap-3 border-b p-4">
              <div>
                <div className="text-[10px] font-black tracking-[.16em] text-slate-400">SALES WAR ROOM</div>
                <h2 className="text-lg font-black">{t('Notifications', 'التنبيهات')}</h2>
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

            <div className="max-h-[min(62vh,560px)] overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-3xl">🔔</div>
                  <div className="mt-2 font-black text-slate-700">{t('No follow-up notifications yet', 'مفيش تنبيهات متابعة لسه')}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{t('Due follow-ups will stay here even if the phone notification disappears.', 'المتابعات المستحقة هتفضل هنا حتى لو تنبيه الموبايل اختفى.')}</div>
                </div>
              ) : (
                items.map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => openItem(item)}
                    className={`mb-2 w-full rounded-2xl border p-3 text-start active:scale-[.99] ${item.readAt ? 'bg-white' : 'border-amber-200 bg-amber-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">{item.clientName}</div>
                        <div className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.body}</div>
                      </div>
                      {!item.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-black text-slate-400">
                      <span>{item.date}</span>
                      <span>{t('Open lead →', 'افتح الـLead ←')}</span>
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
