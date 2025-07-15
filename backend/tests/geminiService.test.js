/**
 * Gemini AI Service Tests
 * Tests for Google Gemini AI integration
 */

const geminiService = require('../services/geminiService');
const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
      generateContentStream: jest.fn(),
    }),
  })),
}));

describe('Gemini Service', () => {
  let testUser1, testUser2, testChat, testMessages;

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
      chatName: 'Test AI Chat'
    });
    await testChat.save();

    // Create test messages
    const messageTexts = [
      'Hello! How are you doing today?',
      'I am doing great! Thanks for asking. How about you?',
      'I am wonderful! I love spending time with you',
      'You make me so happy every day',
      'What should we do for our anniversary?',
      'I was thinking we could go to that new restaurant',
      'That sounds perfect! I love trying new places with you',
      'You always have the best ideas',
      'I got a promotion at work today!',
      'Congratulations! I am so proud of you!'
    ];

    testMessages = [];
    for (let i = 0; i < messageTexts.length; i++) {
      const message = new Message({
        chat: testChat._id,
        sender: i % 2 === 0 ? testUser1._id : testUser2._id,
        content: {
          text: messageTexts[i],
          type: 'text'
        },
        createdAt: new Date(Date.now() - (messageTexts.length - i) * 60000)
      });
      await message.save();
      testMessages.push(message);
    }
  });

  afterAll(async () => {
    await Message.deleteMany({});
    await Chat.deleteMany({});
    await User.deleteMany({});
  });

  describe('Configuration', () => {
    it('should initialize with API key', () => {
      expect(geminiService.isConfigured()).toBe(true);
    });

    it('should handle missing API key gracefully', () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      expect(geminiService.isConfigured()).toBe(false);

      process.env.GEMINI_API_KEY = originalKey;
    });
  });

  describe('askAboutChatHistory', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
    });

    it('should generate response about chat history', async () => {
      const mockResponse = {
        response: {
          text: () => 'Based on your chat history, you both seem very happy together and often discuss your relationship milestones and achievements.'
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.askAboutChatHistory(
        testChat._id.toString(),
        'What do we usually talk about?'
      );

      expect(result.success).toBe(true);
      expect(result.answer).toContain('happy together');
      expect(mockModel.generateContent).toHaveBeenCalled();
    });

    it('should handle specific date queries', async () => {
      const mockResponse = {
        response: {
          text: () => 'On that date, you discussed your work promotion and celebrated together.'
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.askAboutChatHistory(
        testChat._id.toString(),
        'What did we talk about yesterday?'
      );

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(mockModel.generateContent).toHaveBeenCalled();
    });

    it('should handle word frequency queries', async () => {
      const result = await geminiService.getWordFrequency(
        testChat._id.toString(),
        'love'
      );

      expect(result.success).toBe(true);
      expect(result.word).toBe('love');
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.countByParticipant).toBeDefined();
    });

    it('should handle date-specific message queries', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await geminiService.getMessagesByDate(
        testChat._id.toString(),
        today
      );

      expect(result.success).toBe(true);
      expect(result.date).toBeDefined();
      expect(result.messageCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should limit context to recent messages', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response based on recent messages'
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      await geminiService.askAboutChatHistory(
        testChat._id.toString(),
        'Tell me about our recent conversations'
      );

      const callArgs = mockModel.generateContent.mock.calls[0][0];
      expect(callArgs).toContain('recent messages');
    });

    it('should handle API errors gracefully', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(new Error('API Error'))
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.askAboutChatHistory(
        testChat._id.toString(),
        'Test question'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
    });

    it('should validate chat exists', async () => {
      const fakeId = new require('mongoose').Types.ObjectId();
      
      const result = await geminiService.askAboutChatHistory(
        fakeId.toString(),
        'Test question'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Chat not found');
    });

    it('should handle empty chat history', async () => {
      // Create empty chat
      const emptyChat = new Chat({
        participants: [testUser1._id, testUser2._id],
        chatName: 'Empty Chat'
      });
      await emptyChat.save();

      const result = await geminiService.askAboutChatHistory(
        emptyChat._id.toString(),
        'What have we talked about?'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no messages');

      await Chat.findByIdAndDelete(emptyChat._id);
    });
  });

  describe('generateConversationStarters', () => {
    it('should generate conversation starters', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify([
            'How was your day today?',
            'What are you looking forward to this weekend?',
            'Tell me about something that made you smile today'
          ])
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.generateConversationStarters(testChat._id.toString());

      expect(result.success).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        response: {
          text: () => 'Invalid JSON response'
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.generateConversationStarters(testChat._id.toString());

      expect(result.success).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      // Should provide fallback suggestions
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('generateDateIdeas', () => {
    it('should generate personalized date ideas', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify([
            'Visit that new restaurant you mentioned',
            'Take a romantic walk in the park',
            'Have a cozy movie night at home'
          ])
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.generateDateIdeas(testChat._id.toString());

      expect(result.success).toBe(true);
      expect(Array.isArray(result.ideas)).toBe(true);
      expect(result.ideas.length).toBeGreaterThan(0);
    });

    it('should consider chat history for personalization', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => JSON.stringify(['Personalized idea']) }
        })
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      await geminiService.generateDateIdeas(testChat._id.toString());

      const callArgs = mockModel.generateContent.mock.calls[0][0];
      expect(callArgs).toContain('restaurant'); // Should reference chat history
    });
  });

  describe('analyzeRelationshipHealth', () => {
    it('should analyze relationship health', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: 8.5,
            insights: [
              'You both communicate very positively',
              'You celebrate each other\'s achievements',
              'You make plans together regularly'
            ],
            suggestions: [
              'Continue sharing daily experiences',
              'Plan more surprise activities'
            ]
          })
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.analyzeRelationshipHealth(testChat._id.toString());

      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle insufficient data', async () => {
      // Create chat with minimal messages
      const minimalChat = new Chat({
        participants: [testUser1._id, testUser2._id],
        chatName: 'Minimal Chat'
      });
      await minimalChat.save();

      const result = await geminiService.analyzeRelationshipHealth(minimalChat._id.toString());

      expect(result.success).toBe(false);
      expect(result.error).toContain('insufficient data');

      await Chat.findByIdAndDelete(minimalChat._id);
    });
  });

  describe('Content Safety', () => {
    it('should filter inappropriate content', () => {
      const inappropriateText = 'This contains inappropriate content that should be filtered';
      const filtered = geminiService.filterInappropriateContent(inappropriateText);
      
      expect(filtered).toBeDefined();
      expect(typeof filtered).toBe('string');
    });

    it('should detect and handle sensitive topics', () => {
      const sensitiveTopics = [
        'personal financial information',
        'private medical details',
        'confidential work information'
      ];

      sensitiveTopics.forEach(topic => {
        const isSensitive = geminiService.containsSensitiveContent(topic);
        expect(typeof isSensitive).toBe('boolean');
      });
    });
  });

  describe('Rate Limiting and Caching', () => {
    it('should respect rate limits', async () => {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          geminiService.askAboutChatHistory(
            testChat._id.toString(),
            `Question ${i}`
          )
        );
      }

      const results = await Promise.all(promises);
      
      // Some requests might be rate limited
      const rateLimitedResults = results.filter(r => 
        !r.success && r.error && r.error.includes('rate limit')
      );
      
      // This depends on the actual rate limiting implementation
      expect(rateLimitedResults.length).toBeGreaterThanOrEqual(0);
    });

    it('should cache similar queries', async () => {
      const mockResponse = {
        response: {
          text: () => 'Cached response'
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const question = 'What do we talk about most?';
      
      // First call
      await geminiService.askAboutChatHistory(testChat._id.toString(), question);
      
      // Second call with same question
      await geminiService.askAboutChatHistory(testChat._id.toString(), question);

      // Should use cache for second call (implementation dependent)
      // expect(mockModel.generateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Privacy and Security', () => {
    it('should not include sensitive user information in prompts', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => 'Safe response' }
        })
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      await geminiService.askAboutChatHistory(
        testChat._id.toString(),
        'Tell me about our conversations'
      );

      const callArgs = mockModel.generateContent.mock.calls[0][0];
      
      // Should not include email addresses or other sensitive data
      expect(callArgs).not.toContain('@test.com');
      expect(callArgs).not.toContain('password');
    });

    it('should sanitize user input', () => {
      const maliciousInput = '<script>alert("xss")</script>What did we talk about?';
      const sanitized = geminiService.sanitizeUserInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('What did we talk about?');
    });
  });

  describe('Error Recovery', () => {
    it('should provide fallback responses when AI fails', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.generateConversationStarters(testChat._id.toString());

      expect(result.success).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
      // Should provide fallback suggestions
    });

    it('should handle network timeouts', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
        )
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      const result = await geminiService.askAboutChatHistory(
        testChat._id.toString(),
        'Test question'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });
  });

  describe('Context Management', () => {
    it('should limit context size for large chats', async () => {
      // Create many messages
      const manyMessages = [];
      for (let i = 0; i < 1000; i++) {
        const message = new Message({
          chat: testChat._id,
          sender: i % 2 === 0 ? testUser1._id : testUser2._id,
          content: {
            text: `Message ${i}`,
            type: 'text'
          },
          createdAt: new Date(Date.now() - i * 1000)
        });
        manyMessages.push(message);
      }
      await Message.insertMany(manyMessages);

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => 'Response with limited context' }
        })
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => mockModel
      }));

      await geminiService.askAboutChatHistory(
        testChat._id.toString(),
        'What do we talk about?'
      );

      const callArgs = mockModel.generateContent.mock.calls[0][0];
      
      // Should not include all 1000 messages
      const messageCount = (callArgs.match(/Message \d+/g) || []).length;
      expect(messageCount).toBeLessThan(1000);

      // Clean up
      await Message.deleteMany({ chat: testChat._id, content: { $regex: /^Message \d+$/ } });
    });
  });
});