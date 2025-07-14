/**
 * Analytics Service
 * Handles comprehensive analytics data processing for chat conversations
 */

const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

class AnalyticsService {
  /**
   * Generate comprehensive analytics for a chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Analytics data
   */
  async generateChatAnalytics(chatId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      includeWordAnalysis = true,
      includeActivityPatterns = true,
      includeMilestones = true
    } = options;

    try {
      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const messageFilter = { chat: chatId };
      if (Object.keys(dateFilter).length > 0) {
        messageFilter.createdAt = dateFilter;
      }

      // Get all messages for the chat
      const messages = await Message.find(messageFilter)
        .populate('sender', 'name')
        .sort({ createdAt: 1 });

      if (messages.length === 0) {
        return {
          success: true,
          data: {
            totalMessages: 0,
            dateRange: null,
            basicStats: {},
            activityPatterns: {},
            wordAnalysis: {},
            milestones: []
          }
        };
      }

      // Calculate basic statistics
      const basicStats = await this.calculateBasicStats(messages);

      // Calculate activity patterns
      const activityPatterns = includeActivityPatterns 
        ? await this.calculateActivityPatterns(messages)
        : {};

      // Perform word analysis
      const wordAnalysis = includeWordAnalysis 
        ? await this.performWordAnalysis(messages)
        : {};

      // Detect relationship milestones
      const milestones = includeMilestones 
        ? await this.detectRelationshipMilestones(messages, chatId)
        : [];

      return {
        success: true,
        data: {
          totalMessages: messages.length,
          dateRange: {
            start: messages[0].createdAt,
            end: messages[messages.length - 1].createdAt
          },
          basicStats,
          activityPatterns,
          wordAnalysis,
          milestones
        }
      };
    } catch (error) {
      console.error('Analytics generation error:', error);
      return {
        success: false,
        error: 'Failed to generate analytics'
      };
    }
  }

  /**
   * Calculate basic message statistics
   * @param {Array} messages - Array of message objects
   * @returns {Object} Basic statistics
   */
  async calculateBasicStats(messages) {
    const stats = {
      totalMessages: messages.length,
      messagesByUser: {},
      averageMessagesPerDay: 0,
      longestConversation: { date: null, messageCount: 0 },
      averageMessageLength: 0,
      totalWords: 0,
      responseTimeStats: {
        average: 0,
        median: 0,
        fastest: null,
        slowest: null
      }
    };

    // Calculate messages by user
    const userMessageCounts = {};
    let totalMessageLength = 0;
    let totalWords = 0;

    messages.forEach(message => {
      const userId = message.sender._id.toString();
      const userName = message.sender.name;
      
      if (!userMessageCounts[userId]) {
        userMessageCounts[userId] = {
          name: userName,
          count: 0,
          totalLength: 0,
          words: 0
        };
      }
      
      userMessageCounts[userId].count++;
      
      const messageLength = message.content.text.length;
      const wordCount = this.countWords(message.content.text);
      
      userMessageCounts[userId].totalLength += messageLength;
      userMessageCounts[userId].words += wordCount;
      
      totalMessageLength += messageLength;
      totalWords += wordCount;
    });

    stats.messagesByUser = userMessageCounts;
    stats.averageMessageLength = Math.round(totalMessageLength / messages.length);
    stats.totalWords = totalWords;

    // Calculate average messages per day
    if (messages.length > 1) {
      const firstMessage = new Date(messages[0].createdAt);
      const lastMessage = new Date(messages[messages.length - 1].createdAt);
      const daysDiff = Math.ceil((lastMessage - firstMessage) / (1000 * 60 * 60 * 24)) || 1;
      stats.averageMessagesPerDay = Math.round(messages.length / daysDiff);
    }

    // Find longest conversation (most messages in a single day)
    const messagesByDate = {};
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      messagesByDate[date] = (messagesByDate[date] || 0) + 1;
    });

    let maxMessages = 0;
    let maxDate = null;
    Object.entries(messagesByDate).forEach(([date, count]) => {
      if (count > maxMessages) {
        maxMessages = count;
        maxDate = date;
      }
    });

    stats.longestConversation = {
      date: maxDate,
      messageCount: maxMessages
    };

    // Calculate response time statistics
    stats.responseTimeStats = this.calculateResponseTimes(messages);

    return stats;
  }

  /**
   * Calculate activity patterns
   * @param {Array} messages - Array of message objects
   * @returns {Object} Activity patterns
   */
  async calculateActivityPatterns(messages) {
    const patterns = {
      hourlyActivity: new Array(24).fill(0),
      dailyActivity: {
        Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0,
        Friday: 0, Saturday: 0, Sunday: 0
      },
      monthlyActivity: {},
      mostActiveHour: 0,
      mostActiveDay: '',
      activityTrends: []
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    messages.forEach(message => {
      const date = new Date(message.createdAt);
      const hour = date.getHours();
      const dayName = dayNames[date.getDay()];
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Hourly activity
      patterns.hourlyActivity[hour]++;

      // Daily activity
      patterns.dailyActivity[dayName]++;

      // Monthly activity
      patterns.monthlyActivity[monthKey] = (patterns.monthlyActivity[monthKey] || 0) + 1;
    });

    // Find most active hour
    patterns.mostActiveHour = patterns.hourlyActivity.indexOf(Math.max(...patterns.hourlyActivity));

    // Find most active day
    patterns.mostActiveDay = Object.entries(patterns.dailyActivity)
      .reduce((a, b) => patterns.dailyActivity[a[0]] > patterns.dailyActivity[b[0]] ? a : b)[0];

    // Calculate activity trends (last 30 days)
    patterns.activityTrends = this.calculateActivityTrends(messages);

    return patterns;
  }

  /**
   * Perform comprehensive word analysis
   * @param {Array} messages - Array of message objects
   * @returns {Object} Word analysis results
   */
  async performWordAnalysis(messages) {
    const analysis = {
      totalWords: 0,
      uniqueWords: 0,
      mostUsedWords: [],
      wordsByUser: {},
      sentiment: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      languageDistribution: {
        english: 0,
        tamil: 0,
        mixed: 0
      },
      emojiUsage: {},
      topPhrases: []
    };

    const wordFrequency = {};
    const userWordFrequency = {};
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

    messages.forEach(message => {
      const text = message.content.text;
      const userId = message.sender._id.toString();
      const userName = message.sender.name;

      // Initialize user word tracking
      if (!userWordFrequency[userId]) {
        userWordFrequency[userId] = {
          name: userName,
          words: {},
          totalWords: 0
        };
      }

      // Extract and count words
      const words = this.extractWords(text);
      words.forEach(word => {
        const lowerWord = word.toLowerCase();
        
        // Global word frequency
        wordFrequency[lowerWord] = (wordFrequency[lowerWord] || 0) + 1;
        
        // User-specific word frequency
        userWordFrequency[userId].words[lowerWord] = 
          (userWordFrequency[userId].words[lowerWord] || 0) + 1;
        userWordFrequency[userId].totalWords++;
        
        analysis.totalWords++;
      });

      // Extract emojis
      const emojis = text.match(emojiRegex) || [];
      emojis.forEach(emoji => {
        analysis.emojiUsage[emoji] = (analysis.emojiUsage[emoji] || 0) + 1;
      });

      // Detect language
      const language = this.detectLanguage(text);
      analysis.languageDistribution[language]++;

      // Basic sentiment analysis
      const sentiment = this.analyzeSentiment(text);
      analysis.sentiment[sentiment]++;
    });

    // Calculate unique words
    analysis.uniqueWords = Object.keys(wordFrequency).length;

    // Get most used words (excluding common stop words)
    analysis.mostUsedWords = this.getMostUsedWords(wordFrequency, 50);

    // Set words by user
    analysis.wordsByUser = userWordFrequency;

    // Get top phrases
    analysis.topPhrases = this.extractTopPhrases(messages);

    return analysis;
  }

  /**
   * Detect relationship milestones from conversation patterns
   * @param {Array} messages - Array of message objects
   * @param {string} chatId - Chat ID
   * @returns {Array} Detected milestones
   */
  async detectRelationshipMilestones(messages, chatId) {
    const milestones = [];

    try {
      // Get chat information for context
      const chat = await Chat.findById(chatId).populate('participants');
      
      // Milestone detection patterns
      const milestonePatterns = {
        anniversary: /anniversary|anni|celebrate|special day|one year|two year|three year/i,
        birthday: /birthday|bday|born|age|cake|party/i,
        vacation: /vacation|trip|travel|holiday|beach|mountain|flight/i,
        achievement: /promotion|job|graduation|degree|achievement|success|proud/i,
        firstTime: /first time|first|never done|new experience/i,
        iLoveYou: /i love you|love you|love u|❤️|💕|💖/i,
        proposal: /marry|proposal|ring|engaged|engagement|wedding/i,
        moving: /move|moving|new place|apartment|house|home/i
      };

      // Group messages by date for milestone detection
      const messagesByDate = {};
      messages.forEach(message => {
        const date = new Date(message.createdAt).toDateString();
        if (!messagesByDate[date]) {
          messagesByDate[date] = [];
        }
        messagesByDate[date].push(message);
      });

      // Analyze each date for potential milestones
      Object.entries(messagesByDate).forEach(([date, dayMessages]) => {
        const combinedText = dayMessages.map(m => m.content.text).join(' ').toLowerCase();
        
        Object.entries(milestonePatterns).forEach(([type, pattern]) => {
          if (pattern.test(combinedText)) {
            // Calculate significance based on message frequency and keywords
            const significance = this.calculateMilestoneSignificance(dayMessages, type);
            
            milestones.push({
              date: new Date(date),
              type,
              description: this.generateMilestoneDescription(type, dayMessages),
              significance,
              messageCount: dayMessages.length,
              participants: [...new Set(dayMessages.map(m => m.sender.name))]
            });
          }
        });
      });

      // Sort milestones by date and significance
      milestones.sort((a, b) => {
        if (a.significance !== b.significance) {
          return b.significance - a.significance; // Higher significance first
        }
        return new Date(b.date) - new Date(a.date); // More recent first
      });

      // Limit to top 20 milestones
      return milestones.slice(0, 20);
    } catch (error) {
      console.error('Milestone detection error:', error);
      return [];
    }
  }

  /**
   * Calculate response time statistics
   * @param {Array} messages - Array of message objects
   * @returns {Object} Response time statistics
   */
  calculateResponseTimes(messages) {
    const responseTimes = [];
    
    for (let i = 1; i < messages.length; i++) {
      const currentMessage = messages[i];
      const previousMessage = messages[i - 1];
      
      // Only calculate if messages are from different users
      if (currentMessage.sender._id.toString() !== previousMessage.sender._id.toString()) {
        const responseTime = new Date(currentMessage.createdAt) - new Date(previousMessage.createdAt);
        
        // Only consider response times under 24 hours as meaningful
        if (responseTime < 24 * 60 * 60 * 1000) {
          responseTimes.push(responseTime);
        }
      }
    }

    if (responseTimes.length === 0) {
      return {
        average: 0,
        median: 0,
        fastest: null,
        slowest: null
      };
    }

    responseTimes.sort((a, b) => a - b);
    
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const median = responseTimes[Math.floor(responseTimes.length / 2)];
    
    return {
      average: Math.round(average / 1000 / 60), // Convert to minutes
      median: Math.round(median / 1000 / 60), // Convert to minutes
      fastest: Math.round(responseTimes[0] / 1000 / 60), // Convert to minutes
      slowest: Math.round(responseTimes[responseTimes.length - 1] / 1000 / 60) // Convert to minutes
    };
  }

  /**
   * Calculate activity trends for the last 30 days
   * @param {Array} messages - Array of message objects
   * @returns {Array} Activity trend data
   */
  calculateActivityTrends(messages) {
    const trends = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Filter messages from last 30 days
    const recentMessages = messages.filter(message => 
      new Date(message.createdAt) >= thirtyDaysAgo
    );

    // Group by date
    const messagesByDate = {};
    recentMessages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      messagesByDate[date] = (messagesByDate[date] || 0) + 1;
    });

    // Create trend data for each day
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateString = date.toDateString();
      
      trends.push({
        date: date.toISOString().split('T')[0],
        messageCount: messagesByDate[dateString] || 0
      });
    }

    return trends;
  }

  /**
   * Extract words from text, handling multi-language content
   * @param {string} text - Input text
   * @returns {Array} Array of words
   */
  extractWords(text) {
    // Remove URLs, mentions, and special characters but keep Tamil characters
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/[^\w\s\u0B80-\u0BFF]/g, ' '); // Keep only word characters and Tamil Unicode range
    
    return cleanText
      .split(/\s+/)
      .filter(word => word.length > 1) // Filter out single characters
      .filter(word => !this.isStopWord(word));
  }

  /**
   * Check if a word is a stop word
   * @param {string} word - Word to check
   * @returns {boolean} True if stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
      'what', 'when', 'where', 'why', 'how', 'who', 'which', 'whose', 'whom',
      'yes', 'no', 'not', 'so', 'too', 'very', 'just', 'now', 'then', 'here', 'there'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Get most used words excluding stop words
   * @param {Object} wordFrequency - Word frequency object
   * @param {number} limit - Number of words to return
   * @returns {Array} Most used words
   */
  getMostUsedWords(wordFrequency, limit = 50) {
    return Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Extract top phrases from messages
   * @param {Array} messages - Array of message objects
   * @returns {Array} Top phrases
   */
  extractTopPhrases(messages) {
    const phrases = {};
    
    messages.forEach(message => {
      const text = message.content.text.toLowerCase();
      
      // Extract 2-3 word phrases
      const words = text.split(/\s+/).filter(word => word.length > 1);
      
      for (let i = 0; i < words.length - 1; i++) {
        // 2-word phrases
        const phrase2 = `${words[i]} ${words[i + 1]}`;
        if (!this.isStopPhrase(phrase2)) {
          phrases[phrase2] = (phrases[phrase2] || 0) + 1;
        }
        
        // 3-word phrases
        if (i < words.length - 2) {
          const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (!this.isStopPhrase(phrase3)) {
            phrases[phrase3] = (phrases[phrase3] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(phrases)
      .filter(([phrase, count]) => count > 2) // Only phrases used more than twice
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([phrase, count]) => ({ phrase, count }));
  }

  /**
   * Check if a phrase contains only stop words
   * @param {string} phrase - Phrase to check
   * @returns {boolean} True if stop phrase
   */
  isStopPhrase(phrase) {
    const words = phrase.split(' ');
    return words.every(word => this.isStopWord(word));
  }

  /**
   * Detect language of text (basic implementation)
   * @param {string} text - Input text
   * @returns {string} Detected language
   */
  detectLanguage(text) {
    // Tamil Unicode range: \u0B80-\u0BFF
    const tamilChars = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = tamilChars + englishChars;
    
    if (totalChars === 0) return 'mixed';
    
    const tamilRatio = tamilChars / totalChars;
    
    if (tamilRatio > 0.7) return 'tamil';
    if (tamilRatio > 0.1) return 'mixed';
    return 'english';
  }

  /**
   * Basic sentiment analysis
   * @param {string} text - Input text
   * @returns {string} Sentiment (positive, negative, neutral)
   */
  analyzeSentiment(text) {
    const positiveWords = [
      'love', 'happy', 'good', 'great', 'awesome', 'amazing', 'wonderful', 'beautiful',
      'perfect', 'excellent', 'fantastic', 'brilliant', 'lovely', 'sweet', 'cute',
      '❤️', '😍', '😊', '😘', '💕', '💖', '💗', '💝', '🥰', '😄', '😃', '😀'
    ];
    
    const negativeWords = [
      'sad', 'angry', 'bad', 'terrible', 'awful', 'hate', 'horrible', 'disgusting',
      'annoying', 'frustrated', 'disappointed', 'upset', 'worried', 'stressed',
      '😢', '😭', '😠', '😡', '😞', '😔', '😟', '😰', '😨', '😱'
    ];
    
    const lowerText = text.toLowerCase();
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate milestone significance
   * @param {Array} messages - Messages from the milestone date
   * @param {string} type - Milestone type
   * @returns {string} Significance level
   */
  calculateMilestoneSignificance(messages, type) {
    const messageCount = messages.length;
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.text.length, 0);
    
    // High significance criteria
    if (type === 'proposal' || type === 'iLoveYou' || messageCount > 50 || totalLength > 2000) {
      return 'high';
    }
    
    // Medium significance criteria
    if (type === 'anniversary' || type === 'birthday' || messageCount > 20 || totalLength > 1000) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate milestone description
   * @param {string} type - Milestone type
   * @param {Array} messages - Messages from the milestone date
   * @returns {string} Milestone description
   */
  generateMilestoneDescription(type, messages) {
    const descriptions = {
      anniversary: 'Celebrated an anniversary together',
      birthday: 'Celebrated a birthday',
      vacation: 'Went on a trip or vacation',
      achievement: 'Celebrated an achievement or success',
      firstTime: 'Experienced something new together',
      iLoveYou: 'Expressed love for each other',
      proposal: 'Got engaged or talked about marriage',
      moving: 'Moved to a new place together'
    };
    
    return descriptions[type] || 'Had a meaningful conversation';
  }

  /**
   * Count words in text
   * @param {string} text - Input text
   * @returns {number} Word count
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

module.exports = new AnalyticsService();