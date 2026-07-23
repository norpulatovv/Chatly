const PREFIX = 'chatly_draft_';

export function getDraft(conversationId) {
  try {
    return localStorage.getItem(PREFIX + conversationId) || '';
  } catch {
    return '';
  }
}

export function setDraft(conversationId, text) {
  try {
    if (text && text.trim()) localStorage.setItem(PREFIX + conversationId, text);
    else localStorage.removeItem(PREFIX + conversationId);
  } catch {
    /* ignore */
  }
}
