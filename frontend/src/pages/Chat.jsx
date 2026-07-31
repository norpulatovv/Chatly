import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

const MOBILE_BREAKPOINT = 768;

export default function Chat() {
  const location = useLocation();
  const joined = location.state?.joinedConversation;
  const [activeConv, setActiveConv] = useState(
    joined ? { id: joined.id, title: joined.title, isGroup: joined.isGroup, members: joined.members } : { id: 'general', title: 'Umumiy suhbat', isGroup: true }
  );
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  // On mobile, controls which panel is visible: chat list or the open conversation.
  // On desktop this is ignored (both panels always render side by side).
  const [mobileShowChat, setMobileShowChat] = useState(!!joined);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!localStorage.getItem('token')) {
    navigate('/login');
    return null;
  }

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSelectConversation = (conv) => {
    setActiveConv(conv);
    if (isMobile) setMobileShowChat(true);
  };

  const handleBackToList = () => setMobileShowChat(false);

  const showSidebar = !isMobile || !mobileShowChat;
  const showChatWindow = !isMobile || mobileShowChat;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {showSidebar && (
        <Sidebar
          username={username}
          onLogout={logout}
          activeId={activeConv.id}
          onSelect={handleSelectConversation}
          isMobile={isMobile}
        />
      )}
      {showChatWindow && (
        <ChatWindow
          conversation={activeConv}
          username={username}
          onSelectConversation={handleSelectConversation}
          onBack={isMobile ? handleBackToList : undefined}
        />
      )}
    </div>
  );
}