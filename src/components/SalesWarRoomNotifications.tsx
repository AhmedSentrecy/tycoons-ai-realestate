import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export default function SalesWarRoomNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let handle: { remove: () => Promise<void> } | undefined
    let cancelled = false

    void LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const route = event.notification.extra?.route
      if (typeof route === 'string' && route.startsWith('/sales-war-room/')) {
        window.location.href = route
      }
    }).then(listener => {
      if (cancelled) void listener.remove()
      else handle = listener
    })

    return () => {
      cancelled = true
      if (handle) void handle.remove()
    }
  }, [])

  return null
}
