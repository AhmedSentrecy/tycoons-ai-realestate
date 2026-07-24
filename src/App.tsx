import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import RegionPage from './pages/RegionPage'
import FaqPage from './pages/FaqPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/regions/:slug" element={<RegionPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  )
}
