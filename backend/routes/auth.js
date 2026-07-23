const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Maydonlar to'liq emas" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Bu username band' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed });
    const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Foydalanuvchi topilmadi' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Parol noto'g'ri" });
    }

    const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Maydonlar to'liq emas" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "Yangi parol kamida 4 belgidan iborat bo'lishi kerak" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: "Joriy parol noto'g'ri" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;