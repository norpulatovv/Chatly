import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, MessageCircle, TriangleAlert } from 'lucide-react';
import api from '../api/axios';
import { useTheme } from '../context/ThemeContext';

export default function JoinGroup() {
  const { theme } = useTheme();
  const { code } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    api.get(`/conversations/join/${code}`)
      .then((res) => {
        setStatus('success');
        setTimeout(() => {
          navigate('/chat', { state: { joinedConversation: res.data } });
        }, 700);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.response?.data?.error || 'Guruhga qoshilib bolmadi');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', background: isDark ? '#0a0a0a' : '#fafafa', gap: 16
    }}>
      {status === 'loading' && (
        <>
          <Loader2 size={36} color="#6366f1" className="spin-anim" />
          <p style={{ color: '#888', fontSize: 14 }}>Guruhga qo'shilinmoqda...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="pop-in" style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle color="white" size={28} />
          </div>
          <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 15, fontWeight: 600 }}>Muvaffaqiyatli qo'shildingiz!</p>
        </>
      )}
      {status === 'error' && (
        <>
          <TriangleAlert size={36} color="#ef4444" />
          <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', maxWidth: 300 }}>{error}</p>
          <button
            onClick={() => navigate('/chat')}
            className="scale-tap"
            style={{ background: '#6366f1', border: 'none', padding: '10px 20px', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Chatga qaytish
          </button>
        </>
      )}
    </div>
  );
}
