import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Lock, Trash2, ShieldAlert, X } from 'lucide-react';
import api from '../api/axios';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { getAvatarGradient, getInitial } from '../utils/avatar';

export default function Profile() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    api.get('/users/me').then((res) => {
      setUser(res.data);
      setBio(res.data.bio || '');
    }).catch(() => navigate('/login'));
  }, [navigate]);

  const handleSaveBio = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/me', { bio });
      setUser(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (saveError) {
      console.error(saveError);
      showToast('Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/me/avatar', formData);
      setUser(res.data);
    } catch (avatarError) {
      console.error(avatarError);
      showToast('Rasm yuklashda xatolik', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast("Ikkala maydonni ham to'ldiring", 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Parol muvaffaqiyatli o\'zgartirildi', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Parolni o\'zgartirishda xatolik', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      navigate('/login');
    } catch (err) {
      console.error(err);
      showToast("Hisobni o'chirishda xatolik", 'error');
      setDeleting(false);
    }
  };

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: isDark ? '#0a0a0a' : '#fafafa' }}>
      <p style={{ color: '#888' }}>Yuklanmoqda...</p>
    </div>
  );

  const cardStyle = { background: isDark ? '#171717' : '#fff', border: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`, borderRadius: 14, padding: 20, marginBottom: 16 };
  const inputStyle = { width: '100%', boxSizing: 'border-box', background: isDark ? '#262626' : '#f5f5f5', border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`, borderRadius: 10, color: isDark ? '#fff' : '#171717', fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#0a0a0a' : '#fafafa', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: isDark ? '#171717' : '#fff', borderBottom: `1px solid ${isDark ? '#262626' : '#e5e5e5'}` }}>
        <button onClick={() => navigate('/chat')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={18} /> Orqaga
        </button>
        <p style={{ color: isDark ? '#fff' : '#171717', fontWeight: 600, fontSize: 16, margin: 0 }}>Profil</p>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 32, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, fontWeight: 600, background: getAvatarGradient(user.username) }}>
                  {getInitial(user.username)}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="scale-tap"
                style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: '#6366f1', border: '2px solid', borderColor: isDark ? '#0a0a0a' : '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Camera size={14} color="white" />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 20, fontWeight: 600, margin: 0 }}>{user.username}</p>
            {uploading && <p style={{ color: '#888', fontSize: 12, margin: '4px 0 0' }}>Rasm yuklanmoqda...</p>}
          </div>

          <div style={cardStyle}>
            <label style={{ display: 'block', color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="O'zingiz haqida yozing..."
              maxLength={200}
              rows={3}
              className="input-focus"
              style={{ ...inputStyle, resize: 'none' }}
            />
            <p style={{ color: '#888', fontSize: 11, margin: '4px 0 0', textAlign: 'right' }}>{bio.length}/200</p>
            <button
              onClick={handleSaveBio}
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', background: saved ? '#22c55e' : '#6366f1', border: 'none', padding: 12, borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}
            >
              <Save size={16} />
              {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi ✓' : 'Saqlash'}
            </button>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Lock size={15} color="#6366f1" />
              <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, fontWeight: 600, margin: 0 }}>Parolni o'zgartirish</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Joriy parol"
                className="input-focus"
                style={inputStyle}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yangi parol"
                className="input-focus"
                style={inputStyle}
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="btn-primary"
                style={{ width: '100%', background: '#6366f1', border: 'none', padding: 12, borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                {changingPassword ? 'Yangilanmoqda...' : "Parolni yangilash"}
              </button>
            </div>
          </div>

          <div style={{ ...cardStyle, border: `1px solid ${isDark ? '#3f1d1d' : '#fecaca'}`, background: isDark ? '#1a1010' : '#fef2f2', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ShieldAlert size={15} color="#ef4444" />
              <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, margin: 0 }}>Xavfli zona</p>
            </div>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>
              Hisobingizni o'chirsangiz, bu amalni ortga qaytarib bo'lmaydi.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="scale-tap"
              style={{ width: '100%', background: 'transparent', border: '1px solid #ef4444', padding: 11, borderRadius: 10, color: '#ef4444', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Trash2 size={15} />
              Hisobni o'chirish
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="modal-overlay-anim"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
        >
          <div
            className="modal-card-anim"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 340, background: isDark ? '#171717' : '#fff', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 16, fontWeight: 600, margin: 0 }}>Rostdan ham o'chirasizmi?</p>
              <button onClick={() => setShowDeleteConfirm(false)} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
              Hisobingiz butunlay o'chib ketadi va bu amalni qaytarib bo'lmaydi.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="scale-tap"
                style={{ flex: 1, background: isDark ? '#262626' : '#f0f0f0', border: 'none', padding: 11, borderRadius: 10, color: isDark ? '#fff' : '#171717', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="scale-tap"
                style={{ flex: 1, background: '#ef4444', border: 'none', padding: 11, borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
