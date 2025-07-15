/**
 * AI Service Tests
 * Comprehensive tests for AI-powered features including Gemini integration
 */

const request = require('supertest');
const app = require('../app');
const { User, Chat, Message } = require('../models');
const { geminiService } = require('../services/geminiService');
const mongoose = require('mongoose');

describe('AI Service Integration Tests', () => {
  let authToken;
  let userId;
  let partnerId;
  let chatId;
  let testMessages;

  beforeAll(async () => {
    // Create test users
    const user = new User({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      isEmailVerified: true
    });
    await user.save();
    userId = user._id;

    const partner = new User({
      name: 'Test Partner',
      email: 'partner@example.com',
      password: 'password123',
      isEmailVerified: true
    });
    await partner.save();
    partnerId = partner._id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'password123'
      });

    authToken = loginResponse.headers['set-cookie'];

    // Create test chat
    const chat = new Chat({
      participants: [userId, partnerId],
      chatName: 'Test Chat',
      metadata: {
        relationshipStartDate: new Date('2023-01-01'),
        anniversaryDate: new Date('2024-01-01'),
        theme: 'romantic'
      }
    });
    await chat.save();
    chatId = chat._id;

    // Create test messages
    testMessages = [
      {
        chat: chatId,
        sender: userId,
        content: { text: 'Hello love! How was your day? 😊', type: 'text' },
        createdAt: new Date('2024-01-01T10:00:00Z')
      },
      {
        chat: chatId,
        sender: partnerId,
        content: { text: 'Hi darling! It was great, thanks for asking ❤️', type: 'text' },
        createdAt: new Date('2024-01-01T10:05:00Z')
      },
      {
        chat: chatId,
        sender: userId,
        content: { text: 'I love you so much! Can\'t wait to see you tonight', type: 'text' },
        createdAt: new Date('2024-01-01T10:10:00Z')
      },
      {
        chat: chatId,
        sender: partnerId,
        content: { text: 'I love you too! What should we cook for dinner?', type: 'text' },
        createdAt: new Date('2024-01-01T10:15:00Z')
      },
      {
        chat: chatId,
        sender: userId,
        content: { text: 'How about pasta? We could try that new recipe we found', type: 'text' },
        createdAt: new Date('2024-01-01T10:20:00Z')
      }
    ];

    await Message.insertMany(testMessages);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
  });

  describe('Gemini Service Configuration', () => {
    test('should validate API configuration', () => {
      // Test with no API key
      const serviceWithoutKey = new (require('../services/geminiService').GeminiService)(null);
      expect(serviceWithoutKey.isConfigured()).toBe(false);

      // Test with placeholder API key
      const serviceWithPlaceholder = new (require('../services/geminiService').GeminiService)('your-google-gemini-api-key-here');
      expect(serviceWithPlaceholder.isConfigured()).toBe(false);

      // Test with valid-looking API key
      const serviceWithKey = new (require('../services/geminiService').GeminiService)('AIzaSyDummyKeyForTesting123456789');
      expect(serviceWithKey.isConfigured()).toBe(true);
    });

    test('should generate proper cache keys', () => {
      const prompt = 'Test prompt';
      const systemInstruction = 'Test instruction';
      const chatHistory = [{ role: 'user', content: 'Test' }];
      
      const cacheKey = geminiService.generateCacheKey(prompt, systemInstruction, chatHistory);
      expect(cacheKey).toMatch(/^ai:gemini:/);
      expect(cacheKey.length).toBeGreaterThan(10);
    });

    test('should handle error enhancement correctly', () => {
      const apiKeyError = new Error('401 Unauthorized');
      const enhancedError = geminiService.enhanceError(apiKeyError);
      expect(enhancedError.message).toContain('Invalid Gemini API key');

      const rateLimitError = new Error('429 Too Many Requests');
      const enhancedRateError = geminiService.enhanceError(rateLimitError);
      expect(enhancedRateError.message).toContain('rate limit exceeded');

      const serverError = new Error('500 Internal Server Error');
      const enhancedServerError = geminiService.enhanceError(serverError);
      expect(enhancedServerError.message).toContain('temporarily unavailable');
    });
  });

  describe('Relationship Health Analysis', () => {
    test('should calculate quantitative health metrics', () => {
      const messages = testMessages.map(msg => ({
        ...msg,
        sender: { name: msg.sender.toString() === userId.toString() ? 'Test User' : 'Test Partner' },
        createdAt: msg.createdAt
      }));

      const stats = {
        avgMessagesPerDay: 15,
        messagesByUser: {
          [userId]: { count: 3, name: 'Test User' },
          [partnerId]: { count: 2, name: 'Test Partner' }
        },
        responseTimeStats: { average: 30 }
      };

      const score = geminiService.calculateQuantitativeHealthScore(messages, stats, {
        relationshipStartDate: new Date('2023-01-01')
      });

      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
      expect(typeof score).toBe('number');
    });

    test('should calculate message balance correctly', () => {
      const balancedUsers = {
        user1: { count: 50 },
        user2: { count: 50 }
      };
      const balancedScore = geminiService.calculateMessageBalance(balancedUsers);
      expect(balancedScore).toBeCloseTo(1, 1);

      const imbalancedUsers = {
        user1: { count: 90 },
        user2: { count: 10 }
      };
      const imbalancedScore = geminiService.calculateMessageBalance(imbalancedUsers);
      expect(imbalancedScore).toBeLessThan(0.5);
    });

    test('should calculate sentiment score correctly', () => {
      const positiveMessages = [
        { content: { text: 'I love you so much! You make me happy ❤️' } },
        { content: { text: 'This is amazing! Great job!' } },
        { content: { text: 'You are wonderful and beautiful 😍' } }
      ];

      const positiveScore = geminiService.calculateSentimentScore(positiveMessages);
      expect(positiveScore).toBeGreaterThan(0.5);

      const negativeMessages = [
        { content: { text: 'I hate this situation, it\'s terrible 😢' } },
        { content: { text: 'This is awful and frustrating' } },
        { content: { text: 'I\'m so angry and disappointed 😡' } }
      ];

      const negativeScore = geminiService.calculateSentimentScore(negativeMessages);
      expect(negativeScore).toBeLessThan(0.5);
    });

    test('should analyze communication style', () => {
      const messages = [
        { content: { text: 'How are you doing today? I hope everything is going well!' } },
        { content: { text: 'That sounds amazing! I\'m so excited for you!' } },
        { content: { text: 'What do you think about this idea?' } }
      ];

      const style = geminiService.analyzeCommunicationStyle(messages);
      expect(style).toHaveProperty('questionFrequency');
      expect(style).toHaveProperty('excitementLevel');
      expect(style).toHaveProperty('averageMessageLength');
      expect(style).toHaveProperty('style');
      expect(style.questionFrequency).toBeGreaterThan(0);
      expect(style.excitementLevel).toBeGreaterThan(0);
    });
  });

  describe('AI Controller Endpoints', () => {
    test('should handle missing API key gracefully', async () => {
      // Temporarily remove API key
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const response = await request(app)
        .get(`/api/ai/${chatId}/relationship-insights`)
        .set('Cookie', authToken);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('AI service is not configured');

      // Restore API key
      process.env.GEMINI_API_KEY = originalKey;
    });

    test('should get relationship insights with proper authentication', async () => {
      const response = await request(app)
        .get(`/api/ai/${chatId}/relationship-insights`)
        .set('Cookie', authToken);

      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here') {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.insights).toBeDefined();
        expect(response.body.stats).toBeDefined();
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('AI service is not configured');
      }
    });

    test('should get conversation starters', async () => {
      const response = await request(app)
        .get(`/api/ai/${chatId}/conversation-starters`)
        .set('Cookie', authToken);

      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here') {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.conversationStarters).toBeDefined();
        expect(Array.isArray(response.body.conversationStarters)).toBe(true);
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('AI service is not configured');
      }
    });

    test('should get date ideas', async () => {
      const response = await request(app)
        .get(`/api/ai/${chatId}/date-ideas?location=local`)
        .set('Cookie', authToken);

      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here') {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.dateIdeas).toBeDefined();
        expect(Array.isArray(response.body.dateIdeas)).toBe(true);
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('AI service is not configured');
      }
    });

    test('should handle unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/ai/${chatId}/relationship-insights`);

      expect(response.status).toBe(401);
    });

    test('should handle invalid chat ID', async () => {
      const invalidChatId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/ai/${invalidChatId}/relationship-insights`)
        .set('Cookie', authToken);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized');
    });
  });

  describe('AI Chat Assistant', () => {
    test('should ask AI about chat history', async () => {
      const response = await request(app)
        .post(`/api/ai/chat/${chatId}/ask`)
        .set('Cookie', authToken)
        .send({
          question: 'How many times did we say "love" in our conversations?'
        });

      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here') {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.answer).toBeDefined();
        expect(typeof response.body.answer).toBe('string');
        expect(response.body.metadata).toBeDefined();
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('AI service is not configured');
      }
    });

    test('should get word frequency', async () => {
      const response = await request(app)
        .get(`/api/ai/chat/${chatId}/word-frequency?word=love`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.word).toBe('love');
      expect(response.body.totalCount).toBeDefined();
      expect(response.body.countByParticipant).toBeDefined();
    });

    test('should get messages by date', async () => {
      const response = await request(app)
        .get(`/api/ai/chat/${chatId}/messages-by-date?date=2024-01-01`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.date).toBe('Mon Jan 01 2024');
      expect(response.body.messageCount).toBeGreaterThan(0);
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    test('should handle empty question', async () => {
      const response = await request(app)
        .post(`/api/ai/chat/${chatId}/ask`)
        .set('Cookie', authToken)
        .send({
          question: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Question is required');
    });

    test('should handle missing word parameter', async () => {
      const response = await request(app)
        .get(`/api/ai/chat/${chatId}/word-frequency`)
        .set('Cookie', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Word parameter is required');
    });

    test('should handle invalid date format', async () => {
      const response = await request(app)
        .get(`/api/ai/chat/${chatId}/messages-by-date?date=invalid-date`)
        .set('Cookie', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid date format');
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should provide fallback conversation starters', () => {
      const fallbackStarters = geminiService.generateFallbackConversationStarters(
        { relationshipStartDate: new Date('2023-01-01') },
        ['food', 'work']
      );

      expect(Array.isArray(fallbackStarters)).toBe(true);
      expect(fallbackStarters.length).toBeGreaterThan(0);
      // Check if any starter contains work/job related content (case insensitive)
      const hasWorkRelated = fallbackStarters.some(starter => 
        starter.toLowerCase().includes('work') || 
        starter.toLowerCase().includes('job') ||
        starter.toLowerCase().includes('dream job') ||
        starter.toLowerCase().includes('career')
      );
      expect(hasWorkRelated).toBe(true);
    });

    test('should provide fallback date ideas', () => {
      const fallbackIdeas = geminiService.generateFallbackDateIdeas(
        ['food', 'hiking'],
        'local',
        { relationshipStartDate: new Date('2023-01-01') }
      );

      expect(Array.isArray(fallbackIdeas)).toBe(true);
      expect(fallbackIdeas.length).toBeGreaterThan(0);
      expect(fallbackIdeas[0]).toHaveProperty('title');
      expect(fallbackIdeas[0]).toHaveProperty('description');
      expect(fallbackIdeas[0]).toHaveProperty('conversationTopics');
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts gracefully', async () => {
      // Mock a timeout error
      const originalMakeAPICall = geminiService.makeAPICall;
      geminiService.makeAPICall = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      try {
        await geminiService.generateContent('test prompt', '', [], false); // Disable cache
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('timed out');
      }

      // Restore original method
      geminiService.makeAPICall = originalMakeAPICall;
    });

    test('should handle rate limiting with exponential backoff', () => {
      const error = new Error('RATE_LIMIT_EXCEEDED');
      expect(geminiService.isRetryableError(error)).toBe(true);

      const nonRetryableError = new Error('INVALID_REQUEST');
      expect(geminiService.isRetryableError(nonRetryableError)).toBe(false);
    });

    test('should handle malformed AI responses', () => {
      const malformedResponse = 'This is not valid JSON {broken';
      const parsed = geminiService.parseRelationshipAnalysis(malformedResponse);
      
      expect(parsed).toHaveProperty('healthScore');
      expect(parsed).toHaveProperty('communicationPatterns');
      expect(parsed).toHaveProperty('positiveObservations');
      expect(Array.isArray(parsed.communicationPatterns)).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    test('should cache AI responses', async () => {
      const prompt = 'Test caching prompt';
      const systemInstruction = 'Test instruction';
      
      // Mock the cache service
      const cacheService = require('../services/cacheService');
      const originalGet = cacheService.get;
      const originalSet = cacheService.set;
      
      let cacheStore = {};
      cacheService.get = jest.fn((key) => cacheStore[key] || null);
      cacheService.set = jest.fn((key, value, ttl) => { cacheStore[key] = value; });
      
      // Mock the makeAPICall to track calls
      const originalMakeAPICall = geminiService.makeAPICall;
      const mockMakeAPICall = jest.fn().mockResolvedValue('Cached response');
      geminiService.makeAPICall = mockMakeAPICall;

      // First call should hit the API
      const result1 = await geminiService.generateContent(prompt, systemInstruction, [], true);
      expect(mockMakeAPICall).toHaveBeenCalledTimes(1);
      expect(cacheService.set).toHaveBeenCalled();

      // Second call should use cache
      const result2 = await geminiService.generateContent(prompt, systemInstruction, [], true);
      expect(mockMakeAPICall).toHaveBeenCalledTimes(1); // Should not increase
      expect(result1).toBe(result2);

      // Restore original methods
      geminiService.makeAPICall = originalMakeAPICall;
      cacheService.get = originalGet;
      cacheService.set = originalSet;
    });

    test('should respect rate limiting', async () => {
      const startTime = Date.now();
      
      // Mock multiple quick calls
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(geminiService.sleep(50)); // Simulate API calls
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      // Should take at least some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
    });
  });
});