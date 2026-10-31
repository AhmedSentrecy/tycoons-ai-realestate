import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router'
import './index.css'
// Read the server's canonical before any page changes <head> (see the file).
import './lib/ssrSnapshot.ts'
import App from './App.tsx'
import { registerWebMcpTools } from './lib/webmcp.ts'
import { VoiceSessionProvider } from './contexts/VoiceSessionContext.tsx'
import { Capacitor } from '@capacitor/core'

// Sales War Room helpers (internal team tool) load only on its pages and in the mobile app, so
// public visitors don't download them (audit SEO-15: unused JavaScript on every page, Nov 2026).
const SalesWarRoomRecommendations = lazy(() => import('./components/SalesWarRoomRecommendations.tsx'))
const SalesWarRoomExport = lazy(() => import('./components/SalesWarRoomExport.tsx'))
const SalesWarRoomSalesOutcome = lazy(() => import('./components/SalesWarRoomSalesOutcome.tsx'))
const SalesWarRoomManagerOutcome = lazy(() => import('./components/SalesWarRoomManagerOutcome.tsx'))
const SalesWarRoomPasswordTools = lazy(() => import('./components/SalesWarRoomPasswordTools.tsx'))
const SalesWarRoomNotifications = lazy(() => import('./components/SalesWarRoomNotifications.tsx'))
const SalesWarRoomNotificationCenter = lazy(() => import('./components/SalesWarRoomNotificationCenter.tsx'))
const SalesWarRoomNativeLinks = lazy(() => import('./components/SalesWarRoomNativeLinks.tsx'))
const SalesWarRoomBackNavigation = lazy(() => import('./components/SalesWarRoomBackNavigation.tsx'))

function SalesWarRoomExtras() {
  const { pathname } = useLocation()
  if (!pathname.startsWith('/sales-war-room') && !Capacitor.isNativePlatform()) return null
  return (
    <Suspense fallback={null}>
      <SalesWarRoomRecommendations />
      <SalesWarRoomExport />
      <SalesWarRoomSalesOutcome />
      <SalesWarRoomManagerOutcome />
      <SalesWarRoomPasswordTools />
      <SalesWarRoomNotifications />
      <SalesWarRoomNotificationCenter />
      <SalesWarRoomNativeLinks />
      <SalesWarRoomBackNavigation />
    </Suspense>
  )
}

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
        <SalesWarRoomExtras />
      </VoiceSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)

void registerWebMcpTools()