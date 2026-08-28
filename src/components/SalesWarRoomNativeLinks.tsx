import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'

function extractPhone(href: string) {
  try {
    const url = new URL(href, window.location.origin)
    if (url.hostname === 'web.whatsapp.com' || url.hostname === 'api.whatsapp.com') {
      return (url.searchParams.get('phone') || '').replace(/\D/g, '')
    }
    if (url.hostname === 'wa.me') {
      return url.pathname.replace(/\D/g, '')
    }
  } catch {
    return ''
  }
  return ''
}

export default function SalesWarRoomNativeLinks() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return

      const phone = extractPhone(anchor.href)
      if (!phone) return

      event.preventDefault()
      event.stopPropagation()

      void AppLauncher.openUrl({ url: `whatsapp://send?phone=${phone}` }).catch(() => {
        window.location.href = `https://wa.me/${phone}`
      })
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
