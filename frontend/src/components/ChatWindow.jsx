import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useCall } from '../context/CallContext';
import { getAvatarColor, getAvatarGradient, getInitial } from '../utils/avatar';
import { playMessageSound, playSendSound } from '../utils/sound';
import { formatMessageText } from '../utils/formatMessageText';
import {
  Send, Paperclip, Smile, Phone, Video, MoreVertical,
  CheckCheck, Check, Pencil, Trash2, X, MessageCircle,
  FileText, Download, Reply, SmilePlus, Pin, PinOff, Search, Mic,
  ArrowDown, Forward, Copy, ZoomIn, Bell, BellOff, CheckSquare, CircleCheck,
  Palette, Bookmark, Clock, UserX, Loader2, ArrowUp
} from 'lucide-react';
import EmojiPicker from '../utils/EmojiPicker';
import AudioMessage from './AudioMessage';
import GroupInfoPanel from '../components/GroupInfoPanel';
import ReactionPicker from '../components/ReactionPicker';
import VoiceRecorder from '../components/VoiceRecorder';
import ForwardModal from '../components/ForwardModal';
import LinkPreviewCard from './LinkPreviewCard';
import SeenByModal from './SeenByModal';
import UserProfileModal from '../pages/UserProfileModal';
import { isMuted, toggleMute } from '../utils/mute';
import { getDraft, setDraft } from '../utils/drafts';
import { getWallpaper, setWallpaper as saveWallpaper, WALLPAPER_PRESETS } from '../utils/wallpaper';

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
];

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Bugun';
  if (sameDay(date, yesterday)) return 'Kecha';
  return `${date.getDate()} ${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function previewOf(msg) {
  if (!msg) return '';
  if (msg.deleted) return "Xabar o'chirildi";
  if (msg.fileType === 'audio') return '🎤 Ovozli xabar';
  if (msg.fileUrl) return msg.fileType === 'image' ? '📷 Rasm' : '📎 Fayl';
  return msg.text;
}

function groupReactions(reactions) {
  const map = {};
  (reactions || []).forEach((r) => {
    if (!map[r.emoji]) map[r.emoji] = [];
    map[r.emoji].push(r.username);
  });
  return map;
}

export default function ChatWindow({ conversation, username, onSelectConversation }) {
  const { theme } = useTheme();
  const { socket, onlineUsers } = useSocket();
  const { showToast } = useToast();
  const { startCall } = useCall();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [reactionPickerId, setReactionPickerId] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sendAnim, setSendAnim] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkForwardOpen, setBulkForwardOpen] = useState(false);
  const [wallpaper, setWallpaperState] = useState(null);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [allGroupUsernames, setAllGroupUsernames] = useState([]);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const [deleteChoiceTarget, setDeleteChoiceTarget] = useState(null); // message object | 'bulk' | null
  const [seenByModalMsg, setSeenByModalMsg] = useState(null);
  const [myBlockedUsers, setMyBlockedUsers] = useState([]);

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    api.get('/users').then((res) => setAllGroupUsernames(res.data.map((u) => u.username))).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/users/me').then((res) => setMyBlockedUsers(res.data.blockedUsers || [])).catch(() => {});
  }, [conversation.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    setEditingId(null);
    setReplyingTo(null);
    setText(getDraft(conversation.id));
    setShowEmoji(false);
    setShowGroupInfo(false);
    setShowSearch(false);
    setSearchQuery('');
    setShowVoice(false);
    setShowScrollBtn(false);
    setMuted(isMuted(conversation.id));
    setSelectMode(false);
    setSelectedIds(new Set());
    setWallpaperState(getWallpaper(conversation.id));
    setShowWallpaperPicker(false);
    setMentionQuery(null);
    setMentionSuggestions([]);
    setShowSchedulePicker(false);
    setScheduleDateTime('');
    setHasMoreOlder(false);
    setFirstUnreadId(null);
    setDeleteChoiceTarget(null);
    setSeenByModalMsg(null);

    socket.emit('joinConversation', conversation.id);
    api.get(`/conversations/${conversation.id}/messages`).then((res) => {
      const { messages: msgs, hasMore } = res.data;
      setMessages(msgs);
      setHasMoreOlder(!!hasMore);
      const firstUnseen = msgs.find((m) => m.sender !== username && !(m.seenBy || []).includes(username));
      setFirstUnreadId(firstUnseen ? firstUnseen._id : null);
    }).catch(() => {});
    socket.emit('markSeen', { conversationId: conversation.id, username });

    const handleNew = (msg) => {
      if (msg.conversationId !== conversation.id) return;
      setMessages((prev) => [...prev, msg]);
      if (msg.sender !== username) {
        socket.emit('markSeen', { conversationId: conversation.id, username });
        if (!isMuted(conversation.id)) playMessageSound();
      }
    };

    const updateOne = (msg) => {
      if (msg.conversationId !== conversation.id) return;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handleTyping = (sender) => {
      if (sender === username) return;
      setTypingUser(sender);
      setTimeout(() => setTypingUser(''), 2000);
    };

    const handleSeen = ({ conversationId, username: seenBy }) => {
      if (conversationId !== conversation.id) return;
      setMessages((prev) =>
        prev.map((m) => m.seenBy?.includes(seenBy) ? m : { ...m, seenBy: [...(m.seenBy || []), seenBy] })
      );
    };

    const handlePinned = (msg) => {
      if (msg.conversationId !== conversation.id) return;
      setMessages((prev) => prev.map((m) => ({ ...m, pinned: m._id === msg._id ? msg.pinned : false })));
    };

    const handleScheduled = (msg) => {
      if (msg.conversationId !== conversation.id) return;
      showToast('Xabar rejalashtirildi', 'success');
    };

    const handleDeletedForMe = ({ messageId, conversationId }) => {
      if (conversationId !== conversation.id) return;
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    const handleBlocked = ({ conversationId }) => {
      if (conversationId !== conversation.id) return;
      showToast("Xabar yetkazilmadi \u2014 sizni bloklashgan", 'error');
    };

    socket.on('newMessage', handleNew);
    socket.on('messageEdited', updateOne);
    socket.on('messageDeleted', updateOne);
    socket.on('messageReacted', updateOne);
    socket.on('userTyping', handleTyping);
    socket.on('messagesSeen', handleSeen);
    socket.on('messagePinned', handlePinned);
    socket.on('messageScheduled', handleScheduled);
    socket.on('messageDeletedForMe', handleDeletedForMe);
    socket.on('messageBlocked', handleBlocked);

    return () => {
      socket.off('newMessage', handleNew);
      socket.off('messageEdited', updateOne);
      socket.off('messageDeleted', updateOne);
      socket.off('messageReacted', updateOne);
      socket.off('userTyping', handleTyping);
      socket.off('messagesSeen', handleSeen);
      socket.off('messagePinned', handlePinned);
      socket.off('messageScheduled', handleScheduled);
      socket.off('messageDeletedForMe', handleDeletedForMe);
      socket.off('messageBlocked', handleBlocked);
    };
  }, [conversation.id, socket, username, showToast]);

  useEffect(() => {
    if (!showSearch && !showScrollBtn) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showSearch, showScrollBtn]);

  useEffect(() => {
    setDraft(conversation.id, text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const container = scrollContainerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;
    try {
      const res = await api.get(`/conversations/${conversation.id}/messages`, {
        params: { before: oldest.createdAt, limit: 40 }
      });
      const { messages: older, hasMore } = res.data;
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
      setHasMoreOlder(!!hasMore);
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight + container.scrollTop;
        }
      });
    } catch {
      showToast('Eski xabarlarni yuklashda xatolik', 'error');
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 200);
    if (el.scrollTop < 120) loadOlderMessages();
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const sendMessage = () => {
    if (!text.trim()) return;
    if (editingId) {
      socket.emit('editMessage', { messageId: editingId, newText: text.trim(), username });
      setEditingId(null);
    } else {
      socket.emit('sendMessage', {
        conversationId: conversation.id,
        sender: username,
        text: text.trim(),
        replyTo: replyingTo
          ? { messageId: replyingTo._id, sender: replyingTo.sender, text: previewOf(replyingTo) }
          : undefined
      });
      setReplyingTo(null);
      setSendAnim(true);
      setTimeout(() => setSendAnim(false), 350);
      playSendSound();
      setDraft(conversation.id, '');
    }
    setText('');
  };

  const scheduleMessage = () => {
    if (!text.trim() || !scheduleDateTime) return;
    const when = new Date(scheduleDateTime);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      showToast("Vaqt kelajakda bo'lishi kerak", 'error');
      return;
    }
    socket.emit('scheduleMessage', {
      conversationId: conversation.id,
      sender: username,
      text: text.trim(),
      scheduledFor: when.toISOString()
    });
    setText('');
    setDraft(conversation.id, '');
    setScheduleDateTime('');
    setShowSchedulePicker(false);
  };

  const startEdit = (msg) => { setReplyingTo(null); setEditingId(msg._id); setText(msg.text); };
  const cancelEdit = () => { setEditingId(null); setText(''); };
  const startReply = (msg) => { setEditingId(null); setReplyingTo(msg); };
  const cancelReply = () => setReplyingTo(null);
  const handleTypingInput = (e) => {
    const value = e.target.value;
    setText(value);
    socket.emit('typing', { conversationId: conversation.id, sender: username });

    if (!conversation.isGroup) { setMentionQuery(null); return; }

    const cursorPos = e.target.selectionStart;
    const upToCursor = value.slice(0, cursorPos);
    const match = upToCursor.match(/(^|\s)@([a-zA-Z0-9_]*)$/);
    if (match) {
      const query = match[2].toLowerCase();
      setMentionQuery(query);
      const pool = conversation.members && conversation.members.length ? conversation.members : allGroupUsernames;
      const suggestions = pool.filter((u) => u !== username && u.toLowerCase().includes(query)).slice(0, 6);
      setMentionSuggestions(suggestions);
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const applyMention = (mentionUsername) => {
    const cursorPos = textInputRef.current?.selectionStart ?? text.length;
    const upToCursor = text.slice(0, cursorPos);
    const rest = text.slice(cursorPos);
    const replaced = upToCursor.replace(/(^|\s)@([a-zA-Z0-9_]*)$/, `$1@${mentionUsername} `);
    const newText = replaced + rest;
    setText(newText);
    setMentionQuery(null);
    setMentionSuggestions([]);
    setTimeout(() => textInputRef.current?.focus(), 0);
  };
  const handleEmojiSelect = (emoji) => setText((prev) => prev + emoji);
  const handleReact = (messageId, emoji) => { socket.emit('reactToMessage', { messageId, emoji, username }); setReactionPickerId(null); };
  const togglePin = (messageId) => socket.emit('togglePin', { messageId });

  const handleToggleMute = () => {
    const nowMuted = toggleMute(conversation.id);
    setMuted(nowMuted);
    showToast(nowMuted ? 'Suhbat ovozsiz qilindi' : 'Ovoz yoqildi', 'info');
  };

  const enterSelectMode = (messageId) => {
    setSelectMode(true);
    setSelectedIds(new Set([messageId]));
  };

  const toggleSelectMsg = (messageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const deleteForMe = (messageId) => {
    socket.emit('deleteMessageForMe', { messageId, username });
  };

  const confirmDeleteEveryone = () => {
    if (deleteChoiceTarget === 'bulk') {
      selectedIds.forEach((id) => socket.emit('deleteMessage', { messageId: id, username }));
      showToast(`${selectedIds.size} ta xabar hammaga o'chirildi`, 'success');
      cancelSelectMode();
    } else if (deleteChoiceTarget) {
      socket.emit('deleteMessage', { messageId: deleteChoiceTarget._id, username });
    }
    setDeleteChoiceTarget(null);
  };

  const confirmDeleteForMeOnly = () => {
    if (deleteChoiceTarget === 'bulk') {
      selectedIds.forEach((id) => deleteForMe(id));
      showToast(`${selectedIds.size} ta xabar sizda o'chirildi`, 'success');
      cancelSelectMode();
    } else if (deleteChoiceTarget) {
      deleteForMe(deleteChoiceTarget._id);
    }
    setDeleteChoiceTarget(null);
  };

  const handleBulkForward = (targetConvo) => {
    const toSend = messages.filter((m) => selectedIds.has(m._id) && !m.deleted);
    toSend.forEach((m) => {
      socket.emit('sendMessage', {
        conversationId: targetConvo.id,
        sender: username,
        text: m.text || '',
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        fileType: m.fileType
      });
    });
    setBulkForwardOpen(false);
    showToast(`${toSend.length} ta xabar "${targetConvo.title}"ga yuborildi`, 'success');
    cancelSelectMode();
  };

  const copyText = (msgText) => {
    navigator.clipboard.writeText(msgText || '').then(() => showToast('Nusxalandi', 'success')).catch(() => {});
  };

  const handleForward = (targetConvo) => {
    if (!forwardingMsg) return;
    socket.emit('sendMessage', {
      conversationId: targetConvo.id,
      sender: username,
      text: forwardingMsg.text || '',
      fileUrl: forwardingMsg.fileUrl,
      fileName: forwardingMsg.fileName,
      fileType: forwardingMsg.fileType
    });
    setForwardingMsg(null);
    showToast(`"${targetConvo.title}"ga yuborildi`, 'success');
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData);
      socket.emit('sendMessage', { conversationId: conversation.id, sender: username, text: '', fileUrl: res.data.url, fileName: res.data.fileName, fileType: res.data.fileType });
    } catch (err) {
      console.error(err);
      showToast('Fayl yuborishda xatolik', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => uploadFile(e.target.files[0]);

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadFile(file);
        return;
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleVoiceSend = async (audioBlob) => {
    setShowVoice(false);
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.webm');
    try {
      const res = await api.post('/upload', formData);
      socket.emit('sendMessage', { conversationId: conversation.id, sender: username, text: '', fileUrl: res.data.url, fileName: 'Ovozli xabar', fileType: 'audio' });
    } catch (err) {
      console.error(err);
      showToast('Ovozli xabar yuborilmadi', 'error');
    }
  };

  const handleCall = (type) => {
    if (conversation.isGroup) {
      showToast("Guruhda qo'ng'iroq hali qo'llab-quvvatlanmaydi", 'info');
      return;
    }
    startCall(conversation.title, type, conversation.id);
  };

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafafa';
  const panelBg = isDark ? '#171717' : '#fff';
  const border = isDark ? '#262626' : '#e5e5e5';
  const textColor = isDark ? '#fff' : '#171717';
  const bubbleOther = isDark ? '#262626' : '#f0f0f0';

  const isBlockedPeer = !conversation.isGroup && !conversation.isSaved && myBlockedUsers.includes(conversation.title);

  let statusLine;
  if (conversation.isSaved) statusLine = 'shaxsiy xabarlar';
  else if (typingUser) statusLine = 'typing';
  else if (conversation.isGroup) statusLine = conversation.members?.length ? `${conversation.members.length} a'zo` : 'online';
  else statusLine = onlineUsers.includes(conversation.title) ? 'online' : 'offline';

  const canOpenGroupInfo = conversation.isGroup && conversation.id !== 'general';
  const pinnedMsg = messages.find((m) => m.pinned && !m.deleted);
  const visibleMessages = showSearch && searchQuery.trim()
    ? messages.filter((m) => !m.deleted && m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const dateSeparators = (() => {
    const flags = [];
    let last = null;
    for (const m of visibleMessages) {
      const label = formatDateLabel(m.createdAt);
      flags.push(!showSearch && label !== last);
      last = label;
    }
    return flags;
  })();

  const unreadDividerIndex = !showSearch && firstUnreadId
    ? visibleMessages.findIndex((m) => m._id === firstUnreadId)
    : -1;

  const canBulkDeleteEveryone = selectedIds.size > 0 && Array.from(selectedIds).every((id) => {
    const m = messages.find((x) => x._id === id);
    return m && m.sender === username;
  });

  return (
    <>
      <div
        className="chat-panel theme-fade"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', background: wallpaper || bg, position: 'relative', overflow: 'hidden' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="modal-overlay-anim" style={{
            position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.15)', backdropFilter: 'blur(2px)',
            border: '2px dashed #6366f1', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8, pointerEvents: 'none'
          }}>
            <Paperclip size={32} color="#6366f1" />
            <p style={{ color: '#6366f1', fontWeight: 600 }}>Faylni shu yerga tashlang</p>
          </div>
        )}

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: `1px solid ${border}`, background: panelBg, flexShrink: 0 }}>
          {selectMode ? (
            <div className="slide-down" style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={cancelSelectMode} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                  <X size={20} />
                </button>
                <p style={{ color: textColor, fontSize: 15, fontWeight: 600, margin: 0 }}>{selectedIds.size} ta tanlandi</p>
              </div>
              <div style={{ display: 'flex', gap: 4, color: '#888' }}>
                <span className="icon-btn scale-tap" style={{ padding: 8, display: 'flex', cursor: 'pointer' }} onClick={() => setBulkForwardOpen(true)}>
                  <Forward size={19} />
                </span>
                <span className="icon-btn scale-tap" style={{ padding: 8, display: 'flex', cursor: 'pointer', color: '#ef4444' }} onClick={() => setDeleteChoiceTarget('bulk')}>
                  <Trash2 size={19} />
                </span>
              </div>
            </div>
          ) : (
            <>
              <div onClick={() => canOpenGroupInfo && setShowGroupInfo(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: canOpenGroupInfo ? 'pointer' : 'default' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, background: conversation.isSaved ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : conversation.isGroup ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : getAvatarGradient(conversation.title) }}>
                  {conversation.isSaved ? <Bookmark size={17} fill="white" /> : conversation.isGroup ? <MessageCircle size={18} /> : getInitial(conversation.title)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ color: textColor, fontSize: 14, fontWeight: 600, margin: 0 }}>{conversation.title}</p>
                    {muted && <BellOff size={13} color="#888" />}
                    {isBlockedPeer && <UserX size={13} color="#ef4444" />}
                  </div>
                  {statusLine === 'typing' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6366f1', fontSize: 12 }}>
                      <span>{typingUser} yozmoqda</span>
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  ) : (
                    <p style={{ color: statusLine === 'online' ? '#22c55e' : '#888', fontSize: 12, margin: 0 }}>{statusLine}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#888' }}>
                <span className="icon-btn scale-tap" style={{ padding: 7, display: 'flex', cursor: 'pointer', color: showSearch ? '#6366f1' : '#888' }} onClick={() => setShowSearch((v) => !v)}>
                  <Search size={18} />
                </span>
                {!conversation.isSaved && (
                  <>
                    <span className="icon-btn scale-tap" style={{ padding: 7, display: 'flex', cursor: 'pointer' }} onClick={() => handleCall('audio')}>
                      <Phone size={18} />
                    </span>
                    <span className="icon-btn scale-tap" style={{ padding: 7, display: 'flex', cursor: 'pointer' }} onClick={() => handleCall('video')}>
                      <Video size={18} />
                    </span>
                    <span className="icon-btn scale-tap" style={{ padding: 7, display: 'flex', cursor: 'pointer', color: muted ? '#6366f1' : '#888' }} onClick={handleToggleMute} title={muted ? 'Ovozni yoqish' : 'Ovozsiz qilish'}>
                      {muted ? <BellOff size={18} /> : <Bell size={18} />}
                    </span>
                  </>
                )}
                <span className="icon-btn scale-tap" style={{ padding: 7, display: 'flex', cursor: 'pointer', color: showWallpaperPicker ? '#6366f1' : '#888' }} onClick={() => setShowWallpaperPicker((v) => !v)} title="Chat foni">
                  <Palette size={18} />
                </span>
                <span className="icon-btn scale-tap" style={{ padding: 7, display: 'flex', cursor: 'pointer' }}>
                  <MoreVertical size={18} />
                </span>
              </div>
            </>
          )}
        </div>

        {/* WALLPAPER PICKER */}
        {showWallpaperPicker && (
          <div className="slide-down" style={{ padding: '12px 24px', borderBottom: `1px solid ${border}`, background: panelBg, flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center', overflowX: 'auto' }}>
            {WALLPAPER_PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => { saveWallpaper(conversation.id, preset.value); setWallpaperState(preset.value); }}
                className="scale-tap"
                title={preset.label}
                style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
                  background: preset.value || (isDark ? '#0a0a0a' : '#fafafa'),
                  border: wallpaper === preset.value ? '2px solid #6366f1' : `1px solid ${border}`,
                  boxSizing: 'border-box'
                }}
              />
            ))}
          </div>
        )}

        {/* SEARCH BAR */}
        {showSearch && (
          <div className="slide-down" style={{ padding: '10px 24px', borderBottom: `1px solid ${border}`, background: panelBg, flexShrink: 0 }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suhbatdan qidirish..."
              className="input-focus"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 14px', borderRadius: 10, background: isDark ? '#262626' : '#f5f5f5', border: 'none', outline: 'none', color: textColor, fontSize: 13 }}
            />
          </div>
        )}

        {/* PINNED MESSAGE */}
        {pinnedMsg && !showSearch && (
          <div className="slide-down" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', borderBottom: `1px solid ${border}`, background: isDark ? '#1c1c2e' : '#eef0ff', flexShrink: 0 }}>
            <Pin size={14} color="#6366f1" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, margin: 0 }}>Mahkamlangan xabar</p>
              <p style={{ fontSize: 13, color: textColor, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewOf(pinnedMsg)}</p>
            </div>
            <PinOff size={15} color="#888" className="scale-tap" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => togglePin(pinnedMsg._id)} />
          </div>
        )}

        {/* MESSAGES */}
        <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {loadingOlder && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 14px' }}>
              <Loader2 size={18} color="#6366f1" className="spin-anim" />
            </div>
          )}
          {!loadingOlder && hasMoreOlder && visibleMessages.length > 0 && (
            <div
              onClick={loadOlderMessages}
              className="scale-tap"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0 14px', color: '#888', fontSize: 12, cursor: 'pointer' }}
            >
              <ArrowUp size={13} /> Eski xabarlarni yuklash
            </div>
          )}

          {visibleMessages.length === 0 && !loadingOlder && (
            <div className="pop-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: isDark ? '#262626' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <MessageCircle size={28} color="#888" />
              </div>
              <p style={{ fontSize: 14, margin: 0 }}>{showSearch && searchQuery ? 'Hech narsa topilmadi' : "Hali xabar yo'q"}</p>
              {!showSearch && <p style={{ fontSize: 13, margin: '4px 0 0', opacity: 0.7 }}>Birinchi xabarni yuboring</p>}
            </div>
          )}

          {visibleMessages.map((m, i) => {
            const isOwn = m.sender === username;
            const prev = visibleMessages[i - 1];
            const showAvatar = !isOwn && (!prev || prev.sender !== m.sender);
            const seen = m.seenBy && m.seenBy.some((u) => u !== username);
            const isImage = m.fileUrl && m.fileType === 'image';
            const isAudio = m.fileUrl && m.fileType === 'audio';
            const reactionGroups = groupReactions(m.reactions);
            const hasReactions = Object.keys(reactionGroups).length > 0;

            const dateLabel = formatDateLabel(m.createdAt);
            const showDateSeparator = dateSeparators[i];
            const showUnreadDivider = i === unreadDividerIndex;

            return (
              <div key={m._id || i}>
                {showDateSeparator && (
                  <div className="pop-in" style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                    <span style={{ fontSize: 12, color: '#888', background: isDark ? '#262626' : '#f0f0f0', padding: '4px 12px', borderRadius: 12 }}>
                      {dateLabel}
                    </span>
                  </div>
                )}

                {showUnreadDivider && (
                  <div className="pop-in" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 16px' }}>
                    <div style={{ flex: 1, height: 1, background: '#ef4444', opacity: 0.4 }} />
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Yangi xabarlar</span>
                    <div style={{ flex: 1, height: 1, background: '#ef4444', opacity: 0.4 }} />
                  </div>
                )}

                <div
                  className={isOwn ? 'msg-in-right' : 'msg-in-left'}
                  onMouseEnter={() => setHoveredId(m._id)}
                  onMouseLeave={() => { setHoveredId(null); setReactionPickerId(null); }}
                  onClick={() => { if (selectMode && !m.deleted) toggleSelectMsg(m._id); }}
                  style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: hasReactions ? 16 : 6, gap: 8, position: 'relative', cursor: selectMode ? 'pointer' : 'default' }}
                >
                  {selectMode && !m.deleted && (
                    <div className="pop-in scale-tap" style={{ alignSelf: 'center', flexShrink: 0 }}>
                      {selectedIds.has(m._id) ? (
                        <CircleCheck size={22} color="#6366f1" fill="#6366f1" />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isDark ? '#444' : '#ccc'}` }} />
                      )}
                    </div>
                  )}

                  {/* OTHER AVATAR */}
                  {!isOwn && (
                    <div style={{ width: 28, flexShrink: 0, alignSelf: 'flex-end' }}>
                      {showAvatar && (
                        <div
                          onClick={() => setViewingProfile(m.sender)}
                          className="scale-tap"
                          style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 600, background: getAvatarGradient(m.sender), cursor: 'pointer' }}
                        >
                          {getInitial(m.sender)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* OWN MESSAGE ACTIONS */}
                  {isOwn && hoveredId === m._id && !m.deleted && !selectMode && (
                    <div className="pop-in" style={{
                      display: 'flex', alignItems: 'center', gap: 3, alignSelf: 'center',
                      background: isDark ? '#1f1f1f' : '#fff',
                      border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
                      borderRadius: 26, padding: '6px 8px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
                    }}>
                      <CheckSquare size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => enterSelectMode(m._id)} />
                      <SmilePlus size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => setReactionPickerId((v) => v === m._id ? null : m._id)} />
                      <Reply size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => startReply(m)} />
                      <Forward size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => setForwardingMsg(m)} />
                      {!m.fileUrl && <Copy size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => copyText(m.text)} />}
                      {!m.fileUrl && <Pencil size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => startEdit(m)} />}
                      {m.pinned
                        ? <PinOff size={22} color="#6366f1" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => togglePin(m._id)} />
                        : <Pin size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => togglePin(m._id)} />
                      }
                      <Trash2 size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => setDeleteChoiceTarget(m)} />
                    </div>
                  )}

                  {/* BUBBLE */}
                  <div style={{ position: 'relative' }}>
                    {reactionPickerId === m._id && (
                      <ReactionPicker theme={theme} isOwn={isOwn} onSelect={(emoji) => handleReact(m._id, emoji)} />
                    )}

                    <div className="msg-bubble" style={{
                      maxWidth: 380,
                      padding: isImage ? 4 : '8px 14px',
                      borderRadius: 16,
                      borderBottomRightRadius: isOwn ? 4 : 16,
                      borderBottomLeftRadius: isOwn ? 16 : 4,
                      background: isOwn ? '#6366f1' : bubbleOther,
                      color: isOwn ? '#fff' : textColor,
                      boxShadow: isOwn ? '0 1px 3px rgba(99,102,241,0.35)' : '0 1px 2px rgba(0,0,0,0.06)',
                      position: 'relative'
                    }}>
                      {m.pinned && <Pin size={11} color={isOwn ? 'rgba(255,255,255,0.7)' : '#6366f1'} style={{ position: 'absolute', top: 6, right: 6 }} />}

                      {/* GROUP SENDER NAME */}
                      {!isOwn && conversation.isGroup && (
                        <p onClick={() => setViewingProfile(m.sender)} style={{ fontSize: 12, fontWeight: 600, margin: isImage ? '6px 8px 2px' : '0 0 2px', color: getAvatarColor(m.sender), cursor: 'pointer' }}>
                          {m.sender}
                        </p>
                      )}

                      {/* REPLY PREVIEW */}
                      {m.replyTo && !m.deleted && (
                        <div style={{ borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.5)' : '#6366f1'}`, paddingLeft: 8, margin: isImage ? '6px 8px 0' : '0 0 6px', opacity: 0.85 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: isOwn ? 'rgba(255,255,255,0.9)' : getAvatarColor(m.replyTo.sender) }}>{m.replyTo.sender}</p>
                          <p style={{ fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{m.replyTo.text}</p>
                        </div>
                      )}

                      {/* MESSAGE CONTENT */}
                      {m.deleted ? (
                        <p style={{ fontSize: 14, margin: 0, fontStyle: 'italic', opacity: 0.6 }}>Xabar o'chirildi</p>
                      ) : isImage ? (
                        <div className="image-zoom" style={{ position: 'relative' }} onClick={() => setLightboxImage(m.fileUrl)}>
                          <img src={m.fileUrl} alt={m.fileName || 'rasm'} style={{ maxWidth: 320, maxHeight: 320, borderRadius: 12, display: 'block' }} />
                          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: 4, display: 'flex' }}>
                            <ZoomIn size={14} color="#fff" />
                          </div>
                        </div>
                      ) : isAudio ? (
                        <AudioMessage src={m.fileUrl} isOwn={isOwn} />
                      ) : m.fileUrl ? (
                        <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', padding: '4px 0' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={18} />
                          </div>
                          <span style={{ fontSize: 13, flex: 1, wordBreak: 'break-all' }}>{m.fileName}</span>
                          <Download size={16} />
                        </a>
                      ) : (
                        <>
                          <p style={{ fontSize: 14, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>{formatMessageText(m.text || '', isOwn)}</p>
                          {m.linkPreview && <LinkPreviewCard preview={m.linkPreview} isOwn={isOwn} />}
                        </>
                      )}

                      {/* TIME + SEEN */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 2, padding: isImage ? '0 8px 4px' : 0 }}>
                        {m.edited && !m.deleted && <span style={{ fontSize: 10, opacity: 0.7 }}>tahrirlangan</span>}
                        <span style={{ fontSize: 11, opacity: 0.7 }}>{formatTime(m.createdAt)}</span>
                        {isOwn && (
                          <span
                            className="check-pop scale-tap"
                            key={seen ? 'seen' : 'sent'}
                            onClick={(e) => { if (conversation.isGroup) { e.stopPropagation(); setSeenByModalMsg(m); } }}
                            style={{ cursor: conversation.isGroup ? 'pointer' : 'default' }}
                          >
                            {seen ? <CheckCheck size={13} /> : <Check size={13} />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* REACTIONS */}
                    {hasReactions && (
                      <div className="pop-in" style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: isOwn ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
                        {Object.entries(reactionGroups).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(m._id, emoji)}
                            title={users.join(', ')}
                            className="scale-tap"
                            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, background: users.includes(username) ? 'rgba(99,102,241,0.15)' : (isDark ? '#262626' : '#f0f0f0'), border: users.includes(username) ? '1px solid #6366f1' : '1px solid transparent', borderRadius: 10, padding: '2px 7px', cursor: 'pointer', color: textColor, transition: 'background-color 0.15s ease' }}
                          >
                            <span>{emoji}</span>
                            <span style={{ fontSize: 11 }}>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OTHER MESSAGE ACTIONS */}
                  {!isOwn && hoveredId === m._id && !m.deleted && !selectMode && (
                    <div className="pop-in" style={{
                      display: 'flex', alignItems: 'center', gap: 3, alignSelf: 'center',
                      background: isDark ? '#1f1f1f' : '#fff',
                      border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
                      borderRadius: 26, padding: '6px 8px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
                    }}>
                      <CheckSquare size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => enterSelectMode(m._id)} />
                      <SmilePlus size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => setReactionPickerId((v) => v === m._id ? null : m._id)} />
                      <Reply size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => startReply(m)} />
                      <Forward size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => setForwardingMsg(m)} />
                      {m.pinned
                        ? <PinOff size={22} color="#6366f1" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => togglePin(m._id)} />
                        : <Pin size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} onClick={() => togglePin(m._id)} />
                      }
                      <Trash2 size={22} color="#888" className="icon-btn" style={{ cursor: 'pointer', padding: 9, flexShrink: 0 }} title="Faqat menda o'chirish" onClick={() => deleteForMe(m._id)} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />

          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="pop-in scale-tap"
              style={{
                position: 'sticky', bottom: 8, alignSelf: 'flex-end', marginLeft: 'auto',
                width: 40, height: 40, borderRadius: '50%', background: panelBg, border: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)', color: '#6366f1', zIndex: 5
              }}
            >
              <ArrowDown size={18} />
            </button>
          )}
        </div>

        {/* EMOJI PICKER */}
        {showEmoji && (
          <EmojiPicker theme={theme} onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        )}

        {/* REPLY PREVIEW */}
        {replyingTo && (
          <div className="slide-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', background: isDark ? '#1c1c1c' : '#f0f0f0', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
            <div style={{ borderLeft: '3px solid #6366f1', paddingLeft: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', margin: 0 }}>{replyingTo.sender}ga javob</p>
              <p style={{ fontSize: 12, color: '#888', margin: 0, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewOf(replyingTo)}
              </p>
            </div>
            <button onClick={cancelReply} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* MENTION SUGGESTIONS */}
        {mentionQuery !== null && mentionSuggestions.length > 0 && (
          <div className="slide-up" style={{ padding: '6px 20px', background: panelBg, borderTop: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            {mentionSuggestions.map((u) => (
              <div
                key={u}
                onClick={() => applyMention(u)}
                className="scale-tap"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
              >
                <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 600, background: getAvatarGradient(u) }}>
                  {getInitial(u)}
                </div>
                <span style={{ fontSize: 13, color: textColor }}>{u}</span>
              </div>
            ))}
          </div>
        )}

        {/* SCHEDULE PICKER */}
        {showSchedulePicker && (
          <div className="slide-up" style={{ padding: '10px 20px', background: panelBg, borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Clock size={16} color="#6366f1" />
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              className="input-focus"
              style={{ background: isDark ? '#262626' : '#f5f5f5', border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`, borderRadius: 8, color: textColor, fontSize: 13, padding: '7px 10px', outline: 'none' }}
            />
            <button
              onClick={scheduleMessage}
              disabled={!text.trim() || !scheduleDateTime}
              className="scale-tap"
              style={{ background: '#6366f1', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 500, padding: '7px 14px', cursor: 'pointer', opacity: (!text.trim() || !scheduleDateTime) ? 0.5 : 1 }}
            >
              Rejalashtirish
            </button>
            <button
              onClick={() => setShowSchedulePicker(false)}
              className="icon-btn scale-tap"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', marginLeft: 'auto' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* INPUT BAR / BLOCKED BANNER */}
        {isBlockedPeer ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 20px', borderTop: `1px solid ${border}`, background: panelBg, flexShrink: 0 }}>
            <UserX size={16} color="#ef4444" />
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Siz {conversation.title}ni bloklagansiz</p>
            <button
              onClick={() => setViewingProfile(conversation.title)}
              className="scale-tap"
              style={{ background: 'none', border: '1px solid #6366f1', color: '#6366f1', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
            >
              Blokdan chiqarish
            </button>
          </div>
        ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: replyingTo ? 'none' : `1px solid ${border}`, background: panelBg, flexShrink: 0 }}>
          {editingId && (
            <button onClick={cancelEdit} className="icon-btn scale-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
              <X size={18} />
            </button>
          )}

          {showVoice ? (
            <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />
          ) : (
            <>
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
              <Paperclip
                size={20}
                color={uploading ? '#6366f1' : '#888'}
                className={`scale-tap ${uploading ? 'spin-anim' : ''}`}
                style={{ cursor: uploading ? 'default' : 'pointer' }}
                onClick={() => !uploading && fileInputRef.current?.click()}
              />
              <input
                ref={textInputRef}
                value={text}
                onChange={handleTypingInput}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                onPaste={handlePaste}
                placeholder={uploading ? 'Fayl yuborilmoqda...' : editingId ? 'Xabarni tahrirlang...' : 'Xabar yozing...'}
                disabled={uploading}
                className="input-focus"
                style={{ flex: 1, background: isDark ? '#262626' : '#f0f0f0', color: textColor, borderRadius: 20, border: '1px solid transparent', outline: 'none', padding: '10px 16px', fontSize: 14 }}
              />
              <Smile size={20} color={showEmoji ? '#6366f1' : '#888'} className="scale-tap" style={{ cursor: 'pointer' }} onClick={() => setShowEmoji((v) => !v)} />
              {!editingId && !conversation.isSaved && (
                <Clock
                  size={20}
                  color={showSchedulePicker ? '#6366f1' : '#888'}
                  className="scale-tap"
                  style={{ cursor: 'pointer' }}
                  title="Vaqtga rejalashtirish"
                  onClick={() => setShowSchedulePicker((v) => !v)}
                />
              )}
              {text.trim() ? (
                <button onClick={sendMessage} className={`scale-tap ${sendAnim ? 'send-pop' : ''}`} style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Send size={16} color="white" />
                </button>
              ) : (
                <button onClick={() => setShowVoice(true)} className="scale-tap" style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Mic size={16} color="white" />
                </button>
              )}
            </>
          )}
        </div>
        )}
      </div>

      {/* GROUP INFO PANEL */}
      {showGroupInfo && canOpenGroupInfo && (
        <GroupInfoPanel conversation={conversation} username={username} theme={theme} onClose={() => setShowGroupInfo(false)} />
      )}

      {/* USER PROFILE MODAL */}
      {viewingProfile && (
        <UserProfileModal
          username={viewingProfile}
          theme={theme}
          onClose={() => {
            setViewingProfile(null);
            api.get('/users/me').then((res) => setMyBlockedUsers(res.data.blockedUsers || [])).catch(() => {});
          }}
          onStartChat={async (u) => {
            if (onSelectConversation) {
              const res = await api.post('/conversations/dm', { targetUsername: u });
              onSelectConversation({ id: res.data._id, title: u, isGroup: false });
            }
            setViewingProfile(null);
          }}
        />
      )}

      {/* FORWARD MODAL */}
      {forwardingMsg && (
        <ForwardModal
          theme={theme}
          message={forwardingMsg}
          currentConversationId={conversation.id}
          onClose={() => setForwardingMsg(null)}
          onForward={handleForward}
        />
      )}

      {/* BULK FORWARD MODAL */}
      {bulkForwardOpen && (
        <ForwardModal
          theme={theme}
          currentConversationId={conversation.id}
          onClose={() => setBulkForwardOpen(false)}
          onForward={handleBulkForward}
        />
      )}

      {/* SEEN BY MODAL */}
      {seenByModalMsg && (
        <SeenByModal
          theme={theme}
          seenBy={seenByModalMsg.seenBy}
          sender={seenByModalMsg.sender}
          onClose={() => setSeenByModalMsg(null)}
        />
      )}

      {/* DELETE CHOICE MODAL */}
      {deleteChoiceTarget && (
        <div className="modal-overlay-anim" onClick={() => setDeleteChoiceTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250 }}>
          <div className="modal-card-anim" onClick={(e) => e.stopPropagation()} style={{ width: 300, background: isDark ? '#171717' : '#fff', borderRadius: 16, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <p style={{ color: textColor, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Xabarni o'chirish</p>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>
              {deleteChoiceTarget === 'bulk' ? `${selectedIds.size} ta xabar tanlandi` : "Bu amalni ortga qaytarib bo'lmaydi"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(deleteChoiceTarget === 'bulk' ? canBulkDeleteEveryone : deleteChoiceTarget.sender === username) && (
                <button onClick={confirmDeleteEveryone} className="scale-tap" style={{ background: '#ef4444', border: 'none', padding: 11, borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  Hammaga o'chirish
                </button>
              )}
              <button onClick={confirmDeleteForMeOnly} className="scale-tap" style={{ background: isDark ? '#262626' : '#f0f0f0', border: 'none', padding: 11, borderRadius: 10, color: textColor, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Faqat menda o'chirish
              </button>
              <button onClick={() => setDeleteChoiceTarget(null)} className="scale-tap" style={{ background: 'none', border: 'none', padding: 8, color: '#888', fontSize: 13, cursor: 'pointer' }}>
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
          }}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="icon-btn scale-tap"
            style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 10 }}
          >
            <X size={22} />
          </button>
          <img src={lightboxImage} alt="preview" className="lightbox-img" style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
