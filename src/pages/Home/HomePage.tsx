import { useEffect, useState } from 'react'
import { Icon } from '../../icons/Icon'
import { Button } from '../../components/Button'
import { ChatConversation } from '../../patterns/ChatConversation'
import { sampleChatThreads } from '../../patterns/ChatConversation/sampleData'
import { ConversationList } from '../../patterns/ConversationList'
import { sampleConversations } from '../../patterns/ConversationList/sampleData'
import { ConversationsSidebar } from '../../patterns/ConversationsSidebar'
import { sampleSections } from '../../patterns/ConversationsSidebar/sampleData'
import { MainNav } from '../../patterns/MainNav'
import { navSampleFooterItems, navSampleItems, navSampleUserMenu } from '../../patterns/MainNav/sampleData'
import { PageLayout } from '../../patterns/PageLayout'
import { currentPermission, helpLink, load, requestDesktopPermission, save, sendTestNotification } from '../NotificationSettings/desktopNotifications'
import './HomePage.css'

/**
 * Omni home (Conversations) with the one-time desktop notifications banner across the top.
 * Banner states: prompt → asking → on / blocked / closed-prompt. Closing the prompt counts as "Not now" (PRD).
 */
type BannerState = 'prompt' | 'asking' | 'on' | 'blocked' | 'closed-prompt' | 'hidden'

export type HomePageProps = {
  /** Opens My Settings > Notifications Settings on the Desktop notifications tab. */
  onOpenDesktopSettings: () => void
  /** Opens My Settings from the account menu. */
  onOpenSettings: () => void
}

export function HomePage({ onOpenDesktopSettings, onOpenSettings }: HomePageProps) {
  const [banner, setBanner] = useState<BannerState>(() => {
    const enabled = load('dn.enabled', false)
    const dismissed = load('dn.promptDismissed', false)
    return enabled || dismissed ? 'hidden' : 'prompt'
  })
  const [slowPrompt, setSlowPrompt] = useState(false)
  const [selected, setSelected] = useState('chat-1')

  // If the browser hasn't answered after a few seconds, the prompt may be the quiet bell in the address bar.
  useEffect(() => {
    if (banner !== 'asking') { setSlowPrompt(false); return }
    const t = setTimeout(() => setSlowPrompt(true), 5000)
    return () => clearTimeout(t)
  }, [banner])

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
  const thread = sampleChatThreads[selected] ?? sampleChatThreads['chat-1']
  const person = sampleConversations.chat.find((c) => c.id === selected)?.name ?? 'Michael Scott'

  return (
    <div className="home-shell">
      {banner !== 'hidden' && (
        <div className={`home-banner home-banner--${banner === 'on' ? 'success' : banner === 'blocked' ? 'warning' : 'info'}`} role={banner === 'blocked' ? 'alert' : 'status'}>
          <Icon name={banner === 'on' ? 'tick2' : banner === 'blocked' ? 'alerttriangle' : 'notification'} size={16} />
          <span className="home-banner__text">
            {banner === 'prompt' && <><strong>Don't miss calls and messages.</strong> Turn on desktop notifications to get alerts even when Omni isn't the window in front.</>}
            {banner === 'asking' && (slowPrompt
              ? <>Don't see the browser prompt? Look for the <strong>bell icon</strong> in your address bar and choose <strong>Allow</strong>.</>
              : <>Your browser is asking for permission. Choose <strong>Allow</strong> to turn on desktop notifications.</>)}
            {banner === 'on' && <><strong>Desktop notifications are on.</strong> You'll get alerts for calls and messages when Omni isn't in front.</>}
            {banner === 'blocked' && <><strong>Your browser is blocking notifications from Omni.</strong></>}
            {banner === 'closed-prompt' && <>You closed the browser prompt, so desktop notifications are still off.</>}
          </span>
          {banner === 'prompt' && <Button variant="primary" size="xs" onClick={turnOn}>Turn on notifications</Button>}
          {banner === 'closed-prompt' && <Button variant="primary" size="xs" onClick={turnOn}>Try again</Button>}
          {banner === 'on' && <button type="button" className="home-banner__link" onClick={onOpenDesktopSettings}>See more settings</button>}
          {banner === 'blocked' && <a className="home-banner__link" href={help.href} target="_blank" rel="noreferrer">{help.label}</a>}
          <Button variant="ghost" size="xs" iconOnly aria-label="Close banner" onClick={close}><Icon name="close" size={16} /></Button>
        </div>
      )}

      <div className="home-shell__main">
        <PageLayout
          variant="home"
          nav={<MainNav items={navSampleItems} footerItems={navSampleFooterItems} value="conversations" user={{ initial: 'P', name: 'Praveen' }} userMenu={navSampleUserMenu} onMenuSelect={(menu, id) => { if (menu === 'user' && id === 'my-settings') onOpenSettings() }} />}
          sidebar={<ConversationsSidebar sections={sampleSections(true, ['chat'])} value="chat-unassigned" />}
        >
          <div className="home-content">
            <div className="home-content__list">
              <ConversationList title="Unassigned" channel="chat" conversations={sampleConversations.chat} selectedId={selected} onSelect={setSelected} />
            </div>
            <div className="home-content__thread">
              <ChatConversation channel="chat" name={person} items={thread} />
            </div>
          </div>
        </PageLayout>
      </div>

      {/* Prototype-only control, not part of the design */}
      <aside className="home-proto" aria-label="Prototype controls">
        <span className="home-proto__title">Prototype</span>
        <Button variant="ghost" size="xs" onClick={resetPrototype}>Show banner again</Button>
      </aside>
    </div>
  )
}
