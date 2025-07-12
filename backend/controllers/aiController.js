const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { geminiService } = require('../services/geminiService');

// Get AI-powered relationship insights
exports.getRelationshipInsights = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    }).populate('participants', 'name');

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get recent messages and stats
    const recentMessages = await Message.find({
      chat: chatId,
      isDeleted: false
    })
    .populate('sender', 'name')
    .sort('-createdAt')
    .limit(50);

    // Get basic stats
    const totalMessages = await Message.countDocuments({
      chat: chatId,
      isDeleted: false
    });

    const messagesBySender = await Message.aggregate([
      {
        $match: {
          chat: chat._id,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
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
            name: '$senderInfo.name'
          },
          count: 1
        }
      }
    ]);

    const daysSinceStart = Math.ceil(
      (new Date() - new Date(chat.createdAt)) / (1000 * 60 * 60 * 24)
    );
    const avgMessagesPerDay = totalMessages / daysSinceStart;

    const stats = {
      totalMessages,
      avgMessagesPerDay: Math.round(avgMessagesPerDay * 10) / 10,
      messagesBySender
    };

    // Get AI insights
    const insights = await geminiService.analyzeRelationshipHealth(
      recentMessages.map(m => ({
        sender: m.sender.name,
        content: { text: m.content.text }
      })),
      stats
    );

    res.status(200).json({
      success: true,
      insights,
      stats
    });
  } catch (error) {
    console.error('Error getting AI insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};

// Get AI-generated conversation starters
exports.getConversationStarters = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get recent message topics
    const recentMessages = await Message.find({
      chat: chatId,
      isDeleted: false,
      'content.type': 'text'
    })
    .select('content.text')
    .sort('-createdAt')
    .limit(30);

    // Extract topics (simple keyword extraction)
    const words = recentMessages
      .map(m => m.content.text.toLowerCase())
      .join(' ')
      .split(/\s+/)
      .filter(word => word.length > 5);

    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const recentTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // Get AI-generated starters
    const starters = await geminiService.generateConversationStarters(
      chat.metadata,
      recentTopics
    );

    res.status(200).json({
      success: true,
      conversationStarters: starters,
      basedOn: {
        recentTopics,
        metadata: chat.metadata
      }
    });
  } catch (error) {
    console.error('Error generating conversation starters:', error);
    res.status(500).json({ error: 'Failed to generate conversation starters' });
  }
};

// Get AI analysis of emoji usage
exports.getEmojiInsights = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get emoji stats
    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    }).select('content.text metadata.reactions');

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    
    const emojiCount = {};
    messages.forEach(msg => {
      const emojis = msg.content.text.match(emojiRegex) || [];
      emojis.forEach(emoji => {
        emojiCount[emoji] = (emojiCount[emoji] || 0) + 1;
      });
    });

    const topEmojis = Object.entries(emojiCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([emoji, count]) => ({ emoji, count }));

    // Get recent context
    const recentContext = messages
      .slice(-10)
      .map(m => m.content.text)
      .join(' ')
      .substring(0, 100);

    // Get AI insights
    const insights = await geminiService.analyzeEmojiMeaning(
      { topEmojis },
      recentContext
    );

    res.status(200).json({
      success: true,
      emojiInsights: insights,
      topEmojis
    });
  } catch (error) {
    console.error('Error getting emoji insights:', error);
    res.status(500).json({ error: 'Failed to analyze emoji usage' });
  }
};

// Get personalized date ideas
exports.getDateIdeas = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { location = 'local' } = req.query;
    const userId = req.userId;

    // Verify access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Extract interests from messages
    const messages = await Message.find({
      chat: chatId,
      isDeleted: false,
      'content.type': 'text'
    })
    .select('content.text')
    .limit(100);

    // Simple interest extraction (look for activity-related words)
    const interestKeywords = [
      'movie', 'film', 'restaurant', 'food', 'cooking', 'hiking', 'travel',
      'music', 'concert', 'art', 'museum', 'beach', 'park', 'game', 'sport',
      'coffee', 'wine', 'book', 'reading', 'photography', 'dance', 'yoga'
    ];

    const interests = [];
    const messageText = messages.map(m => m.content.text.toLowerCase()).join(' ');
    
    interestKeywords.forEach(keyword => {
      if (messageText.includes(keyword)) {
        interests.push(keyword);
      }
    });

    // Get AI-generated date ideas
    const dateIdeas = await geminiService.generateDateIdeas(
      messages.slice(0, 20).map(m => m.content.text),
      interests.length > 0 ? interests : ['romantic dinner', 'outdoor activities', 'cultural experiences'],
      location
    );

    res.status(200).json({
      success: true,
      dateIdeas,
      basedOn: {
        detectedInterests: interests,
        location
      }
    });
  } catch (error) {
    console.error('Error generating date ideas:', error);
    res.status(500).json({ error: 'Failed to generate date ideas' });
  }
};

// Generate memory summary
exports.generateMemorySummary = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { timeframe = 'last month' } = req.query;
    const userId = req.userId;

    // Verify access
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get messages for timeframe
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'last week':
        dateFilter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case 'last month':
        dateFilter.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
        break;
      case 'last year':
        dateFilter.createdAt = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
        break;
      default:
        dateFilter.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
    }

    const messages = await Message.find({
      chat: chatId,
      isDeleted: false,
      ...dateFilter
    })
    .populate('sender', 'name')
    .sort('createdAt')
    .limit(50);

    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          summary: 'No messages found for this timeframe.',
          highlights: []
        }
      });
    }

    // Generate AI summary
    const summary = await geminiService.summarizeMemories(
      messages.map(m => ({
        createdAt: m.createdAt,
        sender: m.sender.name,
        content: { text: m.content.text }
      })),
      timeframe
    );

    res.status(200).json({
      success: true,
      memorySummary: summary,
      timeframe,
      messageCount: messages.length
    });
  } catch (error) {
    console.error('Error generating memory summary:', error);
    res.status(500).json({ error: 'Failed to generate memory summary' });
  }
};
