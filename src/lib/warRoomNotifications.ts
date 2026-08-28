import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const CHANNEL_ID = 'sales-followups'
const IDS_KEY = (slug: string) => `warRoomNotificationIds:${slug}`
const SENT_KEY = (leadId: string, date: string) => `warRoomNotificationSent:${leadId}:${date}`

function nativeApp() {
  return Capacitor.isNativePlatform()
}

function hashId(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return 1000 + (Math.abs(hash) % 2_000_000_000)
}

async function prepareChannel() {
  if (!nativeApp() || Capacitor.getPlatform() !== 'android') return
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Sales Follow-ups',
      description: 'Tycoons Sales War Room client follow-up reminders',
      importance: 4,
    })
  } catch {
    // Channel may already exist.
  }
}

export async function ensureNotificationPermission() {
  if (!nativeApp()) return false
  let permission = await LocalNotifications.checkPermissions()
  if (permission.display !== 'granted') {
    permission = await LocalNotifications.requestPermissions()
  }
  if (permission.display !== 'granted') return false
  await prepareChannel()
  return true
}

export async function sendTestNotification() {
  if (!(await ensureNotificationPermission())) {
    return { ok: false as const, reason: 'permission_denied' }
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 987654321,
        title: 'Tycoons Sales War Room',
        body: 'Notifications are working ✅',
        schedule: { at: new Date(Date.now() + 4_000) },
        channelId: CHANNEL_ID,
        extra: {
          tycoons: true,
          route: '/sales-war-room/app',
        },
      },
    ],
  })

  return { ok: true as const }
}

export async function syncFollowupNotifications(slug: string, pipeline: any[]) {
  if (!nativeApp() || !slug || !Array.isArray(pipeline)) return
  if (!(await ensureNotificationPermission())) return

  const previousIds = (() => {
    try {
      return JSON.parse(localStorage.getItem(IDS_KEY(slug)) || '[]') as number[]
    } catch {
      return [] as number[]
    }
  })()

  if (previousIds.length) {
    try {
      await LocalNotifications.cancel({ notifications: previousIds.map(id => ({ id })) })
    } catch {
      // Ignore stale IDs.
    }
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const active = pipeline
    .filter((lead: any) => lead?.id && lead?.next_action_date)
    .filter((lead: any) => !['Won', 'Lost / Dead'].includes(String(lead.stage || '')))
    .sort((a: any, b: any) => String(a.next_action_date).localeCompare(String(b.next_action_date)))
    .slice(0, 50)

  const notifications: any[] = []
  const ids: number[] = []

  for (const lead of active) {
    const date = String(lead.next_action_date)
    let at = new Date(`${date}T09:00:00`)

    if (date < today) continue

    if (date === today && at.getTime() <= now.getTime()) {
      if (localStorage.getItem(SENT_KEY(String(lead.id), date))) continue
      at = new Date(Date.now() + 6_000)
      localStorage.setItem(SENT_KEY(String(lead.id), date), '1')
    }

    const id = hashId(`${slug}:${lead.id}:${date}`)
    ids.push(id)

    const nextAction = String(lead.next_action || '').trim()
    const stage = String(lead.stage || '').trim()
    const body = [stage, nextAction].filter(Boolean).join(' · ') || 'Follow-up due'

    notifications.push({
      id,
      title: `Follow up with ${lead.client_name || 'client'}`,
      body,
      schedule: { at },
      channelId: CHANNEL_ID,
      extra: {
        tycoons: true,
        leadId: lead.id,
        slug,
        route: `/sales-war-room/a/${slug}?lead=${encodeURIComponent(String(lead.id))}`,
      },
    })
  }

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications })
  }
  localStorage.setItem(IDS_KEY(slug), JSON.stringify(ids))
}
