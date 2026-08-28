import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { salesWarRoomApi } from '../lib/salesWarRoomApi'
import { syncFollowupNotifications } from '../lib/warRoomNotifications'

function currentAgentSlug() {
  const match = window.location.pathname.match(/^\/sales-war-room\/a\/([^/]+)/)
  return match?.[1] || ''
}

export default function SalesWarRoomNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let handle: { remove: () => Promise<void> } | undefined
    let cancelled = false
    let syncing = false

    async function sync() {
      if (cancelled || syncing) return
      const slug = currentAgentSlug()
      if (!slug) return
      const token = localStorage.getItem(`warRoomAgentToken:${slug}`) || ''
      if (!token) return

      try {
        syncing = true
        const agentData = await salesWarRoomApi.getAgent(slug, token)
        await syncFollowupNotifications(slug, agentData.pipeline || [])
      } catch {
        // The dashboard itself owns auth/error handling. Notification sync stays silent.
      } finally {
        syncing = false
      }
    }

    void LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const route = event.notification.extra?.route
      if (typeof route === 'string' && route.startsWith('/sales-war-room/')) {
        window.location.href = route
      }
    }).then(listener => {
      if (cancelled) void listener.remove()
      else handle = listener
    })

    const timer = window.setInterval(() => void sync(), 20_000)
    const onFocus = () => void sync()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    window.setTimeout(() => void sync(), 1_500)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      if (handle) void handle.remove()
    }
  }, [])

  return null
}
