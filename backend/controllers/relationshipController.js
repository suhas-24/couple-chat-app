const { RelationshipGoal, MoodEntry, CoupleEvent, RelationshipInsight } = require('../models/RelationshipModels');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { validationResult } = require('express-validator');

// Goals Management
exports.createGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, category, targetDate, milestones, priority } = req.body;
    const { chatId } = req.params;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    const goal = new RelationshipGoal({
      title,
      description,
      category,
      targetDate,
      milestones: milestones || [],
      priority: priority || 'medium',
      createdBy: req.userId,
      participants: chat.participants,
      chat: chatId
    });

    await goal.save();
    await goal.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating goal'
    });
  }
};

exports.getGoals = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { status, category, priority } = req.query;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    let filter = { chat: chatId };
    
    if (status === 'completed') {
      filter.isCompleted = true;
    } else if (status === 'active') {
      filter.isCompleted = false;
    }
    
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const goals = await RelationshipGoal.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      goals
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching goals'
    });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;

    const goal = await RelationshipGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Verify user has access to this goal
    const chat = await Chat.findById(goal.chat);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this goal'
      });
    }

    // Handle completion
    if (updates.isCompleted && !goal.isCompleted) {
      updates.completedAt = new Date();
      updates.progress = 100;
    } else if (!updates.isCompleted && goal.isCompleted) {
      updates.completedAt = null;
    }

    Object.assign(goal, updates);
    await goal.save();
    await goal.populate('createdBy', 'name email');

    res.json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating goal'
    });
  }
};

// Mood Tracking
exports.createMoodEntry = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { mood, intensity, notes, tags, isPrivate } = req.body;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    const moodEntry = new MoodEntry({
      user: req.userId,
      chat: chatId,
      mood,
      intensity,
      notes,
      tags: tags || [],
      isPrivate: isPrivate || false
    });

    await moodEntry.save();
    await moodEntry.populate('user', 'name email');

    res.status(201).json({
      success: true,
      moodEntry
    });
  } catch (error) {
    console.error('Create mood entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating mood entry'
    });
  }
};

exports.getMoodEntries = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { startDate, endDate, userId } = req.query;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    let filter = { chat: chatId };
    
    // Only show non-private entries unless it's the user's own entries
    if (userId && userId === req.userId.toString()) {
      filter.user = userId;
    } else {
      filter.$or = [
        { isPrivate: false },
        { user: req.userId }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const moodEntries = await MoodEntry.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      moodEntries
    });
  } catch (error) {
    console.error('Get mood entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood entries'
    });
  }
};

// Events Management
exports.createEvent = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title, description, type, date, location, isRecurring, recurringPattern, reminderSettings } = req.body;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    const event = new CoupleEvent({
      title,
      description,
      type,
      date,
      location,
      participants: chat.participants,
      chat: chatId,
      isRecurring: isRecurring || false,
      recurringPattern,
      reminderSettings: reminderSettings || { enabled: true, reminderTime: 24 },
      createdBy: req.userId
    });

    await event.save();
    await event.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating event'
    });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { startDate, endDate, type } = req.query;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    let filter = { chat: chatId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (type) filter.type = type;

    const events = await CoupleEvent.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching events'
    });
  }
};

exports.addEventMemory = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content } = req.body;

    const event = await CoupleEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Verify user has access to this event
    const chat = await Chat.findById(event.chat);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this event'
      });
    }

    event.memories.push({
      content,
      addedBy: req.userId,
      addedAt: new Date()
    });

    await event.save();
    await event.populate('createdBy', 'name email');

    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Add event memory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding memory'
    });
  }
};

// Insights Generation
exports.generateInsights = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { type = 'weekly_summary', timeframeDays = 7 } = req.query;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Gather data for insights
    const [messages, moodEntries, goals, events] = await Promise.all([
      Message.find({ 
        chat: chatId, 
        createdAt: { $gte: startDate, $lte: endDate } 
      }).populate('sender', 'name'),
      MoodEntry.find({ 
        chat: chatId, 
        createdAt: { $gte: startDate, $lte: endDate } 
      }).populate('user', 'name'),
      RelationshipGoal.find({ chat: chatId, isCompleted: false }),
      CoupleEvent.find({ 
        chat: chatId, 
        date: { $gte: startDate, $lte: endDate } 
      })
    ]);

    // Generate insights based on data
    const insights = await generateRelationshipInsights(
      chat,
      messages,
      moodEntries,
      goals,
      events,
      type
    );

    const relationshipInsight = new RelationshipInsight({
      chat: chatId,
      type,
      title: insights.title,
      summary: insights.summary,
      insights: insights.insights,
      metrics: insights.metrics,
      dataPoints: {
        messagesAnalyzed: messages.length,
        timeframeDays,
        moodEntriesCount: moodEntries.length,
        goalsTracked: goals.length
      }
    });

    await relationshipInsight.save();

    res.json({
      success: true,
      insight: relationshipInsight
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating insights'
    });
  }
};

// Helper function to generate AI-powered insights
async function generateRelationshipInsights(chat, messages, moodEntries, goals, events, type) {
  // This would integrate with your AI service (Gemini) to generate insights
  // For now, providing a basic structure
  
  const avgMoodScore = moodEntries.length > 0 
    ? moodEntries.reduce((sum, entry) => sum + entry.intensity, 0) / moodEntries.length 
    : 3;

  const communicationScore = Math.min(100, (messages.length / 10) * 20);
  const goalProgress = goals.length > 0 
    ? goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length 
    : 0;

  return {
    title: `${type.replace('_', ' ')} Insights`,
    summary: `Based on ${messages.length} messages and ${moodEntries.length} mood entries, your relationship shows positive communication patterns.`,
    insights: [
      {
        category: 'Communication',
        observation: `You exchanged ${messages.length} messages this week`,
        suggestion: 'Continue maintaining regular communication',
        priority: 'medium'
      },
      {
        category: 'Mood',
        observation: `Average mood score: ${avgMoodScore.toFixed(1)}/5`,
        suggestion: avgMoodScore >= 4 ? 'Keep up the positive energy!' : 'Consider planning special activities together',
        priority: avgMoodScore >= 4 ? 'low' : 'high'
      }
    ],
    metrics: {
      communicationScore,
      intimacyScore: avgMoodScore * 20,
      supportScore: 85,
      overallHealthScore: (communicationScore + (avgMoodScore * 20) + 85) / 3,
      trendsComparison: {
        previousPeriod: 75,
        improvement: 5
      }
    }
  };
}

module.exports = exports;