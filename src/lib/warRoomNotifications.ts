import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const CHANNEL_ID = 'sales-followups'
const IDS_KEY = (slug: string) => `warRoomNotificationIds:${slug}`
const SENT_KEY = (leadId: string, date: string) => `warRoomNotificationSent:${leadId}:${date}`
const INBOX_KEY = (slug: string) => `warRoomNotificationInbox:${slug}`

export type WarRoomNotificationItem = {
  id: string
  leadId: string
  slug: string
  clientName: string
  title: string
  body: string
  date: string
  route: string
  createdAt: string
  readAt: string | null
}

function nativeApp() {
  return Capacitor.isNativePlatform()
}

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function hashId(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return 1000 + (Math.abs(hash) % 2_000_000_000)
}

function readInbox(slug: string): WarRoomNotificationItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(INBOX_KEY(slug)) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeInbox(slug: string, items: WarRoomNotificationItem[]) {
  localStorage.setItem(INBOX_KEY(slug), JSON.stringify(items.slice(0, 100)))
  window.dispatchEvent(new CustomEvent('war-room-notifications-changed', { detail: { slug } }))
}

export function getNotificationInbox(slug: string) {
  return readInbox(slug)
}

export function markNotificationRead(slug: string, id: string) {
  const now = new Date().toISOString()
  writeInbox(slug, readInbox(slug).map(item => item.id === id ? { ...item, readAt: item.readAt || now } : item))
}

export function markAllNotificationsRead(slug: string) {
  const now = new Date().toISOString()
  writeInbox(slug, readInbox(slug).map(item => ({ ...item, readAt: item.readAt || now })))
}

export function syncNotificationInbox(slug: string, pipeline: any[]) {
  if (!slug || !Array.isArray(pipeline)) return [] as WarRoomNotificationItem[]

  const today = todayLocal()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffDate = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  const existing = readInbox(slug).filter(item => item.date >= cutoffDate)
  const byId = new Map(existing.map(item => [item.id, item]))

  for (const lead of pipeline) {
    if (!lead?.id || !lead?.next_action_date) continue
    if (['Won', 'Lost / Dead'].includes(String(lead.stage || ''))) continue

    const date = String(lead.next_action_date)
    if (date > today || date < cutoffDate) continue

    const leadId = String(lead.id)
    const id = `${leadId}:${date}`
    const stage = String(lead.stage || '').trim()
    const nextAction = String(lead.next_action || '').trim()
    const body = [stage, nextAction].filter(Boolean).join(' · ') || 'Follow-up due'
    const old = byId.get(id)

    byId.set(id, {
      id,
      leadId,
      slug,
      clientName: String(lead.client_name || 'Client'),
      title: `Follow up with ${lead.client_name || 'client'}`,
      body,
      date,
      route: `/sales-war-room/a/${slug}/lead/${encodeURIComponent(leadId)}`,
      createdAt: old?.createdAt || new Date().toISOString(),
      readAt: old?.readAt || null,
    })
  }

  const items = Array.from(byId.values()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  writeInbox(slug, items)
  return items
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

export async function syncFollowupNotifications(slug: string, pipeline: any[]) {
  syncNotificationInbox(slug, pipeline)
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
  const today = todayLocal()
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

    const leadId = String(lead.id)
    const inboxId = `${leadId}:${date}`
    const nextAction = String(lead.next_action || '').trim()
    const stage = String(lead.stage || '').trim()
    const body = [stage, nextAction].filter(Boolean).join(' · ') || 'Follow-up due'
    const route = `/sales-war-room/a/${slug}/lead/${encodeURIComponent(leadId)}`

    notifications.push({
      id,
      title: `Follow up with ${lead.client_name || 'client'}`,
      body,
      schedule: { at },
      channelId: CHANNEL_ID,
      extra: {
        tycoons: true,
        leadId,
        slug,
        date,
        inboxId,
        route,
      },
    })
  }

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications })
  }
  localStorage.setItem(IDS_KEY(slug), JSON.stringify(ids))
}
