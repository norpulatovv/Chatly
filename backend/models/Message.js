const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  sender: { type: String, required: true },
  text: { type: String, default: '' },
  fileUrl: { type: String },
  fileName: { type: String },
  fileType: { type: String },
  replyTo: {
    messageId: String,
    sender: String,
    text: String
  },
  reactions: [{
    emoji: String,
    username: String
  }],
  pinned: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedFor: [{ type: String }],
  seenBy: [{ type: String }],
  scheduledFor: { type: Date, default: null },
  linkPreview: {
    url: String,
    title: String,
    description: String,
    image: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);