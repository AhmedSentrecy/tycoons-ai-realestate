import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import Home from './pages/Home'

const RegionPage = lazy(() => import('./pages/RegionPage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))

export default function App() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f7f2ea] text-[#1b2420]">
          <p className="font-bold">جاري تحميل الصفحة…</p>
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:slug" element={<ProjectPage />} />
        <Route path="/regions/:slug" element={<RegionPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Suspense>
  )
}
