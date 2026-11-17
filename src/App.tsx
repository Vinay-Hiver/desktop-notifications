import { useState } from 'react'
import { HomePage } from './pages/Home'
import { NotificationSettingsPage } from './pages/NotificationSettings'

/** The prototype starts on the home page; the banner and account menu lead to My Settings > Notifications Settings. */
export default function App() {
  const [page, setPage] = useState<{ name: 'home' } | { name: 'settings'; tab?: 'sounds' | 'desktop' }>({ name: 'home' })

  if (page.name === 'settings') {
    return <NotificationSettingsPage key={page.tab ?? 'any'} initialTab={page.tab} onNavigate={() => setPage({ name: 'home' })} />
  }
  return <HomePage onOpenDesktopSettings={() => setPage({ name: 'settings', tab: 'desktop' })} onOpenSettings={() => setPage({ name: 'settings' })} />
}
