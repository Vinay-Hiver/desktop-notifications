import { Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import OmniApp from './omni/App.jsx'
import { HomePage } from './pages/Home'
import { NotificationSettingsPage } from './pages/NotificationSettings'

/** Notification settings sit on their own route; everything else is the Omni app with the desktop notifications banner on top. */
function SettingsRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tab = params.get('tab') === 'desktop' ? 'desktop' : params.get('tab') === 'sounds' ? 'sounds' : undefined
  return <NotificationSettingsPage key={tab ?? 'any'} initialTab={tab} onNavigate={() => navigate('/')} />
}

function HomeRoute() {
  const navigate = useNavigate()
  return (
    <HomePage onOpenDesktopSettings={() => navigate('/notifications?tab=desktop')}>
      <OmniApp />
    </HomePage>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/notifications" element={<SettingsRoute />} />
      <Route path="*" element={<HomeRoute />} />
    </Routes>
  )
}
