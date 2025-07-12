const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  chatName: {
    type: String,
    default: 'Our Love Story'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    anniversaryDate: Date,
    relationshipStartDate: Date,
    theme: {
      type: String,
      enum: ['classic', 'modern', 'playful', 'romantic'],
      default: 'romantic'
    }
  },
  csvImports: [{
    fileName: String,
    importedAt: Date,
    messageCount: Number,
    dateRange: {
      start: Date,
      end: Date
    }
  }]
}, {
  timestamps: true
});

// Ensure only 2 participants (couple)
chatSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('A couple chat must have exactly 2 participants'));
  } else {
    next();
  }
});

// Index for efficient queries
chatSchema.index({ participants: 1, lastMessageAt: -1 });
chatSchema.index({ 'participants': 1, 'isActive': 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
