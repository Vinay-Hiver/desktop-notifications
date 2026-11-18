import { useSyncExternalStore, useCallback } from 'react';
import { CHANNEL_CHATS, CHANNEL_BY_INBOX } from './data/channelChats';

/**
 * Messages added after load (agent sends, simulated customer replies, replies from test alerts),
 * kept per conversation outside React so the conversation list and the open thread stay in sync
 * and nothing is lost when switching conversations. Not saved across reloads.
 * Chat/WhatsApp/SMS keep only the added messages; Slack keeps its whole thread (it can delete and react).
 */
const store = {};
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

const findConvo = (id) => {
  for (const [inbox, list] of Object.entries(CHANNEL_CHATS)) {
    const c = list.find((x) => x.id === id);
    if (c) return { convo: c, channel: CHANNEL_BY_INBOX[inbox] };
  }
  return null;
};
const keyFor = (id, channel) => (channel === 'slack' ? `full:${id}` : `extra:${id}`);
const initialFor = (id, channel) => (channel === 'slack' ? (findConvo(id)?.convo.messages || []).map((m, i) => ({ ...m, id: m.id || `m-${i}` })) : []);

/** [messages, setMessages] for a conversation; setMessages takes a value or an updater, like useState. */
export function useConvoMessages(id, channel) {
  const key = keyFor(id, channel);
  const value = useSyncExternalStore(subscribe, () => store[key] ?? (store[key] = initialFor(id, channel)));
  const set = useCallback((next) => {
    const prev = store[key] ?? initialFor(id, channel);
    store[key] = typeof next === 'function' ? next(prev) : next;
    emit();
  }, [key, id, channel]);
  return [value, set];
}

const formatNow = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Adds customer messages to a conversation (used when a "customer replied" test alert fires). */
export function addIncoming(id, texts) {
  const found = findConvo(id);
  if (!found) return;
  const key = keyFor(id, found.channel);
  const prev = store[key] ?? initialFor(id, found.channel);
  store[key] = [...prev, ...texts.map((text, i) => ({ id: `in-${Date.now()}-${i}`, kind: 'incoming', text, time: formatNow() }))];
  emit();
  markUnreadIfHidden(id);
}

const previewOf = (m) => m?.text || m?.attachments?.[0]?.name || (m?.kind === 'template' ? (m.template?.name ? `Template: ${m.template.name}` : 'Template message') : '');

/** The latest message's text for a conversation card. */
export function useLatestPreview(convo, channel) {
  const key = keyFor(convo.id, channel);
  const added = useSyncExternalStore(subscribe, () => store[key]);
  const all = channel === 'slack' ? (added ?? convo.messages ?? []) : [...(convo.messages || []), ...(added || [])];
  return previewOf(all[all.length - 1]) || convo.preview;
}

/* ── Unread ─────────────────────────────────────────────────────────────
 * A conversation turns unread when a customer message arrives while it isn't
 * on screen (another conversation is open, or Hiver doesn't have focus).
 * Opening it, or coming back to Hiver while it's open, marks it read. */
let unread = new Set();
let openId = null;
const setUnread = (next) => { unread = next; emit(); };

export function markRead(id) { if (id && unread.has(id)) { const n = new Set(unread); n.delete(id); setUnread(n); } }
export function setOpenConversation(id) { openId = id; if (id && document.hasFocus()) markRead(id); }
if (typeof window !== 'undefined') window.addEventListener('focus', () => markRead(openId));

const markUnreadIfHidden = (id) => {
  if (id === openId && document.hasFocus()) return;
  if (!unread.has(id)) setUnread(new Set(unread).add(id));
};

export const useIsUnread = (id) => useSyncExternalStore(subscribe, () => unread.has(id));

const inboxOf = (id) => Object.entries(CHANNEL_CHATS).find(([, list]) => list.some((c) => c.id === id));
/** Unread conversations in an inbox (optionally one view), for the sidebar. */
export const useUnreadIn = (inbox, view) => useSyncExternalStore(subscribe, () => {
  let n = 0;
  unread.forEach((id) => {
    const hit = inboxOf(id);
    if (hit && hit[0] === inbox && (!view || hit[1].find((c) => c.id === id)?.view === view)) n += 1;
  });
  return n;
});
