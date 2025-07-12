const Message = require('../models/Message');
const Chat = require('../models/Chat');
const mongoose = require('mongoose');

// Get overall chat statistics
exports.getChatStats = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    }).populate('participants', 'name');

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to view analytics for this chat' });
    }

    // Get basic message statistics
    const totalMessages = await Message.countDocuments({
      chat: chatId,
      isDeleted: false
    });

    // Messages by sender
    const messagesBySender = await Message.aggregate([
      {
        $match: {
          chat: new mongoose.Types.ObjectId(chatId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 },
          firstMessage: { $min: '$createdAt' },
          lastMessage: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'senderInfo'
        }
      },
      {
        $unwind: '$senderInfo'
      },
      {
        $project: {
          sender: {
            id: '$_id',
            name: '$senderInfo.name'
          },
          count: 1,
          firstMessage: 1,
          lastMessage: 1
        }
      }
    ]);

    // Message types distribution
    const messageTypes = await Message.aggregate([
      {
        $match: {
          chat: new mongoose.Types.ObjectId(chatId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$content.type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Daily message count for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyMessages = await Message.aggregate([
      {
        $match: {
          chat: new mongoose.Types.ObjectId(chatId),
          createdAt: { $gte: thirtyDaysAgo },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Average messages per day
    const daysSinceStart = Math.ceil(
      (new Date() - new Date(chat.createdAt)) / (1000 * 60 * 60 * 24)
    );
    const avgMessagesPerDay = totalMessages / daysSinceStart;

    // Most active hours
    const hourlyActivity = await Message.aggregate([
      {
        $match: {
          chat: new mongoose.Types.ObjectId(chatId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' }, // hour of the day (0-23)
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Sentiment distribution
    const sentimentStats = await Message.aggregate([
      {
        $match: {
          chat: new mongoose.Types.ObjectId(chatId),
          isDeleted: false,
          'metadata.sentiment': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$metadata.sentiment',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalMessages,
        messagesBySender,
        messageTypes,
        dailyMessages,
        avgMessagesPerDay: Math.round(avgMessagesPerDay * 10) / 10,
        hourlyActivity,
        sentimentStats,
        chatInfo: {
          name: chat.chatName,
          participants: chat.participants,
          createdAt: chat.createdAt,
          lastMessageAt: chat.lastMessageAt
        }
      }
    });
  } catch (error) {
    console.error('Error getting chat stats:', error);
    res.status(500).json({ error: 'Failed to get chat statistics' });
  }
};

// Get word frequency analysis
exports.getWordCloud = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.userId;

    // Verify user has access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all text messages
    const messages = await Message.find({
      chat: chatId,
      'content.type': 'text',
      isDeleted: false
    }).select('content.text sender');

    // Common words to exclude
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
      'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
      'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out',
      'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
      'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some',
      'could', 'them', 'see', 'other', 'than', 'then', 'now',
      'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
      'well', 'way', 'even', 'new', 'want', 'because', 'any',
      'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are',
      'been', 'has', 'had', 'were', 'said', 'did', 'going', 'am',
      'ok', 'okay', 'yeah', 'yes', 'no'
    ]);

    // Count word frequencies
    const wordCount = {};
    const wordBySender = {};

    messages.forEach(msg => {
      const words = msg.content.text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
        
        // Track by sender
        const senderId = msg.sender.toString();
        if (!wordBySender[senderId]) {
          wordBySender[senderId] = {};
        }
        wordBySender[senderId][word] = (wordBySender[senderId][word] || 0) + 1;
      });
    });

    // Sort and limit words
    const sortedWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));

    // Get top words per sender
    const topWordsBySender = {};
    for (const [senderId, words] of Object.entries(wordBySender)) {
      topWordsBySender[senderId] = Object.entries(words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
    }

    res.status(200).json({
      success: true,
      wordCloud: {
        topWords: sortedWords,
        totalUniqueWords: Object.keys(wordCount).length,
        topWordsBySender
      }
    });
  } catch (error) {
    console.error('Error generating word cloud:', error);
    res.status(500).json({ error: 'Failed to generate word cloud' });
  }
};

// Get message timeline
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

    // Build date filter
    const dateFilter = { chat: new mongoose.Types.ObjectId(chatId), isDeleted: false };
    if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      dateFilter.createdAt = dateFilter.createdAt || {};
      dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Determine grouping format
    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = '%Y-%m-%d %H:00';
        break;
      case 'day':
        groupFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupFormat = '%Y-W%V';
        break;
      case 'month':
        groupFormat = '%Y-%m';
        break;
      default:
        groupFormat = '%Y-%m-%d';
    }

    // Get timeline data
    const timeline = await Message.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: '$createdAt' } },
            sender: '$sender'
          },
          count: { $sum: 1 },
          avgLength: { $avg: { $strLenCP: '$content.text' } }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          totalMessages: { $sum: '$count' },
          messagesBySender: {
            $push: {
              sender: '$_id.sender',
              count: '$count',
              avgLength: { $round: ['$avgLength', 0] }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get special moments (high activity days)
    const specialMoments = await Message.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      timeline: {
        data: timeline,
        specialMoments,
        groupBy,
        dateRange: {
          start: startDate || chat.createdAt,
          end: endDate || new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error getting timeline:', error);
    res.status(500).json({ error: 'Failed to get message timeline' });
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

    const milestones = [];

    // First message
    const firstMessage = await Message.findOne({
      chat: chatId,
      isDeleted: false
    }).sort('createdAt');

    if (firstMessage) {
      milestones.push({
        type: 'first_message',
        date: firstMessage.createdAt,
        description: 'Your first message together 💕'
      });
    }

    // Message count milestones
    const messageCounts = [100, 500, 1000, 5000, 10000];
    for (const count of messageCounts) {
      const milestone = await Message.findOne({
        chat: chatId,
        isDeleted: false
      })
      .sort('createdAt')
      .skip(count - 1);

      if (milestone) {
        milestones.push({
          type: 'message_count',
          date: milestone.createdAt,
          description: `${count.toLocaleString()} messages exchanged! 🎉`,
          count
        });
      }
    }

    // Longest conversation streak
    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    })
    .select('createdAt')
    .sort('createdAt');

    let currentStreak = 1;
    let longestStreak = 1;
    let streakStart = messages[0]?.createdAt;
    let longestStreakStart = streakStart;

    for (let i = 1; i < messages.length; i++) {
      const dayDiff = Math.floor(
        (messages[i].createdAt - messages[i-1].createdAt) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff <= 1) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
          longestStreakStart = streakStart;
        }
      } else {
        currentStreak = 1;
        streakStart = messages[i].createdAt;
      }
    }

    if (longestStreak > 7) {
      milestones.push({
        type: 'conversation_streak',
        date: longestStreakStart,
        description: `${longestStreak} day conversation streak! 🔥`,
        streakDays: longestStreak
      });
    }

    // Sort milestones by date
    milestones.sort((a, b) => a.date - b.date);

    res.status(200).json({
      success: true,
      milestones,
      metadata: chat.metadata
    });
  } catch (error) {
    console.error('Error getting milestones:', error);
    res.status(500).json({ error: 'Failed to get relationship milestones' });
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
