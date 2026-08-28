import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
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
