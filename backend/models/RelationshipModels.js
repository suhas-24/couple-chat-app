const mongoose = require('mongoose');

const relationshipGoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['communication', 'intimacy', 'activities', 'personal_growth', 'future_planning', 'health', 'other'],
    required: true
  },
  targetDate: {
    type: Date,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  milestones: [{
    title: String,
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
    notes: String
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  }
}, {
  timestamps: true
});

const RelationshipGoal = mongoose.model('RelationshipGoal', relationshipGoalSchema);

const moodEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  mood: {
    type: String,
    enum: ['very_happy', 'happy', 'neutral', 'sad', 'very_sad', 'excited', 'anxious', 'frustrated', 'loved', 'romantic'],
    required: true
  },
  intensity: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  tags: [String],
  relatedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const MoodEntry = mongoose.model('MoodEntry', moodEntrySchema);

const coupleEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['anniversary', 'date', 'milestone', 'birthday', 'holiday', 'vacation', 'achievement', 'other'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  photos: [{
    url: String,
    caption: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  memories: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: function() {
      return this.isRecurring;
    }
  },
  reminderSettings: {
    enabled: { type: Boolean, default: true },
    reminderTime: { type: Number, default: 24 }, // hours before event
    customMessage: String
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const CoupleEvent = mongoose.model('CoupleEvent', coupleEventSchema);

const relationshipInsightSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  type: {
    type: String,
    enum: ['weekly_summary', 'monthly_summary', 'compatibility_analysis', 'communication_patterns', 'mood_trends', 'goal_progress'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  insights: [{
    category: String,
    observation: String,
    suggestion: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  metrics: {
    communicationScore: Number,
    intimacyScore: Number,
    supportScore: Number,
    overallHealthScore: Number,
    trendsComparison: {
      previousPeriod: Number,
      improvement: Number
    }
  },
  dataPoints: {
    messagesAnalyzed: Number,
    timeframeDays: Number,
    moodEntriesCount: Number,
    goalsTracked: Number
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  isViewed: {
    type: Boolean,
    default: false
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const RelationshipInsight = mongoose.model('RelationshipInsight', relationshipInsightSchema);

module.exports = {
  RelationshipGoal,
  MoodEntry,
  CoupleEvent,
  RelationshipInsight
};