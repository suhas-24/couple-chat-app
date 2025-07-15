const mongoose = require('mongoose');
const encryptionService = require('../services/encryptionService');

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
    encryptedText: {
      type: String // Encrypted version of text for enhanced security
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

// Pre-save hook for encryption and chat updates
messageSchema.pre('save', async function(next) {
  try {
    // Always encrypt message content for security
    if (this.isModified('content.text')) {
      try {
        this.content.encryptedText = encryptionService.encrypt(this.content.text);
        // Clear plain text after encryption (keep for compatibility during transition)
        // this.content.text = '[ENCRYPTED]';
      } catch (encryptionError) {
        console.error('Message encryption failed:', encryptionError);
        // Continue without encryption if it fails (fallback)
      }
    }

    // Update chat's lastMessageAt for new messages
    if (this.isNew && !this.isDeleted) {
      const Chat = require('./Chat');
      await Chat.findByIdAndUpdate(this.chat, {
        lastMessageAt: this.createdAt || new Date()
      });
    }
  } catch (error) {
    console.error('Error in message pre-save hook:', error);
  }
  next();
});

// Method to decrypt message content
messageSchema.methods.getDecryptedText = function() {
  // Try to decrypt if encrypted text exists
  if (this.content.encryptedText) {
    try {
      return encryptionService.decrypt(this.content.encryptedText);
    } catch (error) {
      console.error('Error decrypting message:', error);
      return this.content.text; // Fallback to plain text
    }
  }
  // Return plain text if no encrypted version exists (legacy messages)
  return this.content.text;
};

// Method to edit message
messageSchema.methods.editMessage = function(newText, userId) {
  // Check if user is the sender
  if (!this.sender.equals(userId)) {
    throw new Error('Only the sender can edit this message');
  }

  // Check if message is not too old (24 hours limit)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (this.createdAt < twentyFourHoursAgo) {
    throw new Error('Cannot edit messages older than 24 hours');
  }

  this.content.text = newText;
  this.metadata.isEdited = true;
  this.metadata.editedAt = new Date();
  
  return this.save();
};

// Method to soft delete message
messageSchema.methods.deleteMessage = function(userId) {
  // Check if user is the sender
  if (!this.sender.equals(userId)) {
    throw new Error('Only the sender can delete this message');
  }

  this.isDeleted = true;
  this.content.text = 'This message was deleted';
  
  return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.metadata.reactions = this.metadata.reactions.filter(
    reaction => !reaction.user.equals(userId)
  );

  // Add new reaction
  this.metadata.reactions.push({
    user: userId,
    emoji: emoji,
    reactedAt: new Date()
  });

  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.metadata.reactions = this.metadata.reactions.filter(
    reaction => !reaction.user.equals(userId)
  );

  return this.save();
};

// Method to mark as read
messageSchema.methods.markAsRead = function(userId) {
  // Check if already read by this user
  const alreadyRead = this.readBy.some(read => read.user.equals(userId));
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static method for text search
messageSchema.statics.searchMessages = function(chatId, searchTerm, options = {}) {
  const {
    limit = 20,
    skip = 0,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  return this.find({
    chat: chatId,
    isDeleted: false,
    $text: { $search: searchTerm }
  })
  .populate('sender', 'name avatar')
  .sort({ [sortBy]: sortOrder })
  .limit(limit)
  .skip(skip);
};

// Static method to get messages with reactions populated
messageSchema.statics.getMessagesWithReactions = function(chatId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    before = null // Get messages before this date
  } = options;

  const query = {
    chat: chatId,
    isDeleted: false
  };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  return this.find(query)
    .populate('sender', 'name avatar')
    .populate('metadata.reactions.user', 'name')
    .populate('readBy.user', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
