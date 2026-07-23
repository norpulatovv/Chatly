const PREFIX = 'chatly_wallpaper_';

export const WALLPAPER_PRESETS = [
  { id: 'default', label: 'Standart', value: null },
  { id: 'indigo', label: 'Indigo', value: 'linear-gradient(160deg, #1e1b4b 0%, #0a0a0a 60%)' },
  { id: 'sunset', label: 'Quyosh botishi', value: 'linear-gradient(160deg, #7c2d12 0%, #0a0a0a 65%)' },
  { id: 'forest', label: "O'rmon", value: 'linear-gradient(160deg, #14532d 0%, #0a0a0a 65%)' },
  { id: 'ocean', label: 'Okean', value: 'linear-gradient(160deg, #0c4a6e 0%, #0a0a0a 65%)' },
  { id: 'rose', label: 'Pushti', value: 'linear-gradient(160deg, #831843 0%, #0a0a0a 65%)' },
];

export function getWallpaper(conversationId) {
  try {
    return localStorage.getItem(PREFIX + conversationId) || null;
  } catch {
    return null;
  }
}

export function setWallpaper(conversationId, value) {
  try {
    if (value) localStorage.setItem(PREFIX + conversationId, value);
    else localStorage.removeItem(PREFIX + conversationId);
  } catch {
    /* ignore */
  }
}
