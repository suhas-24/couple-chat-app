const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 5000
    },
    type: {
      type: String,
      enum: ['text', 'emoji', 'image', 'voice', 'love-note'],
      default: 'text'
    }
  },
  metadata: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emoji: String,
      reactedAt: {
        type: Date,
        default: Date.now
      }
    }],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'romantic'],
      default: 'neutral'
    },
    importedFrom: {
      source: {
        type: String,
        enum: ['app', 'csv', 'whatsapp', 'imessage']
      },
      originalTimestamp: Date
    }
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'content.text': 'text' }); // For text search

// Virtual for checking if message is read by partner
messageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 1;
});

// Pre-save hook to update chat's lastMessageAt
messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      const Chat = require('./Chat');
      await Chat.findByIdAndUpdate(this.chat, {
        lastMessageAt: this.createdAt || new Date()
      });
    } catch (error) {
      console.error('Error updating chat lastMessageAt:', error);
    }
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
