import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startIncomingCall } from './omni/incomingCall'

/**
 * Prototype: lets the Test notifications tab ask an open Hiver tab to show an alert.
 * The alert comes from the Hiver tab (as real ones would), so clicking it focuses that tab
 * and opens the conversation. Messages: claim → ack (first tab wins) → fire.
 */
export const BUS = 'omni-notify'
export type Target = { inbox: string; view: string; conv?: string }
export type AlertSpec = { title: string; body?: string; tag: string; requireInteraction?: boolean; target: Target; call?: { name: string | null; phone: string } }

export const targetUrl = (t: Target) =>
  `/?${new URLSearchParams({ inbox: t.inbox, view: t.view, ...(t.conv ? { conv: t.conv } : {}) })}`

/** Shows the alert in this tab; a click focuses the tab and opens the conversation. */
export function showAlert(spec: AlertSpec, open: (url: string) => void) {
  const n = new Notification(spec.title, { body: spec.body, icon: '/hiver-favicon.png', tag: spec.tag, requireInteraction: spec.requireInteraction })
  n.onclick = () => { window.focus(); open(targetUrl(spec.target)); n.close() }
}

const TAB_ID = Math.random().toString(36).slice(2)

/** Mounted once in every Hiver tab. */
export function NotificationBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bus = new BroadcastChannel(BUS)
    bus.onmessage = (e) => {
      const m = e.data
      if (m?.type === 'claim') bus.postMessage({ type: 'ack', id: m.id, tab: TAB_ID })
      if (m?.type === 'fire' && m.tab === TAB_ID) {
        const spec = m.spec as AlertSpec
        showAlert(spec, (url) => navigate(url))
        // A call also rings the call strip in this tab.
        if (spec.call && spec.target.conv) startIncomingCall({ id: spec.target.conv, inbox: spec.target.inbox, view: spec.target.view, ...spec.call })
      }
    }
    return () => bus.close()
  }, [navigate])
  return null
}
