import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '../../components/Button'
import { currentPermission, detectBrowser, helpLink, load, requestDesktopPermission, save, sendTestNotification } from '../NotificationSettings/desktopNotifications'
import bellRinging from '../../assets/banner/bell-ringing.svg'
import bellCheck from '../../assets/banner/bell-check.svg'
import bellCancel from '../../assets/banner/bell-cancel.svg'
import external from '../../assets/banner/external.svg'
import closeIcon from '../../assets/banner/close.svg'
import './HomePage.css'

/**
 * Omni home (Conversations) with the one-time desktop notifications banner across the top.
 * Banner states: prompt → asking → on / blocked / closed-prompt. Closing the prompt counts as "Not now" (PRD).
 */
type BannerState = 'prompt' | 'asking' | 'on' | 'blocked' | 'closed-prompt' | 'hidden'

export type HomePageProps = {
  /** Opens My Settings > Notifications Settings on the Desktop notifications tab. */
  onOpenDesktopSettings: () => void
  /** The Omni app shown under the banner. */
  children: ReactNode
}

export function HomePage({ onOpenDesktopSettings, children }: HomePageProps) {
  // Prototype: the banner always shows when the app loads.
  const [banner, setBanner] = useState<BannerState>('prompt')

  async function turnOn() {
    save('dn.promptDismissed', true)
    const before = currentPermission()
    if (before === 'denied' || before === 'unsupported') { setBanner('blocked'); return }
    if (before !== 'granted') setBanner('asking')
    const result = before === 'granted' ? 'granted' : await requestDesktopPermission()
    if (result === 'granted') {
      save('dn.enabled', true)
      sendTestNotification()
      setBanner('on')
    } else if (result === 'default') setBanner('closed-prompt')
    else setBanner('blocked')
  }

  // Prototype only: forget the agent's earlier choice so the first-visit banner shows again.
  function resetPrototype() {
    const sim = load<string>('dn.simulation', 'real')
    try { Object.keys(localStorage).filter((k) => k.startsWith('dn.')).forEach((k) => localStorage.removeItem(k)) } catch { /* ignore */ }
    save('dn.simulation', sim)
    if (sim !== 'real') save('dn.simPermission', sim)
    setBanner('prompt')
  }

  function close() {
    if (banner === 'prompt' || banner === 'closed-prompt') save('dn.promptDismissed', true)
    setBanner('hidden')
  }

  const help = helpLink()
  const browserName = detectBrowser()?.name
  // Figma has three looks: prompt (blue), on (green), blocked (red). While the browser asks, the prompt banner stays.
  const look = banner === 'on' ? 'success' : banner === 'blocked' ? 'error' : 'info'

  return (
    <div className="home-shell">
      {banner !== 'hidden' && (
        <div className={`home-banner home-banner--${look}`} role={banner === 'blocked' ? 'alert' : 'status'}>
          <div className="home-banner__content">
            <span className="home-banner__msg">
              <img src={look === 'success' ? bellCheck : look === 'error' ? bellCancel : bellRinging} width={14} height={14} alt="" />
              {look === 'info' && 'Get alerts for calls and messages, so you never miss an update'}
              {look === 'success' && "Desktop notifications are on. You'll now receive alerts for calls and messages."}
              {look === 'error' && 'Your browser is blocking notifications from Omni.'}
            </span>
            {look === 'info' && (
              <button type="button" className="home-banner__btn" onClick={turnOn} disabled={banner === 'asking'}>Turn on desktop notifications</button>
            )}
            {look === 'success' && (
              <button type="button" className="home-banner__link" onClick={onOpenDesktopSettings}>See more settings</button>
            )}
            {look === 'error' && (
              <a className="home-banner__link" href={help.href} target="_blank" rel="noreferrer">
                {browserName ? `How to allow ${browserName} notifications` : 'How to allow notifications'}
                <img src={external} width={16} height={16} alt="" />
              </a>
            )}
          </div>
          <button type="button" className="home-banner__close" aria-label="Close banner" onClick={close}>
            <img src={closeIcon} width={16} height={16} alt="" />
          </button>
        </div>
      )}

      <div className="home-shell__main">{children}</div>

      {/* Prototype-only control, not part of the design */}
      <aside className="home-proto" aria-label="Prototype controls">
        <span className="home-proto__title">Prototype</span>
        <Button variant="ghost" size="xs" onClick={resetPrototype}>Show banner again</Button>
      </aside>
    </div>
  )
}
