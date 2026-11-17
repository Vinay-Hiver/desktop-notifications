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
}

const previewOf = (m) => m?.text || m?.attachments?.[0]?.name || (m?.kind === 'template' ? (m.template?.name ? `Template: ${m.template.name}` : 'Template message') : '');

/** The latest message's text for a conversation card. */
export function useLatestPreview(convo, channel) {
  const key = keyFor(convo.id, channel);
  const added = useSyncExternalStore(subscribe, () => store[key]);
  const all = channel === 'slack' ? (added ?? convo.messages ?? []) : [...(convo.messages || []), ...(added || [])];
  return previewOf(all[all.length - 1]) || convo.preview;
}
