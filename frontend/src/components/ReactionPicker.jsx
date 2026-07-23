import { useState } from 'react';
import { Plus } from 'lucide-react';
import { QUICK_REACTIONS } from '../utils/reactions';
import { EMOJI_LIST } from '../utils/emojis';

export default function ReactionPicker({ onSelect, theme, isOwn }) {
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="pop-in"
      style={{
        position: 'absolute',
        bottom: '100%',
        [isOwn ? 'right' : 'left']: 0,
        marginBottom: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: isDark ? '#1f1f1f' : '#fff',
        border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
        borderRadius: expanded ? 14 : 20,
        padding: '4px 6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: 30,
        maxWidth: 220
      }}
    >
      <div style={{ display: 'flex', gap: 2 }}>
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="scale-tap"
            style={{
              background: 'none', border: 'none', fontSize: 17, cursor: 'pointer',
              padding: 3, borderRadius: '50%', lineHeight: 1
            }}
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="scale-tap"
          title="Ko'proq"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 3, borderRadius: '50%', lineHeight: 1, color: '#888',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {expanded && (
        <div className="pop-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, paddingTop: 4, borderTop: `1px solid ${isDark ? '#333' : '#e5e5e5'}` }}>
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="scale-tap"
              style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: 3, borderRadius: 6, lineHeight: 1 }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
