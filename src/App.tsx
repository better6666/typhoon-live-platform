import { HashRouter, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import HistoryPage from '@/pages/HistoryPage'
import Home from '@/pages/Home'
import StormDetailPage from '@/pages/StormDetailPage'

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/storm/:stormId" element={<StormDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  )
}
