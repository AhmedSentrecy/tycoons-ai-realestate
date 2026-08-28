import { useEffect, useRef, useState } from 'react'
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
  const [token,setToken] = useState(() => slug ? (localStorage.getItem(`warRoomAgentToken:${slug}`) || '') : '')

  useEffect(() => {
    const readToken = () => slug ? (localStorage.getItem(`warRoomAgentToken:${slug}`) || '') : ''
    const refresh = () => setToken(prev => {
      const next = readToken()
      return prev === next ? prev : next
    })
    refresh()
    const timer = window.setInterval(refresh, 800)
    window.addEventListener('storage', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', refresh)
    }
  }, [slug])

  useEffect(() => {
    const routeSlug = routeAgentSlug(location.pathname)
    const legacyLeadId = new URLSearchParams(location.search).get('lead')
    if (routeSlug && legacyLeadId && !location.pathname.includes('/lead/')) {
      navigate(`/sales-war-room/a/${routeSlug}/lead/${encodeURIComponent(legacyLeadId)}`, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    let actionHandle: { remove: () => Promise<void> } | undefined

    void LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const extra = event.notification.extra || {}
      const route = extra.route
      const targetSlug = String(extra.slug || '')
      const inboxId = String(extra.inboxId || '')
      const leadId = String(extra.leadId || '')

      if (targetSlug) {
        if (inboxId) markNotificationRead(targetSlug, inboxId)
        else if (leadId) {
          const item = getNotificationInbox(targetSlug).find(x => x.leadId === leadId && !x.readAt)
          if (item) markNotificationRead(targetSlug, item.id)
        }
        localStorage.setItem('warRoomLastAgent', targetSlug)
      }

      if (typeof route === 'string' && route.startsWith('/sales-war-room/')) {
        navigate(route)
      }
    }).then(listener => {
      if (cancelled) void listener.remove()
      else actionHandle = listener
    })

    return () => {
      cancelled = true
      if (actionHandle) void actionHandle.remove()
    }
  }, [navigate])

  useEffect(() => {
    if (!slug || !token) return

    let cancelled = false

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
    }
  }, [slug, token])

  return null
}
