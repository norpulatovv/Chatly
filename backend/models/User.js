const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  blockedUsers: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);