const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  name: { type: String },
  members: [{ type: String, required: true }],
  admins: [{ type: String }],
  inviteCode: { type: String, unique: true, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);