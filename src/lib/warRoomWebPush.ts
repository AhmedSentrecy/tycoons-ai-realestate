const WEB_PUSH_API = 'https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room-web-push'
const SCOPE_KEY = 'warRoomWebPushScope'

export type WebPushScope = 'agent' | 'manager' | 'owner'
export type WebPushSession = { type: WebPushScope; token: string }

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)))
}

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`)
  return data
}

function sessionHeaders(session: WebPushSession): Record<string, string> {
  if (session.type === 'manager') return { 'x-manager-token': session.token }
  if (session.type === 'owner') return { 'x-admin-token': session.token }
  return { 'x-agent-token': session.token }
}

export function webPushSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window
}

export async function getWebPushState(scope?: WebPushScope): Promise<'unsupported' | 'denied' | 'enabled' | 'idle'> {
  if (!webPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.getRegistration('/war-room-sw.js')
    || await navigator.serviceWorker.getRegistration('/')
  const subscription = registration ? await registration.pushManager.getSubscription() : null
  if (!subscription) return 'idle'
  if (scope && localStorage.getItem(SCOPE_KEY) !== scope) return 'idle'
  return 'enabled'
}

export async function enableWebPush(session: WebPushSession) {
  if (!webPushSupported()) throw new Error('web_push_unsupported')
  if (!session?.token) throw new Error('push_session_required')

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'notifications_denied' : 'notifications_not_allowed')

  const registration = await navigator.serviceWorker.register('/war-room-sw.js', { scope: '/' })
  await navigator.serviceWorker.ready

  const keyResponse = await requestJson(`${WEB_PUSH_API}/public-key`)
  const publicKey = String(keyResponse?.publicKey || '')
  if (!publicKey) throw new Error('missing_web_push_key')

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  await requestJson(`${WEB_PUSH_API}/subscribe`, {
    method: 'POST',
    headers: sessionHeaders(session),
    body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }),
  })

  localStorage.setItem(SCOPE_KEY, session.type)
  return subscription
}

export async function disableWebPush(session: WebPushSession) {
  if (!webPushSupported() || !session?.token) return
  const registration = await navigator.serviceWorker.getRegistration('/war-room-sw.js')
    || await navigator.serviceWorker.getRegistration('/')
  const subscription = registration ? await registration.pushManager.getSubscription() : null
  if (!subscription) return
  const endpoint = subscription.endpoint
  try {
    await requestJson(`${WEB_PUSH_API}/subscribe`, {
      method: 'DELETE',
      headers: sessionHeaders(session),
      body: JSON.stringify({ endpoint }),
    })
  } finally {
    await subscription.unsubscribe()
    localStorage.removeItem(SCOPE_KEY)
  }
}
