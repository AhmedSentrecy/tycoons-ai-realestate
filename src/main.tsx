import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { registerWebMcpTools } from './lib/webmcp.ts'
import { VoiceSessionProvider } from './contexts/VoiceSessionContext.tsx'
import SalesWarRoomRecommendations from './components/SalesWarRoomRecommendations.tsx'
import SalesWarRoomExport from './components/SalesWarRoomExport.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <VoiceSessionProvider>
        <App />
        <SalesWarRoomRecommendations />
        <SalesWarRoomExport />
      </VoiceSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)

void registerWebMcpTools()
