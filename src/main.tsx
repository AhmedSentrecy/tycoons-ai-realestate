import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router'
import './index.css'
import App from './App.tsx'
import { registerWebMcpTools } from './lib/webmcp.ts'
import { VoiceSessionProvider } from './contexts/VoiceSessionContext.tsx'
import SalesWarRoomRecommendations from './components/SalesWarRoomRecommendations.tsx'
import SalesWarRoomExport from './components/SalesWarRoomExport.tsx'
import SalesWarRoomSalesOutcome from './components/SalesWarRoomSalesOutcome.tsx'
import SalesWarRoomManagerOutcome from './components/SalesWarRoomManagerOutcome.tsx'
import SalesWarRoomPasswordTools from './components/SalesWarRoomPasswordTools.tsx'
import SalesWarRoomNotifications from './components/SalesWarRoomNotifications.tsx'
import SalesWarRoomNotificationCenter from './components/SalesWarRoomNotificationCenter.tsx'
import SalesWarRoomNativeLinks from './components/SalesWarRoomNativeLinks.tsx'
import SalesWarRoomBackNavigation from './components/SalesWarRoomBackNavigation.tsx'

function WarRoomViewportGuard() {
  const { pathname } = useLocation()

  useEffect(() => {
    const active = pathname.startsWith('/sales-war-room')
    document.body.classList.toggle('sales-war-room-active', active)
    return () => document.body.classList.remove('sales-war-room-active')
  }, [pathname])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WarRoomViewportGuard />
      <VoiceSessionProvider>
        <App />
        <SalesWarRoomRecommendations />
        <SalesWarRoomExport />
        <SalesWarRoomSalesOutcome />
        <SalesWarRoomManagerOutcome />
        <SalesWarRoomPasswordTools />
        <SalesWarRoomNotifications />
        <SalesWarRoomNotificationCenter />
        <SalesWarRoomNativeLinks />
        <SalesWarRoomBackNavigation />
      </VoiceSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)

void registerWebMcpTools()