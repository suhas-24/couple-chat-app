const Message = require('../models/Message');
const Chat = require('../models/Chat');
const mongoose = require('mongoose');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');

// Get comprehensive chat analytics
exports.getChatStats = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { startDate, endDate, includeWordAnalysis = 'true', includeActivityPatterns = 'true', includeMilestones = 'true' } = req.query;
    const userId = req.userId;

    // Verify user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    }).populate('participants', 'name');

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to view analytics for this chat' });
    }

    // Generate cache key
    const cacheKey = cacheService.generateAnalyticsKey(chatId, {
      startDate,
      endDate,
      includeWordAnalysis: includeWordAnalysis === 'true',
      includeActivityPatterns: includeActivityPatterns === 'true',
      includeMilestones: includeMilestones === 'true'
    });

    // Try to get from cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    // Generate analytics using the service
    const analyticsResult = await analyticsService.generateChatAnalytics(chatId, {
      startDate,
      endDate,
      includeWordAnalysis: includeWordAnalysis === 'true',
      includeActivityPatterns: includeActivityPatterns === 'true',
      includeMilestones: includeMilestones === 'true'
    });

    if (!analyticsResult.success) {
      return res.status(500).json({
        success: false,
        error: analyticsResult.error
      });
    }

    // Add chat info to the result
    analyticsResult.data.chatInfo = {
      name: chat.chatName,
      participants: chat.participants,
      createdAt: chat.createdAt,
      lastMessageAt: chat.lastMessageAt
    };

    // Cache the result for 30 minutes
    cacheService.set(cacheKey, analyticsResult.data, 30 * 60 * 1000);

    res.status(200).json({
      success: true,
      data: analyticsResult.data,
      cached: false
    });
  } catch (error) {
    console.error('Error getting chat analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate chat analytics'
    });
  }
};

// Get word frequency analysis
exports.getWordCloud = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, startDate, endDate } = req.query;
    const userId = req.userId;

    // Verify user has access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Generate cache key
    const cacheKey = cacheService.generateWordFrequencyKey(chatId, {
      startDate,
      endDate,
      limit: parseInt(limit)
    });

    // Try to get from cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    // Generate analytics to get word analysis
    const analyticsResult = await analyticsService.generateChatAnalytics(chatId, {
      startDate,
      endDate,
      includeWordAnalysis: true,
      includeActivityPatterns: false,
      includeMilestones: false
    });

    if (!analyticsResult.success) {
      return res.status(500).json({
        success: false,
        error: analyticsResult.error
      });
    }

    const wordAnalysis = analyticsResult.data.wordAnalysis;

    // Format response to match expected structure
    const wordCloudData = {
      topWords: wordAnalysis.mostUsedWords.slice(0, parseInt(limit)),
      totalUniqueWords: wordAnalysis.uniqueWords,
      topWordsBySender: wordAnalysis.wordsByUser,
      emojiUsage: wordAnalysis.emojiUsage,
      topPhrases: wordAnalysis.topPhrases,
      languageDistribution: wordAnalysis.languageDistribution,
      sentiment: wordAnalysis.sentiment
    };

    // Cache the result for 20 minutes
    cacheService.set(cacheKey, wordCloudData, 20 * 60 * 1000);

    res.status(200).json({
      success: true,
      data: wordCloudData,
      cached: false
    });
  } catch (error) {
    console.error('Error generating word cloud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate word cloud'
    });
  }
};

// Get message timeline and activity patterns
exports.getMessageTimeline = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const userId = req.userId;

    // Verify user has access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Generate cache key
    const cacheKey = cacheService.generateActivityKey(chatId, {
      startDate,
      endDate,
      type: groupBy
    });

    // Try to get from cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    // Generate analytics to get activity patterns
    const analyticsResult = await analyticsService.generateChatAnalytics(chatId, {
      startDate,
      endDate,
      includeWordAnalysis: false,
      includeActivityPatterns: true,
      includeMilestones: false
    });

    if (!analyticsResult.success) {
      return res.status(500).json({
        success: false,
        error: analyticsResult.error
      });
    }

    const activityPatterns = analyticsResult.data.activityPatterns;

    // Format timeline data based on groupBy parameter
    const timelineData = {
      data: activityPatterns.activityTrends,
      hourlyActivity: activityPatterns.hourlyActivity,
      dailyActivity: activityPatterns.dailyActivity,
      monthlyActivity: activityPatterns.monthlyActivity,
      mostActiveHour: activityPatterns.mostActiveHour,
      mostActiveDay: activityPatterns.mostActiveDay,
      groupBy,
      dateRange: {
        start: startDate || chat.createdAt,
        end: endDate || new Date()
      }
    };

    // Cache the result for 15 minutes
    cacheService.set(cacheKey, timelineData, 15 * 60 * 1000);

    res.status(200).json({
      success: true,
      data: timelineData,
      cached: false
    });
  } catch (error) {
    console.error('Error getting timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get message timeline'
    });
  }
};

// Get relationship milestones
exports.getRelationshipMilestones = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify user has access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    }).populate('participants', 'name');

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Generate cache key
    const cacheKey = cacheService.generateMilestonesKey(chatId);

    // Try to get from cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    // Generate analytics to get milestones
    const analyticsResult = await analyticsService.generateChatAnalytics(chatId, {
      includeWordAnalysis: false,
      includeActivityPatterns: false,
      includeMilestones: true
    });

    if (!analyticsResult.success) {
      return res.status(500).json({
        success: false,
        error: analyticsResult.error
      });
    }

    const milestonesData = {
      milestones: analyticsResult.data.milestones,
      metadata: chat.metadata,
      totalMessages: analyticsResult.data.totalMessages,
      dateRange: analyticsResult.data.dateRange
    };

    // Cache the result for 60 minutes (milestones don't change frequently)
    cacheService.set(cacheKey, milestonesData, 60 * 60 * 1000);

    res.status(200).json({
      success: true,
      data: milestonesData,
      cached: false
    });
  } catch (error) {
    console.error('Error getting milestones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get relationship milestones'
    });
  }
};

// Get emoji usage statistics
exports.getEmojiStats = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify user has access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all messages with emojis
    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    }).select('content.text sender metadata.reactions');

    // Emoji regex pattern
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;

    const emojiCount = {};
    const emojiBySender = {};
    const reactionCount = {};

    messages.forEach(msg => {
      // Count emojis in message text
      const emojis = msg.content.text.match(emojiRegex) || [];
      const senderId = msg.sender.toString();

      emojis.forEach(emoji => {
        emojiCount[emoji] = (emojiCount[emoji] || 0) + 1;

        if (!emojiBySender[senderId]) {
          emojiBySender[senderId] = {};
        }
        emojiBySender[senderId][emoji] = (emojiBySender[senderId][emoji] || 0) + 1;
      });

      // Count reactions
      msg.metadata.reactions.forEach(reaction => {
        reactionCount[reaction.emoji] = (reactionCount[reaction.emoji] || 0) + 1;
      });
    });

    // Get top emojis
    const topEmojis = Object.entries(emojiCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([emoji, count]) => ({ emoji, count }));

    // Get top reactions
    const topReactions = Object.entries(reactionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([emoji, count]) => ({ emoji, count }));

    res.status(200).json({
      success: true,
      emojiStats: {
        topEmojis,
        topReactions,
        totalUniqueEmojis: Object.keys(emojiCount).length,
        emojiBySender
      }
    });
  } catch (error) {
    console.error('Error getting emoji stats:', error);
    res.status(500).json({ error: 'Failed to get emoji statistics' });
  }
};
// Invalidate analytics cache for a chat (called when new messages are added)
exports.invalidateAnalyticsCache = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify user has access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Invalidate all analytics cache for this chat
    cacheService.invalidateAnalyticsCache(chatId);

    res.status(200).json({
      success: true,
      message: 'Analytics cache invalidated successfully'
    });
  } catch (error) {
    console.error('Error invalidating analytics cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate analytics cache'
    });
  }
};

// Get cache statistics (for debugging/monitoring)
exports.getCacheStats = async (req, res) => {
  try {
    const stats = cacheService.getStats();

    res.status(200).json({
      success: true,
      cacheStats: stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
};