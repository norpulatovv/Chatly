import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, Sun, Moon, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Xatolik yuz berdi');
      setShake(true);
      setTimeout(() => setShake(false), 420);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-fade" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', background: isDark ? '#0a0a0a' : '#fafafa',
      position: 'relative', overflow: 'hidden'
    }}>
      <div className="blob" style={{ width: 380, height: 380, top: -100, right: -100, background: '#8b5cf6', animation: 'floatBlob2 11s ease-in-out infinite' }} />
      <div className="blob" style={{ width: 320, height: 320, bottom: -100, left: -80, background: '#6366f1', animation: 'floatBlob1 13s ease-in-out infinite' }} />
      <div className="blob" style={{ width: 220, height: 220, top: 60, left: '15%', background: '#f59e0b', opacity: 0.12, animation: 'floatBlob2 15s ease-in-out infinite reverse' }} />

      <button
        onClick={toggleTheme}
        className="icon-btn scale-tap"
        style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 8, zIndex: 2 }}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className={`pop-in ${shake ? 'shake-anim' : ''}`} style={{
        width: 360, background: isDark ? 'rgba(23,23,23,0.85)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
        borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', zIndex: 2
      }}>
        <div className="pop-in" style={{
          width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
        }}>
          <MessageCircle color="white" size={28} />
        </div>

        <h1 style={{ color: isDark ? '#fff' : '#171717', fontSize: 21, fontWeight: 700, margin: 0, textAlign: 'center' }}>
          Hisob yaratish
        </h1>
        <p style={{ color: '#888', fontSize: 14, marginTop: 6, marginBottom: 24, textAlign: 'center' }}>
          Chatly'dan foydalanishni boshlang
        </p>

        {error && (
          <div className="slide-down" style={{
            width: '100%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: 13, borderRadius: 10, padding: '9px 12px', marginBottom: 16, boxSizing: 'border-box'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ width: '100%' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Username</label>
            <input
              className="input-focus"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12,
                background: isDark ? '#262626' : '#f5f5f5',
                border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
                color: isDark ? '#fff' : '#171717', fontSize: 14, outline: 'none'
              }}
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div style={{ width: '100%' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Parol</label>
            <input
              className="input-focus"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12,
                background: isDark ? '#262626' : '#f5f5f5',
                border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
                color: isDark ? '#fff' : '#171717', fontSize: 14, outline: 'none'
              }}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%', boxSizing: 'border-box', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', border: 'none',
              padding: '13px', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.75 : 1, marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading && <Loader2 size={16} className="spin-anim" />}
            {loading ? 'Yuklanmoqda...' : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <p style={{ color: '#888', fontSize: 13, marginTop: 20, textAlign: 'center' }}>
          Akkaunt bormi?{' '}
          <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
