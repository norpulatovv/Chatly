import { useState, useEffect } from 'react';
import { X, UserPlus, Crown, UserMinus, ShieldCheck, ShieldOff, Link2, Copy, Check } from 'lucide-react';
import { getAvatarGradient, getInitial } from '../utils/avatar';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';

export default function GroupInfoPanel({ conversation, username, theme, onClose }) {
  const { onlineUsers } = useSocket();
  const { showToast } = useToast();
  const isDark = theme === 'dark';
  const [members, setMembers] = useState(conversation.members || []);
  const [admins, setAdmins] = useState(conversation.admins || []);
  const [allUsers, setAllUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/users').then((res) => setAllUsers(res.data)).catch(() => {});
  }, []);

  const isAdmin = admins.includes(username);
  const nonMembers = allUsers.filter((u) => !members.includes(u.username));

  const addMember = async (targetUsername) => {
    try {
      const res = await api.post(`/conversations/${conversation.id}/members`, { username: targetUsername });
      setMembers(res.data.members);
      setAdmins(res.data.admins || []);
      setShowAdd(false);
    } catch (err) {
      showToast(err.response?.data?.error || "Qo'shishda xatolik", 'error');
    }
  };

  const kickMember = async (targetUsername) => {
    try {
      const res = await api.post(`/conversations/${conversation.id}/kick`, { username: targetUsername });
      setMembers(res.data.members);
      setAdmins(res.data.admins || []);
      showToast(`${targetUsername} guruhdan chiqarildi`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Xatolik', 'error');
    }
  };

  const promoteMember = async (targetUsername) => {
    try {
      const res = await api.post(`/conversations/${conversation.id}/promote`, { username: targetUsername });
      setAdmins(res.data.admins || []);
      showToast(`${targetUsername} admin qilindi`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Xatolik', 'error');
    }
  };

  const demoteMember = async (targetUsername) => {
    try {
      const res = await api.post(`/conversations/${conversation.id}/demote`, { username: targetUsername });
      setAdmins(res.data.admins || []);
      showToast(`${targetUsername}dan admin huquqi olindi`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Xatolik', 'error');
    }
  };

  const generateInvite = async () => {
    setLoadingInvite(true);
    try {
      const res = await api.post(`/conversations/${conversation.id}/invite`);
      setInviteCode(res.data.inviteCode);
    } catch {
      showToast('Havola yaratishda xatolik', 'error');
    } finally {
      setLoadingInvite(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      showToast('Havola nusxalandi', 'success');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="slide-in-panel" style={{
      width: 320, height: '100%', flexShrink: 0,
      background: isDark ? '#171717' : '#fff',
      borderLeft: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottom: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`
      }}>
        <p style={{ color: isDark ? '#fff' : '#171717', fontWeight: 600, fontSize: 15, margin: 0 }}>
          Guruh haqida
        </p>
        <button onClick={onClose} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{
        padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
        borderBottom: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 600,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', marginBottom: 10
        }}>
          {conversation.title.charAt(0).toUpperCase()}
        </div>
        <p style={{ color: isDark ? '#fff' : '#171717', fontWeight: 600, fontSize: 16, margin: 0 }}>
          {conversation.title}
        </p>
        <p style={{ color: '#888', fontSize: 13, margin: '2px 0 0' }}>{members.length} a'zo</p>
      </div>

      {isAdmin && (
        <div style={{ padding: 16, borderBottom: `1px solid ${isDark ? '#262626' : '#e5e5e5'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Link2 size={14} color="#6366f1" />
            <p style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
              Taklif havolasi
            </p>
          </div>
          {inviteCode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, background: isDark ? '#262626' : '#f5f5f5', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: isDark ? '#fff' : '#171717', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {window.location.origin}/join/{inviteCode}
              </div>
              <button onClick={copyInviteLink} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22c55e' : '#6366f1', flexShrink: 0 }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          ) : (
            <button
              onClick={generateInvite}
              disabled={loadingInvite}
              className="scale-tap"
              style={{ width: '100%', background: 'rgba(99,102,241,0.12)', border: 'none', borderRadius: 8, padding: '9px 12px', color: '#6366f1', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              {loadingInvite ? 'Yaratilmoqda...' : 'Havola yaratish'}
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px' }}>
          <p style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
            A'zolar
          </p>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="scale-tap"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
            }}
          >
            <UserPlus size={14} /> Qo'shish
          </button>
        </div>

        {showAdd && (
          <div style={{ padding: '4px 16px 10px' }}>
            {nonMembers.length === 0 && (
              <p style={{ color: '#888', fontSize: 13 }}>Qo'shish uchun foydalanuvchi yo'q</p>
            )}
            {nonMembers.map((u) => (
              <div
                key={u._id}
                onClick={() => addMember(u.username)}
                className="scale-tap"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 600,
                  background: getAvatarGradient(u.username)
                }}>
                  {getInitial(u.username)}
                </div>
                <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 13, margin: 0 }}>{u.username}</p>
              </div>
            ))}
          </div>
        )}

        {members.map((m) => {
          const memberIsAdmin = admins.includes(m);
          return (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', position: 'relative', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600,
                background: getAvatarGradient(m)
              }}>
                {getInitial(m)}
                {onlineUsers.includes(m) && (
                  <span style={{
                    position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%',
                    background: '#22c55e', border: `2px solid ${isDark ? '#171717' : '#fff'}`
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, fontWeight: 500, margin: 0 }}>{m}</p>
                  {memberIsAdmin && <Crown size={13} color="#fbbf24" />}
                </div>
                <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
                  {onlineUsers.includes(m) ? 'online' : 'offline'}
                </p>
              </div>
              {isAdmin && m !== username && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {memberIsAdmin ? (
                    <span onClick={() => demoteMember(m)} className="icon-btn scale-tap" title="Admin huquqini olish" style={{ padding: 6, display: 'flex', cursor: 'pointer', color: '#888' }}>
                      <ShieldOff size={15} />
                    </span>
                  ) : (
                    <span onClick={() => promoteMember(m)} className="icon-btn scale-tap" title="Admin qilish" style={{ padding: 6, display: 'flex', cursor: 'pointer', color: '#888' }}>
                      <ShieldCheck size={15} />
                    </span>
                  )}
                  <span onClick={() => kickMember(m)} className="icon-btn scale-tap" title="Guruhdan chiqarish" style={{ padding: 6, display: 'flex', cursor: 'pointer', color: '#ef4444' }}>
                    <UserMinus size={15} />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
