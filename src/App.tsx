import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router'
import { Capacitor } from '@capacitor/core'
import Home from './pages/Home'

const RegionPage = lazy(() => import('./pages/RegionPage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const UnitPage = lazy(() => import('./pages/UnitPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const SalesWarRoom = lazy(() => import('./pages/SalesWarRoom'))
const SalesWarRoomOwner = lazy(() => import('./pages/SalesWarRoomOwner'))
const SalesWarRoomAdmin = lazy(() => import('./pages/SalesWarRoomAdmin'))
const SalesWarRoomTeamMonitor = lazy(() => import('./pages/SalesWarRoomTeamMonitorClean'))
const SalesWarRoomAppEntry = lazy(() => import('./pages/SalesWarRoomAppEntry'))
const SalesWarRoomSupervisor = lazy(() => import('./pages/SalesWarRoomSupervisor'))

export default function App() {
  const nativeApp = Capacitor.isNativePlatform()

  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f7f2ea] text-[#1b2420]">
          <p className="font-bold">جاري تحميل الصفحة…</p>
        </main>
      }
    >
      <Routes>
        <Route path="/" element={nativeApp ? <Navigate to="/sales-war-room/app" replace /> : <Home />} />
        <Route path="/projects/:slug" element={<ProjectPage />} />
        <Route path="/units/:id" element={<UnitPage />} />
        <Route path="/regions/:slug" element={<RegionPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/sales-war-room/app" element={<SalesWarRoomAppEntry />} />
        <Route path="/sales-war-room/a/:slug" element={<SalesWarRoom />} />
        <Route path="/sales-war-room/monitor/:slug" element={<SalesWarRoomTeamMonitor />} />
        <Route path="/sales-war-room/admin" element={<SalesWarRoomOwner />} />
        <Route path="/sales-war-room/owner" element={<SalesWarRoomOwner />} />
        <Route path="/sales-war-room/team-admin" element={<SalesWarRoomAdmin />} />
        <Route path="/sales-war-room/supervisor" element={<SalesWarRoomSupervisor />} />
      </Routes>
    </Suspense>
  )
}
