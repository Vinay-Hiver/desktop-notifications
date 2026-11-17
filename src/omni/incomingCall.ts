import { useSyncExternalStore } from 'react'

/** The one incoming/active call shown in the call strip. Kept outside React so it survives route changes. */
export type IncomingCall = { id: string; inbox: string; view: string; name: string | null; phone: string }
type State = { call: IncomingCall | null; accepted: boolean; acceptedAt: number }

let state: State = { call: null, accepted: false, acceptedAt: 0 }
const subs = new Set<() => void>()
const set = (next: Partial<State>) => { state = { ...state, ...next }; subs.forEach((f) => f()) }

export const startIncomingCall = (call: IncomingCall) => { if (!state.call) set({ call, accepted: false, acceptedAt: 0 }) }
export const acceptCall = () => set({ accepted: true, acceptedAt: Date.now() })
export const endCall = () => set({ call: null, accepted: false, acceptedAt: 0 })

export const useIncomingCall = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
