const KEY = 'chatly_muted_conversations';

function readSet() {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function isMuted(conversationId) {
  return readSet().has(conversationId);
}

export function toggleMute(conversationId) {
  const set = readSet();
  if (set.has(conversationId)) set.delete(conversationId);
  else set.add(conversationId);
  writeSet(set);
  return set.has(conversationId);
}
