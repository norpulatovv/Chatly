const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/mine', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const convos = await Conversation.find({ members: me });

    const results = await Promise.all(convos.map(async (c) => {
      const title = c.isGroup ? c.name : c.members.find((m) => m !== me);
      const lastMsg = await Message.findOne({ conversationId: c._id.toString(), deletedFor: { $ne: me }, $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }] }).sort('-createdAt');
      const unreadCount = await Message.countDocuments({
        conversationId: c._id.toString(),
        sender: { $ne: me },
        seenBy: { $ne: me },
        deleted: { $ne: true }
      });
      return {
        id: c._id.toString(),
        title,
        isGroup: c.isGroup,
        members: c.members,
        admins: c.admins || [],
        lastMessage: lastMsg ? {
          text: lastMsg.deleted ? "Xabar o'chirildi" : (lastMsg.fileUrl ? (lastMsg.fileType === 'image' ? '📷 Rasm' : '📎 Fayl') : lastMsg.text),
          sender: lastMsg.sender,
          createdAt: lastMsg.createdAt
        } : null,
        unreadCount
      };
    }));

    const generalLast = await Message.findOne({ conversationId: 'general', deletedFor: { $ne: me }, $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }] }).sort('-createdAt');
    const generalUnread = await Message.countDocuments({
      conversationId: 'general',
      sender: { $ne: me },
      seenBy: { $ne: me },
      deleted: { $ne: true }
    });

    const generalConvo = {
      id: 'general',
      title: 'Umumiy suhbat',
      isGroup: true,
      members: [],
      lastMessage: generalLast ? {
        text: generalLast.deleted ? "Xabar o'chirildi" : (generalLast.fileUrl ? (generalLast.fileType === 'image' ? '📷 Rasm' : '📎 Fayl') : generalLast.text),
        sender: generalLast.sender,
        createdAt: generalLast.createdAt
      } : null,
      unreadCount: generalUnread
    };

    const savedConversationId = `saved_${me}`;
    const savedLast = await Message.findOne({ conversationId: savedConversationId, deletedFor: { $ne: me }, $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }] }).sort('-createdAt');
    const savedConvo = {
      id: savedConversationId,
      title: 'Saqlangan xabarlar',
      isGroup: false,
      isSaved: true,
      members: [me],
      lastMessage: savedLast ? {
        text: savedLast.deleted ? "Xabar o'chirildi" : (savedLast.fileUrl ? (savedLast.fileType === 'image' ? '📷 Rasm' : '📎 Fayl') : savedLast.text),
        sender: savedLast.sender,
        createdAt: savedLast.createdAt
      } : null,
      unreadCount: 0
    };

    const all = [savedConvo, generalConvo, ...results];
    all.sort((a, b) => {
      if (a.isSaved) return -1;
      if (b.isSaved) return 1;
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/dm', auth, async (req, res) => {
  const { targetUsername } = req.body;
  const me = req.user.username;

  let convo = await Conversation.findOne({
    isGroup: false,
    members: { $all: [me, targetUsername], $size: 2 }
  });

  if (!convo) {
    convo = await Conversation.create({ isGroup: false, members: [me, targetUsername] });
  }

  res.json(convo);
});

router.post('/group', auth, async (req, res) => {
  try {
    const { name, members } = req.body;
    const me = req.user.username;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Guruh nomi kerak' });

    const allMembers = Array.from(new Set([me, ...(members || [])]));
    if (allMembers.length < 2) return res.status(400).json({ error: "Kamida 1 a'zo tanlang" });

    const convo = await Conversation.create({ isGroup: true, name: name.trim(), members: allMembers, admins: [me] });
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const convos = await Conversation.find({ members: me });
    const idToMeta = new Map();
    convos.forEach((c) => {
      idToMeta.set(c._id.toString(), {
        title: c.isGroup ? c.name : c.members.find((m) => m !== me),
        isGroup: c.isGroup
      });
    });
    idToMeta.set('general', { title: 'Umumiy suhbat', isGroup: true });
    idToMeta.set(`saved_${me}`, { title: 'Saqlangan xabarlar', isGroup: false, isSaved: true });

    const conversationIds = Array.from(idToMeta.keys());
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const msgs = await Message.find({
      conversationId: { $in: conversationIds },
      text: regex,
      deleted: { $ne: true },
      deletedFor: { $ne: me },
      $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }]
    }).sort('-createdAt').limit(50);

    const results = msgs.map((m) => {
      const meta = idToMeta.get(m.conversationId) || { title: m.conversationId, isGroup: false };
      return {
        messageId: m._id.toString(),
        conversationId: m.conversationId,
        conversationTitle: meta.title,
        isGroup: meta.isGroup,
        isSaved: !!meta.isSaved,
        text: m.text,
        sender: m.sender,
        createdAt: m.createdAt
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/:id/kick', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const { username } = req.body;
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ error: 'Guruh topilmadi' });
    if (!(convo.admins || []).includes(me)) return res.status(403).json({ error: "Faqat adminlar a'zoni chiqara oladi" });
    if (username === me) return res.status(400).json({ error: "O'zingizni chiqara olmaysiz" });

    convo.members = convo.members.filter((m) => m !== username);
    convo.admins = (convo.admins || []).filter((a) => a !== username);
    await convo.save();
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/:id/promote', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const { username } = req.body;
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ error: 'Guruh topilmadi' });
    if (!(convo.admins || []).includes(me)) return res.status(403).json({ error: 'Faqat adminlar admin tayinlay oladi' });
    if (!convo.members.includes(username)) return res.status(400).json({ error: "Bu foydalanuvchi guruh a'zosi emas" });

    if (!convo.admins) convo.admins = [];
    if (!convo.admins.includes(username)) convo.admins.push(username);
    await convo.save();
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/:id/demote', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const { username } = req.body;
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ error: 'Guruh topilmadi' });
    if (!(convo.admins || []).includes(me)) return res.status(403).json({ error: 'Faqat adminlar admin huquqini olib qoya oladi' });

    const remainingAdmins = (convo.admins || []).filter((a) => a !== username);
    if (remainingAdmins.length === 0) return res.status(400).json({ error: "Guruhda kamida 1 admin qolishi kerak" });

    convo.admins = remainingAdmins;
    await convo.save();
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/:id/invite', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ error: 'Guruh topilmadi' });
    if (!convo.members.includes(me)) return res.status(403).json({ error: "Siz bu guruh a'zosi emassiz" });

    if (!convo.inviteCode) {
      convo.inviteCode = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      await convo.save();
    }
    res.json({ inviteCode: convo.inviteCode });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/join/:code', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const convo = await Conversation.findOne({ inviteCode: req.params.code });
    if (!convo) return res.status(404).json({ error: 'Taklif havolasi topilmadi yoki eskirgan' });

    if (!convo.members.includes(me)) {
      convo.members.push(me);
      await convo.save();
    }
    res.json({ id: convo._id.toString(), title: convo.name, isGroup: convo.isGroup, members: convo.members });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/:id/members', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ error: 'Guruh topilmadi' });
    if (!convo.members.includes(username)) {
      convo.members.push(username);
      await convo.save();
    }
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const me = req.user.username;
    const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100);
    const before = req.query.before;

    const filter = {
      conversationId: req.params.id,
      deletedFor: { $ne: me },
      $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }]
    };

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        filter.createdAt = { $lt: beforeDate };
      }
    }

    const msgs = await Message.find(filter).sort('-createdAt').limit(limit);
    const ordered = msgs.reverse();
    const hasMore = msgs.length === limit;

    res.json({ messages: ordered, hasMore });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;