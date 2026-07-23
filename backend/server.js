require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const { extractFirstUrl, fetchLinkPreview } = require('./utils/linkPreview');

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl topilmadi' });
  res.json({
    url: `http://localhost:5000/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType: req.file.mimetype.startsWith('image/') ? 'image' : 'file'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB ulandi'))
  .catch(err => console.log('MongoDB xato:', err));

const onlineUsers = new Map();

function socketsForUser(username) {
  const set = onlineUsers.get(username);
  return set ? Array.from(set) : [];
}

io.on('connection', (socket) => {
  socket.on('registerUser', (username) => {
    socket.data.username = username;
    if (!onlineUsers.has(username)) onlineUsers.set(username, new Set());
    onlineUsers.get(username).add(socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('sendMessage', async ({ conversationId, sender, text, fileUrl, fileName, fileType, replyTo }) => {
    if (mongoose.Types.ObjectId.isValid(conversationId)) {
      const convo = await Conversation.findById(conversationId);
      if (convo && !convo.isGroup) {
        const other = convo.members.find((m) => m !== sender);
        if (other) {
          const otherUser = await User.findOne({ username: other }).select('blockedUsers');
          if (otherUser && otherUser.blockedUsers.includes(sender)) {
            socket.emit('messageBlocked', { conversationId });
            return;
          }
        }
      }
    }

    const msg = await Message.create({ conversationId, sender, text: text || '', fileUrl, fileName, fileType, replyTo });
    io.to(conversationId).emit('newMessage', msg);

    const url = extractFirstUrl(text);
    if (url) {
      fetchLinkPreview(url).then(async (preview) => {
        if (!preview) return;
        const updated = await Message.findByIdAndUpdate(msg._id, { linkPreview: preview }, { new: true });
        if (updated) io.to(conversationId).emit('messageEdited', updated);
      }).catch(() => {});
    }
  });

  socket.on('scheduleMessage', async ({ conversationId, sender, text, scheduledFor }) => {
    if (!scheduledFor) return;
    const when = new Date(scheduledFor);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) return;
    const msg = await Message.create({ conversationId, sender, text: text || '', scheduledFor: when });
    socket.emit('messageScheduled', msg);
  });

  socket.on('editMessage', async ({ messageId, newText, username }) => {
    const existing = await Message.findById(messageId);
    if (!existing || existing.sender !== username) return;
    const msg = await Message.findByIdAndUpdate(messageId, { text: newText, edited: true }, { new: true });
    if (msg) io.to(msg.conversationId).emit('messageEdited', msg);
  });

  socket.on('deleteMessage', async ({ messageId, username }) => {
    const existing = await Message.findById(messageId);
    if (!existing || existing.sender !== username) return;
    const msg = await Message.findByIdAndUpdate(messageId, { deleted: true, text: '', fileUrl: null }, { new: true });
    if (msg) io.to(msg.conversationId).emit('messageDeleted', msg);
  });

  socket.on('deleteMessageForMe', async ({ messageId, username }) => {
    const msg = await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: username } }, { new: true });
    if (msg) socket.emit('messageDeletedForMe', { messageId, conversationId: msg.conversationId });
  });

  // ===== WebRTC call signaling (1-on-1 relay via existing socket connection) =====
  socket.on('call:invite', ({ to, from, callType, conversationId }) => {
    const targets = socketsForUser(to);
    if (targets.length === 0) {
      socket.emit('call:unavailable', { to });
      return;
    }
    targets.forEach((sid) => io.to(sid).emit('call:incoming', { from, callType, conversationId }));
  });

  socket.on('call:accept', ({ to, from }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:accepted', { from }));
  });

  socket.on('call:reject', ({ to, from, reason }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:rejected', { from, reason }));
  });

  socket.on('call:cancel', ({ to, from }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:cancelled', { from }));
  });

  socket.on('call:offer', ({ to, from, sdp }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:offer', { from, sdp }));
  });

  socket.on('call:answer', ({ to, from, sdp }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:answer', { from, sdp }));
  });

  socket.on('call:ice-candidate', ({ to, from, candidate }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:ice-candidate', { from, candidate }));
  });

  socket.on('call:end', ({ to, from }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:ended', { from }));
  });

  socket.on('call:toggle-media', ({ to, from, kind, enabled }) => {
    socketsForUser(to).forEach((sid) => io.to(sid).emit('call:peer-toggle-media', { from, kind, enabled }));
  });

  socket.on('reactToMessage', async ({ messageId, emoji, username }) => {
    const msg = await Message.findById(messageId);
    if (!msg) return;

    const existingIdx = msg.reactions.findIndex((r) => r.username === username && r.emoji === emoji);
    if (existingIdx !== -1) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions = msg.reactions.filter((r) => r.username !== username);
      msg.reactions.push({ emoji, username });
    }
    await msg.save();
    io.to(msg.conversationId).emit('messageReacted', msg);
  });

  socket.on('togglePin', async ({ messageId }) => {
    const msg = await Message.findById(messageId);
    if (!msg) return;

    await Message.updateMany({ conversationId: msg.conversationId }, { pinned: false });
    msg.pinned = !msg.pinned;
    await msg.save();
    io.to(msg.conversationId).emit('messagePinned', msg);
  });

  socket.on('markSeen', async ({ conversationId, username }) => {
    await Message.updateMany(
      { conversationId, seenBy: { $ne: username } },
      { $push: { seenBy: username } }
    );
    io.to(conversationId).emit('messagesSeen', { conversationId, username });
  });

  socket.on('typing', ({ conversationId, sender }) => {
    socket.to(conversationId).emit('userTyping', sender);
  });

  socket.on('disconnect', () => {
    const username = socket.data.username;
    if (username && onlineUsers.has(username)) {
      onlineUsers.get(username).delete(socket.id);
      if (onlineUsers.get(username).size === 0) onlineUsers.delete(username);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT}-portda ishlayapti`));

setInterval(async () => {
  try {
    const due = await Message.find({ scheduledFor: { $ne: null, $lte: new Date() } });
    for (const msg of due) {
      msg.scheduledFor = null;
      await msg.save();
      io.to(msg.conversationId).emit('newMessage', msg);
    }
  } catch (err) {
    console.error('Scheduler xatosi:', err.message);
  }
}, 15000);