import { X, Eye } from 'lucide-react';
import { getAvatarGradient, getInitial } from '../utils/avatar';

export default function SeenByModal({ theme, seenBy, sender, onClose }) {
  const isDark = theme === 'dark';
  const viewers = (seenBy || []).filter((u) => u !== sender);

  return (
    <div
      className="modal-overlay-anim"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        className="modal-card-anim"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 300, maxHeight: '60vh', display: 'flex', flexDirection: 'column', background: isDark ? '#171717' : '#fff', borderRadius: 16, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={16} color="#6366f1" />
            <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 15, fontWeight: 600, margin: 0 }}>Ko'rganlar</p>
          </div>
          <button onClick={onClose} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {viewers.length === 0 && (
            <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Hali hech kim ko'rmadi</p>
          )}
          {viewers.map((u) => (
            <div key={u} className="scale-tap" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 600, background: getAvatarGradient(u) }}>
                {getInitial(u)}
              </div>
              <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, margin: 0 }}>{u}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
