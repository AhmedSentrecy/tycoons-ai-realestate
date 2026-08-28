import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useLocation, useNavigate } from 'react-router'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'
import {
  getNotificationInbox,
  markNotificationRead,
  syncFollowupNotifications,
  syncNotificationInbox,
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
  const syncingRef = useRef(false)
  const slug = activeAgentSlug(location.pathname)
  const token = slug ? (localStorage.getItem(`warRoomAgentToken:${slug}`) || '') : ''

  useEffect(() => {
    const routeSlug = routeAgentSlug(location.pathname)
    const legacyLeadId = new URLSearchParams(location.search).get('lead')
    if (routeSlug && legacyLeadId && !location.pathname.includes('/lead/')) {
      navigate(`/sales-war-room/a/${routeSlug}/lead/${encodeURIComponent(legacyLeadId)}`, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (!slug || !token) return

    let cancelled = false
    let actionHandle: { remove: () => Promise<void> } | undefined

    async function sync() {
      if (cancelled || syncingRef.current) return
      try {
        syncingRef.current = true
        const agentData = await salesWarRoomApi.getAgent(slug, token)
        if (Capacitor.isNativePlatform()) await syncFollowupNotifications(slug, agentData.pipeline || [])
        else syncNotificationInbox(slug, agentData.pipeline || [])
      } catch {
        // Dashboard owns authentication/error handling.
      } finally {
        syncingRef.current = false
      }
    }

    void sync()

    if (Capacitor.isNativePlatform()) {
      void LocalNotifications.addListener('localNotificationActionPerformed', event => {
        const route = event.notification.extra?.route
        const leadId = String(event.notification.extra?.leadId || '')
        if (leadId) {
          const item = getNotificationInbox(slug).find(x => x.leadId === leadId && !x.readAt)
          if (item) markNotificationRead(slug, item.id)
        }
        if (typeof route === 'string' && route.startsWith('/sales-war-room/')) {
          window.location.href = route
        }
      }).then(listener => {
        if (cancelled) void listener.remove()
        else actionHandle = listener
      })
    }

    const onFocus = () => void sync()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    const timer = window.setInterval(() => void sync(), 60_000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      if (actionHandle) void actionHandle.remove()
    }
  }, [slug, token])

  return null
}
