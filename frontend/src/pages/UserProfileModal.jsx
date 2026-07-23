import { useState, useEffect } from 'react';
import { X, MessageCircle, UserX, UserCheck } from 'lucide-react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { getAvatarGradient, getInitial } from '../utils/avatar';

export default function UserProfileModal({ username, theme, onClose, onStartChat }) {
  const { onlineUsers } = useSocket();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const isDark = theme === 'dark';
  const myUsername = localStorage.getItem('username');
  const isSelf = username === myUsername;

  useEffect(() => {
    api.get(`/users/profile/${username}`).then((res) => setUser(res.data)).catch(() => {});
    api.get('/users/me').then((res) => setIsBlocked((res.data.blockedUsers || []).includes(username))).catch(() => {});
  }, [username]);

  const toggleBlock = async () => {
    setBlockLoading(true);
    try {
      if (isBlocked) {
        await api.post('/users/unblock', { username });
        setIsBlocked(false);
        showToast(`${username} blokdan chiqarildi`, 'success');
      } else {
        await api.post('/users/block', { username });
        setIsBlocked(true);
        showToast(`${username} bloklandi`, 'success');
      }
    } catch {
      showToast('Xatolik yuz berdi', 'error');
    } finally {
      setBlockLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="modal-overlay-anim" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div className="modal-card-anim" onClick={(e) => e.stopPropagation()} style={{ width: 340, background: isDark ? '#171717' : '#fff', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={onClose} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 26, fontWeight: 600, background: getAvatarGradient(user.username) }}>
                {getInitial(user.username)}
              </div>
            )}
            {onlineUsers.includes(user.username) && (
              <span className="pulse-online" style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: `2px solid ${isDark ? '#171717' : '#fff'}` }} />
            )}
          </div>
          <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 18, fontWeight: 600, margin: 0 }}>{user.username}</p>
          <p style={{ color: onlineUsers.includes(user.username) ? '#22c55e' : '#888', fontSize: 13, margin: '2px 0 0' }}>
            {onlineUsers.includes(user.username) ? 'online' : 'offline'}
          </p>
          {isBlocked && (
            <p style={{ color: '#ef4444', fontSize: 12, margin: '6px 0 0', fontWeight: 500 }}>Siz bu foydalanuvchini bloklagansiz</p>
          )}
        </div>

        {user.bio && (
          <div style={{ background: isDark ? '#262626' : '#f5f5f5', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Bio</p>
            <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{user.bio}</p>
          </div>
        )}

        <p style={{ color: '#888', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>
          A'zo bo'lgan: {new Date(user.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <button
          onClick={() => { onStartChat(user.username); onClose(); }}
          className="btn-primary"
          style={{ width: '100%', background: '#6366f1', border: 'none', padding: 12, borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <MessageCircle size={16} /> Xabar yuborish
        </button>

        {!isSelf && (
          <button
            onClick={toggleBlock}
            disabled={blockLoading}
            className="scale-tap"
            style={{
              width: '100%', marginTop: 10, background: 'transparent',
              border: `1px solid ${isBlocked ? '#22c55e' : '#ef4444'}`, padding: 11, borderRadius: 10,
              color: isBlocked ? '#22c55e' : '#ef4444', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {isBlocked ? <UserCheck size={16} /> : <UserX size={16} />}
            {isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
          </button>
        )}
      </div>
    </div>
  );
}
