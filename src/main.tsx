import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { registerWebMcpTools } from './lib/webmcp.ts'
import { VoiceSessionProvider } from './contexts/VoiceSessionContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <VoiceSessionProvider>
        <App />
      </VoiceSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)

void registerWebMcpTools()
