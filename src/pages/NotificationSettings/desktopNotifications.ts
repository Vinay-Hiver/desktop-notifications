// Shared helpers for the desktop notifications prototype (home banner + settings page).

export type Permission = 'default' | 'granted' | 'denied' | 'unsupported'
export type Simulation = 'real' | 'default' | 'granted' | 'denied'

export function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable: keep state in memory */ }
}

export function readPermission(): Permission {
  return typeof window !== 'undefined' && 'Notification' in window ? (Notification.permission as Permission) : 'unsupported'
}

/** The permission the prototype should act on: the real browser value, or a simulated one. */
export function currentPermission(): Permission {
  const sim = load<Simulation>('dn.simulation', 'real')
  return sim === 'real' ? readPermission() : load<Permission>('dn.simPermission', sim)
}

/** Detects the browser for help links. Unknown browsers get null, so copy falls back to "your browser". */
export function detectBrowser(): { name: string; slug: string } | null {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return { name: 'Edge', slug: 'edge' }
  if (/OPR\//.test(ua)) return { name: 'Opera', slug: 'opera' }
  if (/Firefox\//.test(ua)) return { name: 'Firefox', slug: 'firefox' }
  if (/Chrome\//.test(ua)) return { name: 'Chrome', slug: 'chrome' }
  if (/Safari\//.test(ua)) return { name: 'Safari', slug: 'safari' }
  return null
}

export function browserLabel() {
  const b = detectBrowser()
  const os = /Mac OS X/.test(navigator.userAgent) ? 'macOS' : /Windows/.test(navigator.userAgent) ? 'Windows' : ''
  const name = b?.name ?? 'this browser'
  return os ? `${name} on ${os}` : name
}

export const HELP_BASE = 'https://help.hiverhq.com/desktop-notifications'
export function helpLink() {
  const b = detectBrowser()
  return { href: b ? `${HELP_BASE}#${b.slug}` : HELP_BASE, label: b ? `How to allow in ${b.name}` : 'How to allow in your browser' }
}

/** Asks for permission (real or simulated). Simulated "not asked yet" resolves to granted after a short pause. */
export async function requestDesktopPermission(): Promise<Permission> {
  const sim = load<Simulation>('dn.simulation', 'real')
  if (sim === 'real') {
    if (!('Notification' in window)) return 'unsupported'
    return (await Notification.requestPermission()) as Permission
  }
  const current = load<Permission>('dn.simPermission', sim)
  if (current !== 'default') return current
  await new Promise((r) => setTimeout(r, 1500))
  save('dn.simPermission', 'granted')
  return 'granted'
}

/** Sends the PRD's test alert. Returns whether a real alert went out. */
export function sendTestNotification(): 'sent' | 'simulated' {
  const sim = load<Simulation>('dn.simulation', 'real')
  if (sim === 'real' && readPermission() === 'granted') {
    new Notification('Desktop notifications are on', {
      body: "You'll see calls and messages here even when Hiver is in the background.",
      icon: '/hiver-favicon.png',
      tag: `omni-test-${Date.now()}`, // a new tag each time, so a repeat test pops up instead of silently replacing the last one
    })
    return 'sent'
  }
  return 'simulated'
}
