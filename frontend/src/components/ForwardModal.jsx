import { useEffect, useState } from 'react';
import { X, Forward as ForwardIcon, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import { getAvatarGradient, getInitial } from '../utils/avatar';

export default function ForwardModal({ theme, currentConversationId, onClose, onForward }) {
  const isDark = theme === 'dark';
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    api.get('/conversations/mine').then((res) => setConversations(res.data)).catch(() => {});
  }, []);

  return (
    <div className="modal-overlay-anim" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200
    }} onClick={onClose}>
      <div
        className="modal-card-anim"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
          background: isDark ? '#171717' : '#fff', borderRadius: 16, padding: 22,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ForwardIcon size={18} color="#6366f1" />
            <h2 style={{ color: isDark ? '#fff' : '#171717', fontSize: 16, fontWeight: 600, margin: 0 }}>
              Xabarni yuborish
            </h2>
          </div>
          <button onClick={onClose} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 && (
            <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Suhbatlar topilmadi</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className="convo-row scale-tap"
              onClick={() => onForward(c)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', cursor: 'pointer', borderRadius: 10 }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 600,
                background: c.isGroup ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : getAvatarGradient(c.title)
              }}>
                {c.isGroup ? <MessageCircle size={18} /> : getInitial(c.title)}
              </div>
              <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, fontWeight: 500, margin: 0 }}>
                {c.title}{c.id === currentConversationId ? ' (shu suhbat)' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
