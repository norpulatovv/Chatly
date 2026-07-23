import { EMOJI_LIST } from '../utils/emojis';

export default function EmojiPicker({ onSelect, theme, onClose }) {
  const isDark = theme === 'dark';
  return (
    <div style={{
      position: 'absolute', bottom: 60, right: 20, width: 260,
      background: isDark ? '#1f1f1f' : '#fff',
      border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
      borderRadius: 12, padding: 10, display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 50
    }}>
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            padding: 6, borderRadius: 8, lineHeight: 1
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}