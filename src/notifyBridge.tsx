import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startIncomingCall } from './omni/incomingCall'
import { addIncoming } from './omni/convoMessages'

/**
 * Prototype: lets the Test notifications tab ask an open Hiver tab to show an alert.
 * The alert comes from the Hiver tab (as real ones would), so clicking it focuses that tab
 * and opens the conversation. Messages: here/bye (presence, with when the tab was last in front) → fire → result.
 * The test page sends each alert to the Hiver tab used last.
 */
export const BUS = 'omni-notify'
export type Target = { inbox: string; view: string; conv?: string }
export type AlertSpec = { title: string; body?: string; tag: string; requireInteraction?: boolean; target: Target; call?: { name: string | null; phone: string }; inject?: string[] }

export const targetUrl = (t: Target) =>
  `/?${new URLSearchParams({ inbox: t.inbox, view: t.view, ...(t.conv ? { conv: t.conv } : {}) })}`

/** Shows the alert in this tab; a click focuses the tab and opens the conversation. */
export function showAlert(spec: AlertSpec, open: (url: string) => void) {
  const n = new Notification(spec.title, { body: spec.body, icon: '/favicon.svg', tag: spec.tag, requireInteraction: spec.requireInteraction })
  n.onclick = () => { window.focus(); open(targetUrl(spec.target)); n.close() }
}

const TAB_ID = Math.random().toString(36).slice(2)
// When this tab was last in front (0 if it opened in the background).
let lastActive = typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : 0

/** Mounted once in every Hiver tab. */
export function NotificationBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bus = new BroadcastChannel(BUS)
    // Presence: the test page keeps a live list of Hiver tabs, so it never has to wait to find one.
    const here = () => bus.postMessage({ type: 'here', tab: TAB_ID, lastActive })
    const bye = () => bus.postMessage({ type: 'bye', tab: TAB_ID })
    // Coming to the front makes this the last-used Hiver tab.
    const active = () => { if (document.visibilityState === 'visible') { lastActive = Date.now(); here() } }
    here()
    window.addEventListener('pagehide', bye)
    window.addEventListener('focus', active)
    document.addEventListener('visibilitychange', active)
    bus.onmessage = (e) => {
      const m = e.data
      if (m?.type === 'who') here()
      if (m?.type === 'fire' && m.tab === TAB_ID) {
        const spec = m.spec as AlertSpec
        // A customer reply alert also adds that reply to the conversation, as if it just arrived.
        if (spec.inject?.length && spec.target.conv) addIncoming(spec.target.conv, spec.inject)
        // A call also rings the call strip in this tab.
        if (spec.call && spec.target.conv) startIncomingCall({ id: spec.target.conv, inbox: spec.target.inbox, view: spec.target.view, ...spec.call })
        // Desktop alerts are for when Hiver isn't in front: hold them back while this tab has focus
        // (the unread dot, sidebar dot and call strip show inside Hiver instead).
        const shown = !document.hasFocus()
        if (shown) showAlert(spec, (url) => navigate(url))
        bus.postMessage({ type: 'result', id: m.id, shown })
      }
    }
    return () => { bye(); window.removeEventListener('pagehide', bye); window.removeEventListener('focus', active); document.removeEventListener('visibilitychange', active); bus.close() }
  }, [navigate])
  return null
}
