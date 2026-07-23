import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

export default function Chat() {
  const location = useLocation();
  const joined = location.state?.joinedConversation;
  const [activeConv, setActiveConv] = useState(
    joined ? { id: joined.id, title: joined.title, isGroup: joined.isGroup, members: joined.members } : { id: 'general', title: 'Umumiy suhbat', isGroup: true }
  );
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  if (!localStorage.getItem('token')) {
    navigate('/login');
    return null;
  }

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        username={username}
        onLogout={logout}
        activeId={activeConv.id}
        onSelect={setActiveConv}
      />
      <ChatWindow
        conversation={activeConv}
        username={username}
        onSelectConversation={setActiveConv}
      />
    </div>
  );
}