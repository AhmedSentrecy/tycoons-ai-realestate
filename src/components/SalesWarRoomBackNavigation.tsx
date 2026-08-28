import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

function agentSlugFromPath(pathname: string) {
  return pathname.match(/^\/sales-war-room\/a\/([^/]+)/)?.[1] || ''
}

export default function SalesWarRoomBackNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const path = location.pathname
    if (path === '/sales-war-room/admin' || path === '/sales-war-room/owner') {
      sessionStorage.setItem('warRoomControlReturnTo', '/sales-war-room/admin')
    } else if (path === '/sales-war-room/supervisor') {
      sessionStorage.setItem('warRoomControlReturnTo', '/sales-war-room/supervisor')
    } else if (path === '/sales-war-room/app' || path === '/sales-war-room/app/') {
      sessionStorage.removeItem('warRoomControlReturnTo')
    }
    setTick(v => v + 1)
  }, [location.pathname])

  const context = useMemo(() => {
    const slug = agentSlugFromPath(location.pathname)
    if (!slug) return null

    const requested = sessionStorage.getItem('warRoomControlReturnTo') || ''
    if (requested === '/sales-war-room/admin') {
      const ownerToken = localStorage.getItem('warRoomAdminToken') || ''
      if (ownerToken) return { route: requested, label: 'Super Admin' }
    }
    if (requested === '/sales-war-room/supervisor') {
      const supervisorToken = localStorage.getItem('warRoomAgentToken:mostafa-amr') || ''
      if (supervisorToken) return { route: requested, label: 'Team Control' }
    }
    return null
  }, [location.pathname, tick])

  if (!context) return null

  return (
    <button
      type="button"
      onClick={() => navigate(context.route)}
      className="fixed left-3 top-[max(12px,env(safe-area-inset-top))] z-[2147481800] rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-slate-950 shadow-lg backdrop-blur active:scale-95"
    >
      ← {context.label}
    </button>
  )
}
