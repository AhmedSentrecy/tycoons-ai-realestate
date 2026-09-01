self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Tycoons Sales War Room', body: event.data ? event.data.text() : 'Follow-up due' }
  }

  const title = data.title || 'Tycoons Sales War Room'
  const options = {
    body: data.body || 'Follow-up due',
    icon: '/favicon.ico',
    tag: data.tag || `war-room-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      route: data.route || '/sales-war-room/app',
      leadId: data.leadId || '',
      date: data.date || '',
      time: data.time || '',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const route = event.notification?.data?.route || '/sales-war-room/app'
  const targetUrl = new URL(route, self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      try {
        if ('navigate' in client) await client.navigate(targetUrl)
        if ('focus' in client) await client.focus()
        return
      } catch {
        // Try the next window or open a new one.
      }
    }
    await self.clients.openWindow(targetUrl)
  })())
})
