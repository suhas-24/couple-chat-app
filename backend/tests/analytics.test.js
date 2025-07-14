const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');

describe('Analytics Service', () => {
  let testUser1, testUser2, testChat;
  let testMessages = [];

  beforeAll(async () => {
    // Create test users
    testUser1 = new User({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      isEmailVerified: true
    });
    await testUser1.save();

    testUser2 = new User({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'password123',
      isEmailVerified: true
    });
    await testUser2.save();

    // Create test chat
    testChat = new Chat({
      participants: [testUser1._id, testUser2._id],
      chatName: 'Test Analytics Chat'
    });
    await testChat.save();

    // Create test messages with various patterns
    const messageTexts = [
      'Hello there! How are you doing today? 😊',
      'I am doing great! Thanks for asking ❤️',
      'What are your plans for the weekend?',
      'I was thinking we could go to the beach 🏖️',
      'That sounds amazing! I love spending time with you',
      'You make me so happy every day 💕',
      'I love you too! You are the best thing in my life',
      'Can\'t wait to see you tomorrow',
      'Me too! This is going to be an amazing day',
      'Happy anniversary my love! One year together! 🎉',
      'Best year of my life! Here\'s to many more ❤️',
      'I got the promotion at work! 🎊',
      'Congratulations! I am so proud of you!',
      'Let\'s celebrate tonight with dinner',
      'Perfect! I\'ll make reservations at our favorite place',
      'You are so thoughtful and caring',
      'I try my best for you because you deserve everything',
      'We should plan our vacation soon',
      'Yes! I was thinking about that mountain trip',
      'That would be perfect for some quality time together'
    ];

    // Create messages with different timestamps and senders
    for (let i = 0; i < messageTexts.length; i++) {
      const message = new Message({
        chat: testChat._id,
        sender: i % 2 === 0 ? testUser1._id : testUser2._id,
        content: {
          text: messageTexts[i],
          type: 'text'
        },
        createdAt: new Date(Date.now() - (messageTexts.length - i) * 24 * 60 * 60 * 1000) // Spread over days
      });
      await message.save();
      testMessages.push(message);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await Message.deleteMany({});
    await Chat.deleteMany({});
    await User.deleteMany({});
    cacheService.clear();
  });

  beforeEach(() => {
    // Clear cache before each test
    cacheService.clear();
  });

  describe('generateChatAnalytics', () => {
    test('should generate comprehensive analytics for a chat', async () => {
      const result = await analyticsService.generateChatAnalytics(testChat._id.toString());

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalMessages).toBe(testMessages.length);
      expect(result.data.basicStats).toBeDefined();
      expect(result.data.activityPatterns).toBeDefined();
      expect(result.data.wordAnalysis).toBeDefined();
      expect(result.data.milestones).toBeDefined();
    });

    test('should handle date range filtering', async () => {
      const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const endDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const result = await analyticsService.generateChatAnalytics(testChat._id.toString(), {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      expect(result.success).toBe(true);
      expect(result.data.totalMessages).toBeLessThan(testMessages.length);
    });

    test('should handle empty chat gracefully', async () => {
      const emptyChat = new Chat({
        participants: [testUser1._id, testUser2._id],
        chatName: 'Empty Chat'
      });
      await emptyChat.save();

      const result = await analyticsService.generateChatAnalytics(emptyChat._id.toString());

      expect(result.success).toBe(true);
      expect(result.data.totalMessages).toBe(0);
      expect(result.data.dateRange).toBeNull();

      await Chat.findByIdAndDelete(emptyChat._id);
    });

    test('should allow selective analytics generation', async () => {
      const result = await analyticsService.generateChatAnalytics(testChat._id.toString(), {
        includeWordAnalysis: false,
        includeActivityPatterns: true,
        includeMilestones: false
      });

      expect(result.success).toBe(true);
      expect(result.data.wordAnalysis).toEqual({});
      expect(result.data.activityPatterns).toBeDefined();
      expect(result.data.milestones).toEqual([]);
    });
  });

  describe('calculateBasicStats', () => {
    test('should calculate correct basic statistics', async () => {
      const messages = await Message.find({ chat: testChat._id }).populate('sender', 'name');
      const stats = await analyticsService.calculateBasicStats(messages);

      expect(stats.totalMessages).toBe(messages.length);
      expect(stats.messagesByUser).toBeDefined();
      expect(Object.keys(stats.messagesByUser)).toHaveLength(2); // Two users
      expect(stats.averageMessagesPerDay).toBeGreaterThan(0);
      expect(stats.longestConversation).toBeDefined();
      expect(stats.responseTimeStats).toBeDefined();
    });

    test('should handle single message correctly', async () => {
      const singleMessage = [{
        sender: { _id: testUser1._id, name: testUser1.name },
        content: { text: 'Single message' },
        createdAt: new Date()
      }];

      const stats = await analyticsService.calculateBasicStats(singleMessage);

      expect(stats.totalMessages).toBe(1);
      expect(stats.averageMessagesPerDay).toBe(1);
    });
  });

  describe('calculateActivityPatterns', () => {
    test('should calculate activity patterns correctly', async () => {
      const messages = await Message.find({ chat: testChat._id });
      const patterns = await analyticsService.calculateActivityPatterns(messages);

      expect(patterns.hourlyActivity).toHaveLength(24);
      expect(patterns.dailyActivity).toBeDefined();
      expect(patterns.monthlyActivity).toBeDefined();
      expect(patterns.mostActiveHour).toBeGreaterThanOrEqual(0);
      expect(patterns.mostActiveHour).toBeLessThan(24);
      expect(patterns.mostActiveDay).toBeDefined();
      expect(patterns.activityTrends).toBeDefined();
    });

    test('should identify most active periods', async () => {
      const messages = await Message.find({ chat: testChat._id });
      const patterns = await analyticsService.calculateActivityPatterns(messages);

      const totalHourlyActivity = patterns.hourlyActivity.reduce((sum, count) => sum + count, 0);
      expect(totalHourlyActivity).toBe(messages.length);

      const totalDailyActivity = Object.values(patterns.dailyActivity).reduce((sum, count) => sum + count, 0);
      expect(totalDailyActivity).toBe(messages.length);
    });
  });

  describe('performWordAnalysis', () => {
    test('should analyze words correctly', async () => {
      const messages = await Message.find({ chat: testChat._id }).populate('sender', 'name');
      const analysis = await analyticsService.performWordAnalysis(messages);

      expect(analysis.totalWords).toBeGreaterThan(0);
      expect(analysis.uniqueWords).toBeGreaterThan(0);
      expect(analysis.mostUsedWords).toBeDefined();
      expect(analysis.wordsByUser).toBeDefined();
      expect(analysis.sentiment).toBeDefined();
      expect(analysis.emojiUsage).toBeDefined();
    });

    test('should detect emojis correctly', async () => {
      const messages = await Message.find({ chat: testChat._id }).populate('sender', 'name');
      const analysis = await analyticsService.performWordAnalysis(messages);

      expect(Object.keys(analysis.emojiUsage).length).toBeGreaterThan(0);
      expect(analysis.emojiUsage['😊']).toBeDefined();
      expect(analysis.emojiUsage['❤️']).toBeDefined();
    });

    test('should perform sentiment analysis', async () => {
      const messages = await Message.find({ chat: testChat._id }).populate('sender', 'name');
      const analysis = await analyticsService.performWordAnalysis(messages);

      expect(analysis.sentiment.positive).toBeGreaterThan(0);
      expect(analysis.sentiment.neutral).toBeGreaterThanOrEqual(0);
      expect(analysis.sentiment.negative).toBeGreaterThanOrEqual(0);
    });

    test('should extract meaningful phrases', async () => {
      const messages = await Message.find({ chat: testChat._id }).populate('sender', 'name');
      const analysis = await analyticsService.performWordAnalysis(messages);

      expect(analysis.topPhrases).toBeDefined();
      expect(Array.isArray(analysis.topPhrases)).toBe(true);
    });
  });

  describe('detectRelationshipMilestones', () => {
    test('should detect relationship milestones', async () => {
      const messages = await Message.find({ chat: testChat._id }).populate('sender', 'name');
      const milestones = await analyticsService.detectRelationshipMilestones(messages, testChat._id.toString());

      expect(Array.isArray(milestones)).toBe(true);
      expect(milestones.length).toBeGreaterThan(0);

      // Check for anniversary milestone
      const anniversaryMilestone = milestones.find(m => m.type === 'anniversary');
      expect(anniversaryMilestone).toBeDefined();
      expect(anniversaryMilestone.significance).toBeDefined();
    });

    test('should calculate milestone significance correctly', async () => {
      const highSignificanceMessages = [
        { content: { text: 'Will you marry me? I love you so much!' }, sender: { name: 'Alice' } },
        { content: { text: 'Yes! Of course! This is the best day ever!' }, sender: { name: 'Bob' } }
      ];

      const significance = analyticsService.calculateMilestoneSignificance(highSignificanceMessages, 'proposal');
      expect(significance).toBe('high');
    });

    test('should generate appropriate milestone descriptions', async () => {
      const description = analyticsService.generateMilestoneDescription('anniversary', []);
      expect(description).toContain('anniversary');

      const proposalDescription = analyticsService.generateMilestoneDescription('proposal', []);
      expect(proposalDescription).toContain('engaged');
    });
  });

  describe('Language and Text Processing', () => {
    test('should detect language correctly', () => {
      expect(analyticsService.detectLanguage('Hello world')).toBe('english');
      expect(analyticsService.detectLanguage('வணக்கம்')).toBe('tamil');
      expect(analyticsService.detectLanguage('Hello வணக்கம்')).toBe('mixed');
    });

    test('should extract words correctly', () => {
      const words = analyticsService.extractWords('Hello world! How are you?');
      expect(words).toContain('hello');
      expect(words).toContain('world');
      expect(words).not.toContain('are'); // Stop word should be filtered
    });

    test('should identify stop words', () => {
      expect(analyticsService.isStopWord('the')).toBe(true);
      expect(analyticsService.isStopWord('hello')).toBe(false);
      expect(analyticsService.isStopWord('love')).toBe(false);
    });

    test('should analyze sentiment correctly', () => {
      expect(analyticsService.analyzeSentiment('I love you so much! ❤️')).toBe('positive');
      expect(analyticsService.analyzeSentiment('I am so sad and disappointed 😢')).toBe('negative');
      expect(analyticsService.analyzeSentiment('The weather is okay today')).toBe('neutral');
    });

    test('should count words accurately', () => {
      expect(analyticsService.countWords('Hello world')).toBe(2);
      expect(analyticsService.countWords('  Hello   world  ')).toBe(2);
      expect(analyticsService.countWords('')).toBe(0);
    });
  });

  describe('Response Time Calculations', () => {
    test('should calculate response times correctly', async () => {
      const messages = await Message.find({ chat: testChat._id }).populate('sender', 'name');
      const responseStats = analyticsService.calculateResponseTimes(messages);

      expect(responseStats.average).toBeGreaterThanOrEqual(0);
      expect(responseStats.median).toBeGreaterThanOrEqual(0);
      expect(responseStats.fastest).toBeGreaterThanOrEqual(0);
      expect(responseStats.slowest).toBeGreaterThanOrEqual(responseStats.fastest);
    });

    test('should handle messages from same sender', () => {
      const sameUserMessages = [
        { sender: { _id: 'user1' }, createdAt: new Date('2023-01-01T10:00:00Z') },
        { sender: { _id: 'user1' }, createdAt: new Date('2023-01-01T10:05:00Z') },
        { sender: { _id: 'user2' }, createdAt: new Date('2023-01-01T10:10:00Z') }
      ];

      const responseStats = analyticsService.calculateResponseTimes(sameUserMessages);
      expect(responseStats.average).toBeGreaterThan(0);
    });
  });

  describe('Activity Trends', () => {
    test('should calculate activity trends for last 30 days', async () => {
      const messages = await Message.find({ chat: testChat._id });
      const trends = analyticsService.calculateActivityTrends(messages);

      expect(trends).toHaveLength(30);
      expect(trends[0]).toHaveProperty('date');
      expect(trends[0]).toHaveProperty('messageCount');
    });

    test('should handle messages outside 30-day window', () => {
      const oldMessages = [
        { createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) }, // 40 days ago
        { createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }   // 5 days ago
      ];

      const trends = analyticsService.calculateActivityTrends(oldMessages);
      expect(trends).toHaveLength(30);
      
      // Should only count the recent message
      const totalMessages = trends.reduce((sum, day) => sum + day.messageCount, 0);
      expect(totalMessages).toBe(1);
    });
  });
});

describe('Cache Service', () => {
  beforeEach(() => {
    cacheService.clear();
  });

  describe('Basic Cache Operations', () => {
    test('should set and get values correctly', () => {
      cacheService.set('test-key', 'test-value');
      expect(cacheService.get('test-key')).toBe('test-value');
    });

    test('should return null for non-existent keys', () => {
      expect(cacheService.get('non-existent')).toBeNull();
    });

    test('should handle TTL expiration', (done) => {
      cacheService.set('expire-key', 'expire-value', 100); // 100ms TTL
      
      setTimeout(() => {
        expect(cacheService.get('expire-key')).toBeNull();
        done();
      }, 150);
    });

    test('should check key existence correctly', () => {
      cacheService.set('exists-key', 'value');
      expect(cacheService.has('exists-key')).toBe(true);
      expect(cacheService.has('non-existent')).toBe(false);
    });

    test('should delete keys correctly', () => {
      cacheService.set('delete-key', 'value');
      expect(cacheService.has('delete-key')).toBe(true);
      
      cacheService.delete('delete-key');
      expect(cacheService.has('delete-key')).toBe(false);
    });

    test('should clear all cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      cacheService.clear();
      
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
    });
  });

  describe('getOrSet functionality', () => {
    test('should execute function on cache miss', async () => {
      const mockFn = jest.fn().mockResolvedValue('computed-value');
      
      const result = await cacheService.getOrSet('compute-key', mockFn);
      
      expect(result).toBe('computed-value');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should return cached value on cache hit', async () => {
      const mockFn = jest.fn().mockResolvedValue('computed-value');
      
      // First call - cache miss
      await cacheService.getOrSet('compute-key', mockFn);
      
      // Second call - cache hit
      const result = await cacheService.getOrSet('compute-key', mockFn);
      
      expect(result).toBe('computed-value');
      expect(mockFn).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Key Generation', () => {
    test('should generate analytics keys correctly', () => {
      const key = cacheService.generateAnalyticsKey('chat123', {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        includeWordAnalysis: true
      });
      
      expect(key).toContain('analytics');
      expect(key).toContain('chat123');
      expect(key).toContain('2023-01-01');
    });

    test('should generate word frequency keys correctly', () => {
      const key = cacheService.generateWordFrequencyKey('chat123', {
        limit: 100
      });
      
      expect(key).toContain('wordfreq');
      expect(key).toContain('chat123');
      expect(key).toContain('100');
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate analytics cache for a chat', () => {
      cacheService.set('analytics:chat123:key1', 'value1');
      cacheService.set('analytics:chat123:key2', 'value2');
      cacheService.set('analytics:chat456:key3', 'value3');
      
      cacheService.invalidateAnalyticsCache('chat123');
      
      expect(cacheService.get('analytics:chat123:key1')).toBeNull();
      expect(cacheService.get('analytics:chat123:key2')).toBeNull();
      expect(cacheService.get('analytics:chat456:key3')).toBe('value3');
    });
  });

  describe('Cache Statistics', () => {
    test('should provide cache statistics', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const stats = cacheService.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });
});