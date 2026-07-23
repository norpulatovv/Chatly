import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import api from '../api/axios';
import { getAvatarGradient, getInitial } from '../utils/avatar';

export default function CreateGroupModal({ theme, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    api.get('/users').then((res) => setAllUsers(res.data)).catch(() => {});
  }, []);

  const toggleUser = (username) => {
    setSelected((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) return setError('Guruh nomini kiriting');
    if (selected.length === 0) return setError("Kamida 1 a'zo tanlang");
    setLoading(true);
    try {
      const res = await api.post('/conversations/group', { name, members: selected });
      onCreated({ id: res.data._id, title: res.data.name, isGroup: true, members: res.data.members, admins: res.data.admins });
    } catch (err) {
      setError(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-anim" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100
    }}>
      <div className="modal-card-anim" onClick={(e) => e.stopPropagation()} style={{
        width: 380, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        background: isDark ? '#171717' : '#fff', borderRadius: 16, padding: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} color="#6366f1" />
            <h2 style={{ color: isDark ? '#fff' : '#171717', fontSize: 16, fontWeight: 600, margin: 0 }}>
              Yangi guruh
            </h2>
          </div>
          <button onClick={onClose} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="shake-anim" style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: 13, borderRadius: 8, padding: '8px 12px', marginBottom: 12
          }}>
            {error}
          </div>
        )}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Guruh nomi"
          className="input-focus"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10,
            background: isDark ? '#262626' : '#f5f5f5', border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
            color: isDark ? '#fff' : '#171717', fontSize: 14, outline: 'none', marginBottom: 14
          }}
        />

        <p style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>
          A'zolarni tanlang ({selected.length})
        </p>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          {allUsers.map((u) => {
            const isSelected = selected.includes(u.username);
            return (
              <div
                key={u._id}
                onClick={() => toggleUser(u.username)}
                className="scale-tap"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px',
                  cursor: 'pointer', borderRadius: 8,
                  background: isSelected ? (isDark ? '#262626' : '#f0f0f0') : 'transparent'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', fontWeight: 600, background: getAvatarGradient(u.username)
                }}>
                  {getInitial(u.username)}
                </div>
                <p style={{ flex: 1, color: isDark ? '#fff' : '#171717', fontSize: 14, margin: 0 }}>{u.username}</p>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isSelected ? '#6366f1' : '#888'}`,
                  background: isSelected ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn-primary"
          style={{
            width: '100%', background: '#6366f1', border: 'none', padding: '12px', borderRadius: 10,
            color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Yaratilmoqda...' : 'Guruh yaratish'}
        </button>
      </div>
    </div>
  );
}