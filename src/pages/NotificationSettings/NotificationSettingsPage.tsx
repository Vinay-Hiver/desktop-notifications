import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Volume2 } from 'lucide-react'
import { Icon } from '../../icons/Icon'
import type { IconName } from '../../icons/iconData'
import { Button } from '../../components/Button'
import { Switch } from '../../components/Switch'
import { Tabs } from '../../components/Tabs'
import { AdminSidebar } from '../../patterns/AdminSidebar'
import { MainNav } from '../../patterns/MainNav'
import { navSampleFooterItems, navSampleItems, navSampleUserMenu } from '../../patterns/MainNav/sampleData'
import { PageLayout } from '../../patterns/PageLayout'
import './NotificationSettingsPage.css'
import warningIcon from '../../assets/banner/warning.svg'
import externalIcon from '../../assets/banner/external.svg'
import cardBell from '../../assets/banner/card-bell-ringing.svg'
import voiceIcon from '../../assets/settings/voice.svg'
import slackIcon from '../../assets/settings/slack.svg'
import chatIcon from '../../assets/settings/chat.svg'
import whatsappIcon from '../../assets/settings/whatsapp.svg'
import smsIcon from '../../assets/settings/sms.svg'
import lockIcon from '../../assets/settings/lock.svg'
import hiverLogo from '../../assets/settings/hiver-logo.svg'
import externalBlue from '../../assets/settings/external-blue.svg'
import { browserLabel, detectBrowser, helpLink, load, readPermission, save } from './desktopNotifications'
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
  { id: 'voice', label: 'Voice', icon: 'voice', description: '' },
  { id: 'chat', label: 'Chat', icon: 'chatinbox', description: '' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', description: '' },
  { id: 'sms', label: 'SMS', icon: 'sms', description: '' },
  { id: 'slack', label: 'Slack', icon: 'slack', description: '' },
]

// Today's sound settings, unchanged (from the current Omni page).
const soundGroups: { title: string; icon: IconName; info?: string; disabled?: boolean; rows: [string, boolean][] }[] = [
  { title: 'For Email Inbox', icon: 'emailinbox', rows: [['New conversation received', true], ['Email assigned to me', false], ['Notes mentioning me', true], ['SLA Breaches', true]] },
  { title: 'For Chat Inbox', icon: 'chatinbox', info: 'Chat sounds follow your chat availability', disabled: true, rows: [['New chat received', false], ['Chat assigned to me', true], ['New message in a chat already assigned to me', true]] },
  { title: 'For WhatsApp Inbox', icon: 'whatsapp', info: 'Applies to all WhatsApp inboxes you belong to', rows: [['New conversation created', false], ['Conversation assigned to me', false], ['New message in a conversation already assigned to me', false], ['SLA Breaches', false]] },
  { title: 'For SMS Inbox', icon: 'sms', info: 'Applies to all SMS inboxes you belong to', rows: [['New conversation created', false], ['Conversation assigned to me', false], ['New message in a conversation already assigned to me', false], ['SLA Breaches', false]] },
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

/** Mock of a desktop alert (Figma "Dektop-Browser-Notification"). Hiver's icon sits on the right. */
function AlertPreview({ showText }: { showText: boolean }) {
  return (
    <div className="dn-preview" aria-label="Notification preview">
      <span className="dn-preview__label">Notification preview</span>
      <div className="dn-preview__card">
        <div className="dn-preview__text">
          <div className="dn-preview__title">New chat from Emma<br />app.hiverhq.com</div>
          {showText && <div className="dn-preview__body">Hi, I need help with my account</div>}
        </div>
        <img src={hiverLogo} width={28} height={32} alt="" className="dn-preview__logo" />
      </div>
    </div>
  )
}

const channelRows: { id: string; label: string; icon: string }[] = [
  { id: 'voice', label: 'Voice', icon: voiceIcon },
  { id: 'slack', label: 'Slack', icon: slackIcon },
  { id: 'chat', label: 'Chat', icon: chatIcon },
  { id: 'whatsapp', label: 'WhatsApp', icon: whatsappIcon },
  { id: 'sms', label: 'SMS', icon: smsIcon },
]

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
  const [showText, setShowText] = useState<boolean>(() => load('dn.showText', false))
  const [promptDismissed, setPromptDismissed] = useState<boolean>(() => load('dn.promptDismissed', false))
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
  useEffect(() => save('dn.showText', showText), [showText])
  useEffect(() => save('dn.promptDismissed', promptDismissed), [promptDismissed])
  useEffect(() => save('dn.simulation', simulation), [simulation])
  useEffect(() => save('dn.simPermission', simPermission), [simPermission])

  // Permission can change in browser settings while Omni is open: re-check whenever the tab comes back.
  useEffect(() => {
    const recheck = () => setRealPermission(readPermission())
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)
    // Chrome, Edge and Firefox also report the change live, while the agent is still in browser settings.
    let status: PermissionStatus | null = null
    navigator.permissions?.query({ name: 'notifications' as PermissionName }).then((st) => { status = st; st.onchange = recheck }).catch(() => { /* not supported: focus check covers it */ })
    return () => {
      window.removeEventListener('focus', recheck); document.removeEventListener('visibilitychange', recheck)
      if (status) status.onchange = null
    }
  }, [])

  const isBlocked = permission === 'denied' || permission === 'unsupported'
  const isOn = enabled && permission === 'granted'
  const showBlockedNote = isBlocked

  // Sends the test alert. The "Test sent…" hint shows only when the agent pressed the button (it's not kept, so it's gone on the next visit).
  const sendTest = useCallback((fromButton = false) => {
    const real = readPermission() === 'granted' && simulation === 'real'
    if (real) {
      // Turning on: confirms the setting. Button: a short "it works" check.
      new Notification(fromButton ? 'Hello from Hiver' : 'Desktop notifications are on', {
        body: fromButton ? 'Great, alerts are working.' : "You'll see calls and messages here even when Hiver is in the background.",
        icon: '/hiver-favicon.png',
        tag: `omni-test-${Date.now()}`, // a new tag each time, so a repeat test pops up instead of silently replacing the last one
      })
    }
    if (fromButton) setTestSent(real ? 'sent' : 'simulated')
  }, [simulation])

  async function turnOn() {
    setBlockedOnTry(false); setClosedPrompt(false)
    if (permission === 'granted') { setEnabled(true); sendTest(); return }
    if (isBlocked) { setBlockedOnTry(true); return }
    setAsking(true)
    if (simulation !== 'real') {
      setTimeout(() => { setAsking(false); setSimPermission('granted'); setEnabled(true) }, 1500)
      return
    }
    const result = (await Notification.requestPermission()) as Permission
    setAsking(false)
    setRealPermission(result)
    if (result === 'granted') { setEnabled(true); setTimeout(() => sendTest(), 0) } else if (result === 'default') setClosedPrompt(true); else setBlockedOnTry(true)
  }

  function onMasterChange(next: boolean) {
    if (next) { setPromptDismissed(true); void turnOn() } else { setEnabled(false); setTestSent('none') }
  }

  // Blocked → allowed while this page is open: the agent fixed it to get alerts, so turn them on and send the test.
  const prevPermission = useRef(permission)
  useEffect(() => {
    const prev = prevPermission.current
    prevPermission.current = permission
    if (prev === 'denied' && permission === 'granted') { setBlockedOnTry(false); setClosedPrompt(false); setEnabled(true); sendTest() }
  }, [permission, sendTest])

  function resetPrototype() {
    setEnabled(false); setPromptDismissed(false); setBlockedOnTry(false); setTestSent('none'); setShowText(false)
    setChannels(Object.fromEntries(desktopChannels.map((c) => [c.id, true])))
    if (simulation !== 'real') setSimPermission(simulation)
  }

  const nav = <MainNav onChange={(id) => { if (id === 'conversations') onNavigate?.('home') }} items={navSampleItems} footerItems={navSampleFooterItems} user={{ initial: 'P', name: 'Praveen' }} userMenu={navSampleUserMenu} />
  const sidebar = <AdminSidebar title="My Settings" sections={mySettingsSections} value="notifications" />

  const renderChannel = (c: { id: string; label: string; icon: string }) => (
    <div className="dn-item" key={c.id}>
      <span className="dn-item__icon"><img src={c.icon} width={14} height={14} alt="" /></span>
      <div className="dn-item__text"><span className="dn-item__title">{c.label}</span></div>
      <Switch checked={channels[c.id]} onChange={(e) => setChannels({ ...channels, [c.id]: e.target.checked })} aria-label={`Desktop alerts for ${c.label}`} />
    </div>
  )

  return (
    <PageLayout variant="admin" nav={nav} sidebar={sidebar}>
      <div className="dn-page">
        <div className="dn-header"><span className="dn-header__title">Notifications Settings</span></div>

        <div className="dn-body">
          <div className="dn-tabs">
            <Tabs
              tabs={[{ value: 'sounds', label: 'Sound notifications' }, { value: 'desktop', label: 'Desktop notifications' }]}
              value={tab}
              onChange={setTab}
            />
          </div>
          {/* Blocked by the browser: shown between the tabs and the settings, outside the card */}
          {tab === 'desktop' && showBlockedNote && !asking && (
            <div className="dn-blocked" role="alert">
              <span className="dn-blocked__icon"><img src={warningIcon} width={14} height={14} alt="" /></span>
              <div className="dn-blocked__text">
                <span className="dn-blocked__title">Your browser is blocking notifications from Omni.</span>
                <span className="dn-blocked__desc">Allow notifications for Omni and they'll turn on here.</span>
              </div>
              <a className="dn-blocked__link" href={helpLink().href} target="_blank" rel="noreferrer">
                {detectBrowser() ? `How to allow ${detectBrowser()!.name} notifications` : 'How to allow notifications'}
                <img src={externalIcon} width={16} height={16} alt="" />
              </a>
            </div>
          )}

          {/* Desktop notifications tab, card version */}
          {tab === 'desktop' && (
          <section className="dn-card dn-card--desktop" aria-labelledby="dn-desktop-title">
            <div className="dn-master">
              <img className="dn-master__icon" src={cardBell} width={14} height={20} alt="" />
              <div className="dn-master__text">
                <span className="dn-master__title" id="dn-desktop-title">Desktop notifications</span>
                <span className="dn-master__desc">Get alerts for calls and messages even when Hiver is in the background.</span>
              </div>
              <Switch checked={isOn || asking} disabled={asking || isBlocked} onChange={(e) => onMasterChange(e.target.checked)} aria-label="Desktop notifications" />
            </div>

            {asking && (
              <div className="dn-note dn-note--neutral">
                <Icon name="info" size={16} />
                <span>Choose <strong>Allow</strong> in the browser prompt.</span>
              </div>
            )}

            {closedPrompt && !asking && !isOn && (
              <div className="dn-note dn-note--neutral">
                <Icon name="info" size={16} />
                <span>Prompt closed. Turn on again and choose <strong>Allow</strong>.</span>
              </div>
            )}


            {isOn && (
              <div className="dn-test">
                <button type="button" className="dn-test__btn" onClick={() => sendTest(true)}>Send a test notification</button>
                {testSent !== 'none' && (
                  <div className="dn-testhint">
                    <span>Notification sent. If you’re not seeing it, your computer may be blocking it.</span>
                    <a href={helpLink().href} target="_blank" rel="noreferrer">Troubleshoot notifications</a>
                    <img src={externalBlue} width={14} height={14} alt="" />
                  </div>
                )}
              </div>
            )}
          </section>
          )}

          {/* Notifications on: Channels and Privacy, each in its own box (Figma 14:14604) */}
          {tab === 'desktop' && isOn && (
            <>
              <section className="dn-section" aria-labelledby="dn-channels-title">
                <h3 className="dn-section__title" id="dn-channels-title">Channels</h3>
                <div className="dn-box dn-box--channels">
                  <div className="dn-chgroup">
                    <p className="dn-chgroup__desc">Alerts when a call rings</p>
                    {channelRows.filter((c) => c.id === 'voice').map(renderChannel)}
                  </div>
                  <hr className="dn-divider" />
                  <div className="dn-chgroup">
                    <p className="dn-chgroup__desc">Alerts when a conversation is assigned to you, waits in your inbox, or the customer replies</p>
                    {channelRows.filter((c) => c.id !== 'voice').map((c, i) => <Fragment key={c.id}>{i > 0 && <hr className="dn-divider" />}{renderChannel(c)}</Fragment>)}
                  </div>
                </div>
              </section>

              <section className="dn-section" aria-labelledby="dn-privacy-title">
                <h3 className="dn-section__title" id="dn-privacy-title">Privacy</h3>
                <div className="dn-box">
                  <div className="dn-item">
                    <span className="dn-item__icon"><img src={lockIcon} width={14} height={14} alt="" /></span>
                    <div className="dn-item__text">
                      <span className="dn-item__title">Show message text</span>
                      <span className="dn-item__desc">Include a preview of the customer’s message</span>
                    </div>
                    <Switch checked={showText} onChange={(e) => setShowText(e.target.checked)} aria-label="Show message text" />
                  </div>
                  <AlertPreview showText={showText} />
                </div>
              </section>
            </>
          )}

          {/* Sound notifications tab: today's settings, unchanged */}
          {tab === 'sounds' && (
          <section className="dn-sound" aria-labelledby="dn-sound-title">
            <div className="dn-sound__master">
              <span className="dn-sound__icon"><Volume2 size={16} strokeWidth={1.75} /></span>
              <span className="dn-sound__master-title" id="dn-sound-title">Sound Notifications for Shared Inbox</span>
              <span className="dn-sound__info" title="Play a sound in Omni for these events"><Icon name="info" size={16} /></span>
              <Switch checked={masterSound} onChange={(e) => setMasterSound(e.target.checked)} aria-label="Sound Notifications for Shared Inbox" />
            </div>
            {soundGroups.map((g, gi) => {
              const off = !masterSound || g.disabled
              return (
                <div className={off ? 'dn-sound__group dn-sound__group--off' : 'dn-sound__group'} key={g.title}>
                  <div className="dn-sound__head">
                    <span className={`dn-sound__icon dn-sound__icon--${g.icon}`}><Icon name={g.icon} size={16} /></span>
                    <h3 className="dn-sound__title">{g.title}</h3>
                    {g.info && <span className="dn-sound__info" title={g.info}><Icon name="info" size={16} /></span>}
                  </div>
                  {g.rows.map(([label], ri) => (
                    <div className="dn-sound__row" key={label}>
                      <span className="dn-sound__label">{label}:</span>
                      <Switch checked={sounds[gi][ri]} disabled={off} onChange={(e) => setSounds(sounds.map((rows, i) => i === gi ? rows.map((v, j) => j === ri ? e.target.checked : v) : rows))} aria-label={`${g.title}: ${label}`} />
                    </div>
                  ))}
                </div>
              )
            })}
          </section>
          )}
        </div>
      </div>

      {/* Prototype-only controls, not part of the design */}
      <aside className="dn-proto" aria-label="Prototype controls">
        <div className="dn-proto__title">Prototype controls</div>
        <label className="dn-proto__row">
          <span>Browser permission</span>
          <select value={simulation} onChange={(e) => { const v = e.target.value as Simulation; setSimulation(v); setSimPermission(v === 'real' ? 'default' : v); setBlockedOnTry(false) }}>
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
