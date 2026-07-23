import { useEffect, useState } from 'react';
import { Search, LogOut, MessageCircle, Sun, Moon, Plus, BellOff, Bookmark, Archive, ArchiveRestore, ChevronDown, ChevronRight, Pin, PinOff } from 'lucide-react';
import { getAvatarGradient, getInitial } from '../utils/avatar';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import CreateGroupModal from './CreateGroupModal';
import { useNavigate } from 'react-router-dom';
import { isMuted } from '../utils/mute';
import { isArchived, toggleArchive } from '../utils/archive';
import { isPinned, togglePinnedChat } from '../utils/pinnedChats';

export default function Sidebar({ username, onLogout, activeId, onSelect }) {
  const { theme, toggleTheme } = useTheme();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [myAvatar, setMyAvatar] = useState('');
  const [myBlockedUsers, setMyBlockedUsers] = useState([]);
  const [archiveVersion, setArchiveVersion] = useState(0);
  const [pinVersion, setPinVersion] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [msgResults, setMsgResults] = useState([]);
  const navigate = useNavigate();

  const loadConversations = () => {
    api.get('/conversations/mine').then((res) => setConversations(res.data)).catch(() => {});
  };

  useEffect(() => {
    loadConversations();
    api.get('/users').then((res) => setAllUsers(res.data)).catch(() => {});
    api.get('/users/me').then((res) => {
      setMyAvatar(res.data.avatar || '');
      setMyBlockedUsers(res.data.blockedUsers || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const refresh = () => loadConversations();
    socket.on('newMessage', refresh);
    socket.on('messagesSeen', refresh);
    socket.on('messageEdited', refresh);
    socket.on('messageDeleted', refresh);
    return () => {
      socket.off('newMessage', refresh);
      socket.off('messagesSeen', refresh);
      socket.off('messageEdited', refresh);
      socket.off('messageDeleted', refresh);
    };
  }, [socket]);

  useEffect(() => {
    const query = search.trim();
    const timer = setTimeout(() => {
      if (query.length < 2) {
        setMsgResults([]);
        return;
      }
      api.get('/conversations/search', { params: { q: query } })
        .then((res) => setMsgResults(res.data))
        .catch(() => setMsgResults([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectNewUser = async (targetUsername) => {
    const res = await api.post('/conversations/dm', { targetUsername });
    onSelect({ id: res.data._id, title: targetUsername, isGroup: false });
    loadConversations();
  };

  const handleGroupCreated = (convo) => {
    setShowCreateGroup(false);
    onSelect(convo);
    loadConversations();
  };

  const handleToggleArchive = (e, convoId) => {
    e.stopPropagation();
    toggleArchive(convoId);
    setArchiveVersion((v) => v + 1);
  };

  const handleTogglePin = (e, convoId) => {
    e.stopPropagation();
    togglePinnedChat(convoId);
    setPinVersion((v) => v + 1);
  };

  const handleOpenSearchResult = (result) => {
    onSelect({
      id: result.conversationId,
      title: result.conversationTitle,
      isGroup: result.isGroup,
      isSaved: result.isSaved
    });
    setSearch('');
  };

  const convoUsernames = new Set(conversations.filter((c) => !c.isGroup).map((c) => c.title));
  const otherUsers = allUsers.filter((u) => !convoUsernames.has(u.username) && !myBlockedUsers.includes(u.username));
  const filteredConvos = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOthers = otherUsers.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  // eslint-disable-next-line no-unused-vars
  const _archiveTick = archiveVersion;
  // eslint-disable-next-line no-unused-vars
  const _pinTick = pinVersion;
  const canArchive = (c) => !c.isSaved && c.id !== 'general';
  const canPin = (c) => !c.isSaved;
  const visibleConvos = filteredConvos
    .filter((c) => !canArchive(c) || !isArchived(c.id))
    .sort((a, b) => {
      if (a.isSaved) return -1;
      if (b.isSaved) return 1;
      const aPinned = canPin(a) && isPinned(a.id);
      const bPinned = canPin(b) && isPinned(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  const archivedConvos = filteredConvos.filter((c) => canArchive(c) && isArchived(c.id));

  const isDark = theme === 'dark';
  const showingSearchResults = search.trim().length >= 2;

  return (
    <div className="sidebar-panel theme-fade" style={{
      width: 340, height: '100%', display: 'flex', flexDirection: 'column',
      flexShrink: 0, background: isDark ? '#171717' : '#fff',
      borderRight: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`, position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <div onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          {myAvatar ? (
            <img src={myAvatar} alt="avatar" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, background: getAvatarGradient(username) }}>
              {getInitial(username)}
            </div>
          )}
          <div>
            <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, fontWeight: 600, margin: 0 }}>{username}</p>
            <p style={{ color: '#22c55e', fontSize: 12, margin: 0 }}>online</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowCreateGroup(true)} title="Yangi guruh" className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 6 }}>
            <Plus size={18} />
          </button>
          <button onClick={toggleTheme} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 6 }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onLogout} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 6 }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div style={{ padding: '0 12px 10px' }}>
        <div className="input-focus" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '9px 12px', background: isDark ? '#262626' : '#f5f5f5', border: '1px solid transparent' }}>
          <Search size={14} color="#888" />
          <input
            placeholder="Qidirish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: isDark ? '#fff' : '#171717', width: '100%' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visibleConvos.map((c) => (
          <ConvoRow
            key={c.id}
            active={activeId === c.id}
            onClick={() => onSelect({ id: c.id, title: c.title, isGroup: c.isGroup, members: c.members, admins: c.admins, isSaved: c.isSaved })}
            convo={c}
            username={username}
            online={!c.isGroup && onlineUsers.includes(c.title)}
            theme={theme}
            canArchive={canArchive(c)}
            onToggleArchive={handleToggleArchive}
            canPin={canPin(c)}
            onTogglePin={handleTogglePin}
          />
        ))}

        {archivedConvos.length > 0 && (
          <div>
            <div
              onClick={() => setShowArchived((v) => !v)}
              className="scale-tap"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', cursor: 'pointer', color: '#888' }}
            >
              {showArchived ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              <Archive size={15} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Arxiv ({archivedConvos.length})</span>
            </div>
            {showArchived && archivedConvos.map((c) => (
              <ConvoRow
                key={c.id}
                active={activeId === c.id}
                onClick={() => onSelect({ id: c.id, title: c.title, isGroup: c.isGroup, members: c.members, admins: c.admins, isSaved: c.isSaved })}
                convo={c}
                username={username}
                online={!c.isGroup && onlineUsers.includes(c.title)}
                theme={theme}
                canArchive={canArchive(c)}
                onToggleArchive={handleToggleArchive}
              />
            ))}
          </div>
        )}

        {showingSearchResults && msgResults.length > 0 && (
          <div>
            <p style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px 6px', margin: 0 }}>
              Xabarlarda topildi
            </p>
            {msgResults.map((r) => (
              <div
                key={r.messageId}
                onClick={() => handleOpenSearchResult(r)}
                className="convo-row scale-tap"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, background: r.isSaved ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : r.isGroup ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : getAvatarGradient(r.conversationTitle) }}>
                  {r.isSaved ? <Bookmark size={16} fill="white" /> : r.isGroup ? <MessageCircle size={17} /> : getInitial(r.conversationTitle)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 13, fontWeight: 600, margin: 0 }}>{r.conversationTitle}</p>
                  <p style={{ color: '#888', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.isGroup ? `${r.sender}: ` : ''}{r.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOthers.length > 0 && (
          <>
            <p style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px 6px', margin: 0 }}>
              Boshqa foydalanuvchilar
            </p>
            {filteredOthers.map((u) => (
              <UserRow
                key={u._id}
                onClick={() => handleSelectNewUser(u.username)}
                username={u.username}
                online={onlineUsers.includes(u.username)}
                theme={theme}
              />
            ))}
          </>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal theme={theme} onClose={() => setShowCreateGroup(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
}

function ConvoRow({ active, onClick, convo, username, online, theme, canArchive, onToggleArchive, canPin, onTogglePin }) {
  const isDark = theme === 'dark';
  const last = convo.lastMessage;
  let preview = "Hali xabar yo'q";
  if (last) {
    const prefix = last.sender === username ? 'Siz: ' : (convo.isGroup ? `${last.sender}: ` : '');
    preview = prefix + last.text;
  }
  const time = last ? new Date(last.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '';
  const archived = canArchive && isArchived(convo.id);
  const pinned = canPin && isPinned(convo.id);

  return (
    <div onClick={onClick} className="convo-row scale-tap slide-in-left" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', background: active ? (isDark ? '#262626' : '#f5f5f5') : (pinned ? (isDark ? '#1a1a2e' : '#f5f6ff') : 'transparent'), position: 'relative' }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, background: convo.isSaved ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : convo.isGroup ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : getAvatarGradient(convo.title) }}>
        {convo.isSaved ? <Bookmark size={19} fill="white" /> : convo.isGroup ? <MessageCircle size={20} /> : getInitial(convo.title)}
        {online && <span className="pulse-online" style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: `2px solid ${isDark ? '#171717' : '#fff'}` }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {pinned && <Pin size={11} color="#6366f1" fill="#6366f1" style={{ flexShrink: 0 }} />}
            <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.title}</p>
            {isMuted(convo.id) && <BellOff size={12} color="#888" style={{ flexShrink: 0 }} />}
          </div>
          <span style={{ color: '#888', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{time}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <p style={{ color: '#888', fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{preview}</p>
          {convo.unreadCount > 0 && (
            <span style={{ background: '#6366f1', color: 'white', fontSize: 11, fontWeight: 600, borderRadius: 10, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', marginLeft: 8, flexShrink: 0 }}>
              {convo.unreadCount}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        {canPin && (
          <span
            onClick={(e) => onTogglePin(e, convo.id)}
            className="icon-btn scale-tap"
            title={pinned ? 'Mahkamdan olish' : 'Ro\'yxat tepasiga mahkamlash'}
            style={{ padding: 5, display: 'flex', cursor: 'pointer', color: pinned ? '#6366f1' : '#888' }}
          >
            {pinned ? <PinOff size={15} /> : <Pin size={15} />}
          </span>
        )}
        {canArchive && (
          <span
            onClick={(e) => onToggleArchive(e, convo.id)}
            className="icon-btn scale-tap"
            title={archived ? 'Arxivdan chiqarish' : 'Arxivlash'}
            style={{ padding: 5, display: 'flex', cursor: 'pointer', color: '#888' }}
          >
            {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </span>
        )}
      </div>
    </div>
  );
}

function UserRow({ onClick, username, online, theme }) {
  const isDark = theme === 'dark';
  return (
    <div onClick={onClick} className="convo-row scale-tap slide-in-left" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, background: getAvatarGradient(username) }}>
        {getInitial(username)}
        {online && <span className="pulse-online" style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: `2px solid ${isDark ? '#171717' : '#fff'}` }} />}
      </div>
      <div>
        <p style={{ color: isDark ? '#fff' : '#171717', fontSize: 14, fontWeight: 500, margin: 0 }}>{username}</p>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>{online ? 'online' : 'offline'}</p>
      </div>
    </div>
  );
}
