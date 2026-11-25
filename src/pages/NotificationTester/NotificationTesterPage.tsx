import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { load, readPermission } from '../NotificationSettings/desktopNotifications'
import voiceIcon from '../../assets/settings/voice.svg'
import chatIcon from '../../assets/settings/chat.svg'
import whatsappIcon from '../../assets/settings/whatsapp.svg'
import smsIcon from '../../assets/settings/sms.svg'
import slackIcon from '../../assets/settings/slack.svg'
import emailIcon from '../../assets/settings/email.svg'
import { conversationsData } from '../../omni/data/emailConversations'
import { CHANNEL_CHATS } from '../../omni/data/channelChats'
import { VOICE_CALLS } from '../../omni/data/voiceCalls'
import { BUS, showAlert } from '../../notifyBridge'
import type { AlertSpec, Target } from '../../notifyBridge'
import './NotificationTesterPage.css'

/**
 * Prototype tool: fire sample desktop alerts per channel, following the PRD's alert cases
 * (incoming call; conversation assigned to you; new conversation waiting in an inbox; customer replied;
 * several messages in one conversation; several conversations waiting). Opens in its own tab.
 * Honours the channel switches and "Show message preview" from Notifications Settings.
 */

type Sample = { id: string; label: string; title: string; body: string; target: Target; call?: { name: string | null; phone: string }; inject?: string[] }
type Channel = { id: string; name: string; icon: string; desc: string; samples: Sample[] }
type Convo = { id: string; view: string; name: string; preview: string }

// Alerts point at the dummy conversations in each inbox (Unassigned = waiting in the inbox, Mine = assigned to you).
// Customer follow-ups used by the reply alerts; the last one is the alert's text.
const REPLIES: Record<string, string[]> = {
  'Website Chat': ['Thanks! One more thing', 'Can I also add a teammate to my plan?', 'Can you check today?'],
  'WhatsApp Support': ['Hi again', 'I tried that but it still shows the old address', 'Can you update it for me?'],
  'SMS Support': ['Hello?', 'Still waiting on this', 'Can someone call me back today?'],
  'Slack Connect': ['Quick follow-up here', 'Two more users are seeing the same error', 'Any update on this?'],
}

const messagingSamples = (inbox: string, ch: string, noun = 'conversation'): Sample[] => {
  const all: Convo[] = (CHANNEL_CHATS as Record<string, Convo[]>)[inbox] || []
  const waiting = all.filter((c) => c.view === 'Unassigned')
  const mine = all.filter((c) => c.view === 'Mine')
  const [w, m0, m1] = [waiting[0], mine[0], mine[1] ?? mine[0]]
  const to = (c: Convo) => ({ inbox, view: c.view, conv: c.id })
  const replies = REPLIES[inbox] ?? ['Following up on this', 'Any news?', 'Can you check today?']
  return [
    { id: 'assigned', label: `New ${noun} assigned to you`, title: `New ${ch} · ${m0.name}`, body: m0.preview, target: to(m0) },
    { id: 'waiting', label: `New ${noun} waiting in inbox`, title: `New ${ch} waiting in ${inbox}`, body: `${w.name}: ${w.preview}`, target: to(w) },
    { id: 'reply', label: 'Customer replied', title: `${m1.name} replied on ${ch}`, body: replies[2], target: to(m1), inject: [replies[2]] },
    { id: 'burst', label: 'Several new messages', title: `${m0.name} · 3 new messages`, body: replies[2], target: to(m0), inject: replies },
    { id: 'summary', label: `${waiting.length} ${noun}s waiting`, title: `${waiting.length} ${noun}s waiting in ${inbox}`, body: '', target: { inbox, view: 'Unassigned' } },
  ]
}

type Call = { id: string; inbox: string; view: string; name: string | null; phone: string }
const callSamples = (): Sample[] => {
  const calls = (VOICE_CALLS as Call[]).filter((c) => c.inbox === 'Phone Support')
  const known = calls.find((c) => c.name) ?? calls[0]
  const unknown = calls.find((c) => !c.name) ?? calls[0]
  const to = (c: Call) => ({ inbox: c.inbox, view: c.view, conv: c.id })
  return [
    { id: 'call', label: 'Incoming call', title: `Incoming call · ${known.name ?? known.phone}`, body: 'Phone Support', target: to(known), call: { name: known.name, phone: known.phone } },
    { id: 'call-number', label: 'Incoming call (unknown number)', title: `Incoming call · ${unknown.phone}`, body: 'Phone Support', target: to(unknown), call: { name: null, phone: unknown.phone } },
  ]
}

type Email = { id: number; inbox: string; type: string; sender: string; subject: string; preview: string }
// Email alerts only for assignment and customer replies (no "waiting in inbox": shared email inboxes are too busy).
const emailSamples = (): Sample[] => {
  const mine = (conversationsData as Email[]).filter((c) => c.inbox === 'Customer Support' && c.type === 'Mine')
  const [a, b] = [mine[0], mine[1] ?? mine[0]]
  const to = (c: Email) => ({ inbox: c.inbox, view: c.type, conv: String(c.id) })
  return [
    { id: 'assigned', label: 'New email assigned to you', title: `New email · ${a.sender}`, body: a.subject, target: to(a) },
    { id: 'reply', label: 'Customer replied', title: `${b.sender} replied on email`, body: b.preview, target: to(b) },
  ]
}

// Email starts off until turned on in settings; the others start on.
const isOff = (channels: Record<string, boolean>, id: string) => (channels[id] ?? id !== 'email') === false

const CHANNELS: Channel[] = [
  { id: 'voice', name: 'Voice', icon: voiceIcon, desc: 'Phone Support', samples: callSamples() },
  { id: 'chat', name: 'Chat', icon: chatIcon, desc: 'Website Chat', samples: messagingSamples('Website Chat', 'chat', 'chat') },
  { id: 'whatsapp', name: 'WhatsApp', icon: whatsappIcon, desc: 'WhatsApp Support', samples: messagingSamples('WhatsApp Support', 'WhatsApp message') },
  { id: 'sms', name: 'SMS', icon: smsIcon, desc: 'SMS Support', samples: messagingSamples('SMS Support', 'SMS') },
  { id: 'slack', name: 'Slack', icon: slackIcon, desc: 'Slack Connect', samples: messagingSamples('Slack Connect', 'Slack message') },
  { id: 'email', name: 'Email', icon: emailIcon, desc: 'Customer Support', samples: emailSamples() },
]

/** Open Hiver tabs (they announce themselves) and when each was last in front. */
const hiverTabs = new Map<string, number>()
const bus = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BUS) : null
const pending = new Map<string, (shown: boolean) => void>()
if (bus) {
  bus.onmessage = (e) => {
    const m = e.data
    if (m?.type === 'here') hiverTabs.set(m.tab, m.lastActive ?? 0)
    if (m?.type === 'bye') hiverTabs.delete(m.tab)
    if (m?.type === 'result') { pending.get(m.id)?.(m.shown); pending.delete(m.id) }
  }
  bus.postMessage({ type: 'who' }) // tabs opened before this page answer straight away
}

/** Asks an open Hiver tab to show the alert (so a click returns to it). With no Hiver tab, shows it here and opens Hiver in a new tab on click. No waiting either way. */
function sendViaHiver(spec: AlertSpec, onResult: (r: 'shown' | 'held' | 'fallback') => void) {
  // The Hiver tab used last. If that tab is in front right now, it holds the alert back (Hiver is in front).
  let tab: string | undefined, best = -1
  for (const [id, at] of hiverTabs) if (at >= best) { tab = id; best = at }
  if (!bus || !tab) { showAlert(spec, (url) => window.open(url, '_blank')); onResult('fallback'); return }
  const id = Math.random().toString(36).slice(2)
  pending.set(id, (shown) => onResult(shown ? 'shown' : 'held'))
  bus.postMessage({ type: 'fire', id, tab, spec })
}

export function NotificationTesterPage() {
  const [permission, setPermission] = useState(readPermission)
  const [delay, setDelay] = useState(false)
  const [last, setLast] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    document.title = 'Test notifications - Omni'
    const recheck = () => { setPermission(readPermission()); setTick((t) => t + 1) }
    window.addEventListener('focus', recheck)
    // Settings save on every change (no Save button): pick them up as soon as the other tab writes them.
    const onStorage = () => { recheck(); setLast(null) } // the old "off in settings" note may no longer be true
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('focus', recheck); window.removeEventListener('storage', onStorage) }
  }, [])

  const enabled = load('dn.enabled', false)
  const channels = load<Record<string, boolean>>('dn.channels', {})
  const showText = load('dn.showPreview', false)

  function fire(ch: Channel, s: Sample) {
    // Read settings fresh on every send, in case they changed in the settings tab.
    const channels = load<Record<string, boolean>>('dn.channels', {})
    const showText = load('dn.showPreview', false)
    if (readPermission() !== 'granted') { setLast('Notifications aren’t allowed in this browser yet.'); return }
    if (isOff(channels, ch.id)) { setLast(`${ch.name} alerts are off in Notifications Settings, so nothing was sent.`); return }
    const send = () => sendViaHiver({
      title: s.title,
      body: (showText || ch.id === 'voice') && s.body ? s.body : undefined, // calls show the line; messages only if Show message preview is on
      tag: `omni-${ch.id}-${s.id}-${Date.now()}`,
      // No requireInteraction: on macOS that routes the alert to Chrome's separate "Alerts" permission, which is often off.
      target: s.target,
      call: s.call,
      inject: s.inject,
    }, (r) => setLast(
      r === 'held' ? `Hiver is in front, so no desktop alert for “${s.label}”. It shows inside Hiver instead.`
      : r === 'fallback' ? `Sent “${s.label}”. No Hiver tab is open, so clicking it opens Hiver in a new tab.`
      : `Sent “${s.label}”.`))
    if (delay) { setTimeout(send, 5000); setLast(`“${s.label}” will send in 5 seconds. Switch to another app to get the alert, or to the Hiver tab to see it held back.`) }
    else send()
  }

  return (
    <div className="nt-page">
      <div className="nt-header"><span className="nt-header__title">Test notifications</span></div>
      <div className="nt-body">
        <p className="nt-intro">Send sample desktop alerts for each channel. Click an alert to open that conversation in Hiver. They follow your Notifications Settings: channel switches and Show message preview.</p>

        {permission !== 'granted' && (
          <div className="nt-warn">Notifications aren’t allowed in this browser. Turn them on in Notifications Settings first.</div>
        )}
        {permission === 'granted' && !enabled && (
          <div className="nt-warn">Desktop notifications are off in Notifications Settings. Test alerts will still send.</div>
        )}

        <label className="nt-delay">
          <input type="checkbox" checked={delay} onChange={(e) => setDelay(e.target.checked)} />
          Send after 5 seconds, so I can switch to another app or to Hiver
        </label>
        {last && <div className="nt-last" role="status">{last}</div>}

        {CHANNELS.map((ch) => {
          const off = isOff(channels, ch.id)
          return (
            <section className="nt-section" key={ch.id} aria-labelledby={`nt-${ch.id}`}>
              <div className="nt-section__head">
                <img src={ch.icon} width={14} height={14} alt="" />
                <h3 className="nt-section__title" id={`nt-${ch.id}`}>{ch.name}</h3>
                <span className="nt-section__desc">{ch.desc}</span>
                {off && <span className="nt-off">Off in settings</span>}
              </div>
              <div className="nt-box">
                {ch.samples.map((s) => (
                  <Button key={s.id} variant="secondary" size="sm" onClick={() => fire(ch, s)} disabled={permission !== 'granted'}>{s.label}</Button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
