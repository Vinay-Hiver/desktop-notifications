import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../icons/Icon'
import type { IconName } from '../../icons/iconData'
import { Button } from '../../components/Button'
import { Switch } from '../../components/Switch'
import { Tabs } from '../../components/Tabs'
import { AdminSidebar } from '../../patterns/AdminSidebar'
import { MainNav } from '../../patterns/MainNav'
import { navSampleFooterItems, navSampleItems, navSampleUserMenu } from '../../patterns/MainNav/sampleData'
import { PageLayout } from '../../patterns/PageLayout'
import { PageBar } from '../SharedInboxes/SharedInboxesPage'
import './NotificationSettingsPage.css'
import { browserLabel, helpLink, load, readPermission, save } from './desktopNotifications'
import type { Permission, Simulation } from './desktopNotifications'

/**
 * My Settings > Notifications Settings, with desktop notifications added on top of today's sound settings.
 * Follows the PRD "Live channel - Desktop notifications": off by default, browser permission on turn-on, a test alert,
 * a blocked state with help, per-channel switches (no email), and an option to hide message text.
 */


const mySettingsSections = [{ items: [
  { id: 'profile', label: 'Profile', icon: 'user' as IconName },
  { id: 'shifts', label: 'Shifts', icon: 'calander' as IconName },
  { id: 'basic', label: 'Basic Settings', icon: 'settings' as IconName },
  { id: 'sender', label: 'Sender Settings', icon: 'personal' as IconName },
  { id: 'notifications', label: 'Notifications Settings', icon: 'notification' as IconName },
] }]

const desktopChannels: { id: string; label: string; icon: IconName; description: string }[] = [
  { id: 'voice', label: 'Voice', icon: 'voice', description: 'Incoming calls, for as long as they ring' },
  { id: 'chat', label: 'Chat', icon: 'chatinbox', description: 'New and waiting chats, and customer replies' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', description: 'New and waiting conversations, and customer replies' },
  { id: 'sms', label: 'SMS', icon: 'sms', description: 'New and waiting conversations, and customer replies' },
  { id: 'slack', label: 'Slack', icon: 'slack', description: 'New and waiting conversations, and customer replies' },
]

// Today's sound settings, unchanged (from the current Omni page).
const soundGroups: { title: string; icon: IconName; rows: [string, boolean][] }[] = [
  { title: 'For Email Inbox', icon: 'emailinbox', rows: [['New conversation received', true], ['Email assigned to me', false], ['Notes mentioning me', true], ['SLA breaches', true]] },
  { title: 'For Chat Inbox', icon: 'chatinbox', rows: [['New chat received', false], ['Chat assigned to me', true], ['New message in a chat already assigned to me', true]] },
  { title: 'For WhatsApp Inbox', icon: 'whatsapp', rows: [['New conversation created', false], ['Conversation assigned to me', false], ['New message in a conversation already assigned to me', false], ['SLA breaches', false]] },
  { title: 'For SMS Inbox', icon: 'sms', rows: [['New conversation created', false], ['Conversation assigned to me', false], ['New message in a conversation already assigned to me', false], ['SLA breaches', false]] },
  { title: 'For Voice Inbox', icon: 'voice', rows: [['Notes mentioning me', true]] },
]

function Row({ icon, title, description, control, strong }: { icon?: IconName; title: ReactNode; description?: ReactNode; control: ReactNode; strong?: boolean }) {
  return (
    <div className="dn-row">
      {icon && <span className="dn-row__icon"><Icon name={icon} size={16} /></span>}
      <div className="dn-row__text">
        <div className={strong ? 'dn-row__title dn-row__title--strong' : 'dn-row__title'}>{title}</div>
        {description && <div className="dn-row__desc">{description}</div>}
      </div>
      <div className="dn-row__control">{control}</div>
    </div>
  )
}

export type NotificationSettingsPageProps = {
  /** Which tab opens first. Defaults to the last one used. */
  initialTab?: 'sounds' | 'desktop'
  /** Called when the agent leaves for another part of Omni, e.g. Conversations. */
  onNavigate?: (target: 'home') => void
}

export function NotificationSettingsPage({ initialTab, onNavigate }: NotificationSettingsPageProps = {}) {
  const [realPermission, setRealPermission] = useState<Permission>(readPermission)
  const [simulation, setSimulation] = useState<Simulation>(() => load('dn.simulation', 'real'))
  const [simPermission, setSimPermission] = useState<Permission>(() => { const s = load<Simulation>('dn.simulation', 'real'); return load<Permission>('dn.simPermission', s === 'real' ? 'default' : s) })
  const [enabled, setEnabled] = useState<boolean>(() => load('dn.enabled', false))
  const [channels, setChannels] = useState<Record<string, boolean>>(() => load('dn.channels', Object.fromEntries(desktopChannels.map((c) => [c.id, true]))))
  const [hideText, setHideText] = useState<boolean>(() => load('dn.hideText', false))
  const [promptDismissed, setPromptDismissed] = useState<boolean>(() => load('dn.promptDismissed', false))
  const [bannerClosed, setBannerClosed] = useState(false)
  const [asking, setAsking] = useState(false)
  const [blockedOnTry, setBlockedOnTry] = useState(false)
  const [testSent, setTestSent] = useState<'none' | 'sent' | 'simulated'>('none')
  const [sounds, setSounds] = useState(() => soundGroups.map((g) => g.rows.map((r) => r[1])))
  const [masterSound, setMasterSound] = useState(true)
  const [tab, setTab] = useState<string>(() => initialTab ?? load('dn.tab', 'sounds'))
  const [closedPrompt, setClosedPrompt] = useState(false)
  useEffect(() => save('dn.tab', tab), [tab])

  const permission: Permission = simulation === 'real' ? realPermission : simPermission

  useEffect(() => save('dn.enabled', enabled), [enabled])
  useEffect(() => save('dn.channels', channels), [channels])
  useEffect(() => save('dn.hideText', hideText), [hideText])
  useEffect(() => save('dn.promptDismissed', promptDismissed), [promptDismissed])
  useEffect(() => save('dn.simulation', simulation), [simulation])
  useEffect(() => save('dn.simPermission', simPermission), [simPermission])

  // Permission can change in browser settings while Omni is open: re-check whenever the tab comes back.
  useEffect(() => {
    const recheck = () => setRealPermission(readPermission())
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => { window.removeEventListener('focus', recheck); document.removeEventListener('visibilitychange', recheck) }
  }, [])

  const isBlocked = permission === 'denied' || permission === 'unsupported'
  const isOn = enabled && permission === 'granted'
  const withdrawn = enabled && isBlocked // was on, then the browser took permission away
  const showBlockedNote = blockedOnTry || withdrawn

  const sendTest = useCallback(() => {
    if (readPermission() === 'granted' && simulation === 'real') {
      new Notification('Desktop notifications are on', {
        body: "You'll see calls and messages here when Omni isn't in front.",
        icon: '/hiver-favicon.png',
        tag: 'omni-test',
      })
      setTestSent('sent')
    } else {
      setTestSent('simulated')
    }
  }, [simulation])

  async function turnOn() {
    setBlockedOnTry(false); setClosedPrompt(false)
    if (permission === 'granted') { setEnabled(true); sendTest(); return }
    if (isBlocked) { setBlockedOnTry(true); return }
    setAsking(true)
    if (simulation !== 'real') {
      setTimeout(() => { setAsking(false); setSimPermission('granted'); setEnabled(true); setTestSent('simulated') }, 1500)
      return
    }
    const result = (await Notification.requestPermission()) as Permission
    setAsking(false)
    setRealPermission(result)
    if (result === 'granted') { setEnabled(true); setTimeout(sendTest, 0) } else if (result === 'default') setClosedPrompt(true); else setBlockedOnTry(true)
  }

  function onMasterChange(next: boolean) {
    if (next) { setPromptDismissed(true); void turnOn() } else { setEnabled(false); setTestSent('none') }
  }

  function recheckPermission() {
    const p = readPermission()
    setRealPermission(p)
    if (p === 'granted' && simulation === 'real') { setBlockedOnTry(false); setEnabled(true); sendTest() }
  }

  function resetPrototype() {
    setEnabled(false); setPromptDismissed(false); setBannerClosed(false); setBlockedOnTry(false); setTestSent('none'); setHideText(false)
    setChannels(Object.fromEntries(desktopChannels.map((c) => [c.id, true])))
    if (simulation !== 'real') setSimPermission(simulation)
  }

  const nav = <MainNav onChange={(id) => { if (id === 'conversations') onNavigate?.('home') }} items={navSampleItems} footerItems={navSampleFooterItems} user={{ initial: 'P', name: 'Praveen' }} userMenu={navSampleUserMenu} />
  const sidebar = <AdminSidebar title="My Settings" sections={mySettingsSections} value="notifications" />

  return (
    <PageLayout variant="admin" nav={nav} sidebar={sidebar}>
      <div className="dn-page">
        {/* Once-per-session banner when permission was withdrawn after the agent turned alerts on. */}
        {withdrawn && !bannerClosed && (
          <div className="dn-banner dn-banner--warning" role="alert">
            <Icon name="alerttriangle" size={16} />
            <span className="dn-banner__text">Desktop notifications are blocked by your browser. <a href={helpLink().href} target="_blank" rel="noreferrer">{helpLink().label}</a></span>
            <Button variant="ghost" size="xs" iconOnly aria-label="Close" onClick={() => setBannerClosed(true)}><Icon name="close" size={16} /></Button>
          </div>
        )}

        <PageBar title="Notifications Settings" />
        <div className="dn-tabs">
          <Tabs
            tabs={[{ value: 'sounds', label: 'Sound notifications' }, { value: 'desktop', label: 'Desktop notifications' }]}
            value={tab}
            onChange={setTab}
          />
        </div>

        <div className="dn-body">
          {/* Desktop notifications tab */}
          {tab === 'desktop' && (
          <section className="dn-card" aria-labelledby="dn-desktop-title">
            <Row
              strong
              icon="notification"
              title={<span id="dn-desktop-title">Desktop notifications</span>}
              description="Get an alert on your computer for calls and messages, even when Omni isn't the window in front. Email isn't included."
              control={<Switch size="large" checked={isOn || asking} disabled={asking} onChange={(e) => onMasterChange(e.target.checked)} aria-label="Desktop notifications" />}
            />

            {asking && (
              <div className="dn-note dn-note--neutral">
                <Icon name="info" size={16} />
                <span>Your browser is asking for permission. Choose <strong>Allow</strong> to turn on desktop notifications.</span>
              </div>
            )}

            {closedPrompt && !asking && !isOn && (
              <div className="dn-note dn-note--neutral">
                <Icon name="info" size={16} />
                <span>You closed the browser prompt. Turn on desktop notifications again and choose <strong>Allow</strong>.</span>
              </div>
            )}

            {showBlockedNote && !asking && (
              <div className="dn-note dn-note--warning">
                <Icon name="alerttriangle" size={16} />
                <div className="dn-note__body">
                  <span><strong>Your browser is blocking notifications from Omni.</strong> Allow notifications for Omni in your browser settings, then come back here.</span>
                  <div className="dn-note__actions">
                    <a href={helpLink().href} target="_blank" rel="noreferrer">{helpLink().label}</a>
                    {simulation === 'real' && <Button variant="secondary" size="xs" onClick={recheckPermission}>Check again</Button>}
                  </div>
                </div>
              </div>
            )}

            {isOn && (
              <>
                <div className="dn-status">
                  <span className="dn-status__dot" aria-hidden="true" />
                  <span className="dn-status__text">On in {browserLabel()}</span>
                  <Button variant="secondary" size="xs" iconLeft={<Icon name="notification" size={16} />} onClick={sendTest}>Send test notification</Button>
                </div>
                {testSent !== 'none' && (
                  <div className="dn-hint">
                    {testSent === 'sent'
                      ? 'Test alert sent. Not seeing it? Check your computer’s Focus or Do Not Disturb settings.'
                      : 'Test alert simulated (the browser hasn’t allowed real alerts here).'}
                  </div>
                )}

                <div className="dn-group">
                  <div className="dn-group__head">
                    <h3 className="dn-group__title">Channels</h3>
                    <p className="dn-group__desc">Turn off any channel you don't want desktop alerts for. Calls still ring in Omni and messages still reach the bell.</p>
                  </div>
                  {desktopChannels.map((c) => (
                    <Row
                      key={c.id}
                      icon={c.icon}
                      title={c.label}
                      description={c.description}
                      control={<Switch checked={channels[c.id]} onChange={(e) => setChannels({ ...channels, [c.id]: e.target.checked })} aria-label={`Desktop alerts for ${c.label}`} />}
                    />
                  ))}
                </div>

                <div className="dn-group">
                  <div className="dn-group__head"><h3 className="dn-group__title">Privacy</h3></div>
                  <Row
                    icon="lock"
                    title="Hide message text"
                    description="Alerts show only who wrote, not what they wrote. Useful when your screen is shared or projected."
                    control={<Switch checked={hideText} onChange={(e) => setHideText(e.target.checked)} aria-label="Hide message text" />}
                  />
                  <div className="dn-preview" aria-label="Alert preview">
                    <img src="/hiver-favicon.png" alt="" className="dn-preview__icon" />
                    <div className="dn-preview__text">
                      <div className="dn-preview__title">New WhatsApp message · Daniel Ortiz</div>
                      <div className="dn-preview__site">app.hiverhq.com</div>
                      {!hideText && <div className="dn-preview__body">Sent a photo of the error on the meter</div>}
                    </div>
                  </div>
                </div>

                <div className="dn-footnote">
                  <Icon name="info" size={14} />
                  <span>Desktop notifications are set for each browser. When you sign in on a new browser or computer, Omni asks for permission there. No alerts are sent while you're away or offline. <a href={helpLink().href} target="_blank" rel="noreferrer">Not getting alerts?</a></span>
                </div>
              </>
            )}
          </section>
          )}

          {/* Sound notifications tab: today's settings, unchanged */}
          {tab === 'sounds' && (
          <section className="dn-card" aria-labelledby="dn-sound-title">
            <Row
              strong
              icon="voice"
              title={<span id="dn-sound-title">Sounds</span>}
              description="Play a sound in Omni for these events. Call ringtones follow these settings too."
              control={<Switch size="large" checked={masterSound} onChange={(e) => setMasterSound(e.target.checked)} aria-label="Sound notifications" />}
            />
            {masterSound && soundGroups.map((g, gi) => (
              <div className="dn-group" key={g.title}>
                <div className="dn-group__head dn-group__head--icon"><Icon name={g.icon} size={16} /><h3 className="dn-group__title">{g.title}</h3></div>
                {g.rows.map(([label], ri) => (
                  <Row key={label} title={label} control={<Switch checked={sounds[gi][ri]} onChange={(e) => setSounds(sounds.map((rows, i) => i === gi ? rows.map((v, j) => j === ri ? e.target.checked : v) : rows))} aria-label={`${g.title}: ${label}`} />} />
                ))}
              </div>
            ))}
          </section>
          )}
        </div>
      </div>

      {/* Prototype-only controls, not part of the design */}
      <aside className="dn-proto" aria-label="Prototype controls">
        <div className="dn-proto__title">Prototype controls</div>
        <label className="dn-proto__row">
          <span>Browser permission</span>
          <select value={simulation} onChange={(e) => { const v = e.target.value as Simulation; setSimulation(v); setSimPermission(v === 'real' ? 'default' : v); setBlockedOnTry(false); setBannerClosed(false) }}>
            <option value="real">Real ({realPermission})</option>
            <option value="default">Simulate not asked yet</option>
            <option value="granted">Simulate allowed</option>
            <option value="denied">Simulate blocked</option>
          </select>
        </label>
        <Button variant="ghost" size="xs" onClick={resetPrototype}>Reset to first visit</Button>
      </aside>
    </PageLayout>
  )
}
