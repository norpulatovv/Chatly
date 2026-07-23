const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'avatar-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', auth, async (req, res) => {
  const users = await User.find({ username: { $ne: req.user.username } }).select('username bio avatar');
  res.json(users);
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('username bio avatar blockedUsers');
  res.json(user);
});

router.get('/profile/:username', auth, async (req, res) => {
  const user = await User.findOne({ username: req.params.username }).select('username bio avatar createdAt');
  if (!user) return res.status(404).json({ error: 'Topilmadi' });
  res.json(user);
});

router.put('/me', auth, async (req, res) => {
  const { bio } = req.body;
  const user = await User.findByIdAndUpdate(req.user.id, { bio }, { new: true }).select('username bio avatar');
  res.json(user);
});

router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Rasm topilmadi' });
  const avatarUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl }, { new: true }).select('username bio avatar');
  res.json(user);
});

router.delete('/me', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/block', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username === req.user.username) {
      return res.status(400).json({ error: "Noto'g'ri so'rov" });
    }
    const user = await User.findById(req.user.id);
    if (!user.blockedUsers.includes(username)) {
      user.blockedUsers.push(username);
      await user.save();
    }
    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/unblock', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findById(req.user.id);
    user.blockedUsers = user.blockedUsers.filter((u) => u !== username);
    await user.save();
    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;