/**
 * Chat Controller Tests
 * Tests for chat and messaging endpoints
 */

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

describe('Chat Controller', () => {
  let testUser1, testUser2, authToken1, authToken2, testChat;

  beforeAll(async () => {
    // Create test users
    testUser1 = new User({
      name: 'Alice',
      email: 'alice@example.com',
      password: await bcrypt.hash('Password123!', 12),
      isEmailVerified: true,
    });
    await testUser1.save();

    testUser2 = new User({
      name: 'Bob',
      email: 'bob@example.com',
      password: await bcrypt.hash('Password123!', 12),
      isEmailVerified: true,
    });
    await testUser2.save();

    // Generate auth tokens
    authToken1 = jwt.sign(
      { userId: testUser1._id, email: testUser1.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    authToken2 = jwt.sign(
      { userId: testUser2._id, email: testUser2.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test chat
    testChat = new Chat({
      participants: [testUser1._id, testUser2._id],
      chatName: 'Alice & Bob',
      isActive: true,
    });
    await testChat.save();
  });

  afterAll(async () => {
    await Message.deleteMany({});
    await Chat.deleteMany({});
    await User.deleteMany({});
  });

  beforeEach(async () => {
    // Clean up messages before each test
    await Message.deleteMany({});
  });

  describe('GET /api/chat/chats', () => {
    it('should return user chats', async () => {
      const response = await request(app)
        .get('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chats).toBeDefined();
      expect(Array.isArray(response.body.data.chats)).toBe(true);
      expect(response.body.data.chats.length).toBeGreaterThan(0);
    });

    it('should populate participant information', async () => {
      const response = await request(app)
        .get('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      const chat = response.body.data.chats[0];
      expect(chat.participants).toBeDefined();
      expect(chat.participants[0].name).toBeDefined();
      expect(chat.participants[0].email).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/chat/chats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should only return chats where user is participant', async () => {
      // Create another user and chat
      const otherUser = new User({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await otherUser.save();

      const otherChat = new Chat({
        participants: [testUser2._id, otherUser._id],
        chatName: 'Bob & Charlie',
        isActive: true,
      });
      await otherChat.save();

      const response = await request(app)
        .get('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      // User1 should only see their chat, not the other chat
      expect(response.body.data.chats).toHaveLength(1);
      expect(response.body.data.chats[0].chatName).toBe('Alice & Bob');

      await Chat.findByIdAndDelete(otherChat._id);
      await User.findByIdAndDelete(otherUser._id);
    });
  });

  describe('POST /api/chat/chats', () => {
    it('should create a new chat', async () => {
      const chatData = {
        participantEmail: 'bob@example.com',
        chatName: 'New Chat',
      };

      const response = await request(app)
        .post('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(chatData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chat).toBeDefined();
      expect(response.body.data.chat.chatName).toBe('New Chat');
      expect(response.body.data.chat.participants).toHaveLength(2);

      // Clean up
      await Chat.findByIdAndDelete(response.body.data.chat._id);
    });

    it('should prevent creating duplicate chats', async () => {
      const chatData = {
        participantEmail: 'bob@example.com',
        chatName: 'Duplicate Chat',
      };

      // Create first chat
      const response1 = await request(app)
        .post('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(chatData)
        .expect(201);

      // Try to create duplicate
      const response2 = await request(app)
        .post('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(chatData)
        .expect(400);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error).toContain('already exists');

      // Clean up
      await Chat.findByIdAndDelete(response1.body.data.chat._id);
    });

    it('should validate participant email exists', async () => {
      const chatData = {
        participantEmail: 'nonexistent@example.com',
        chatName: 'Invalid Chat',
      };

      const response = await request(app)
        .post('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(chatData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User not found');
    });

    it('should prevent creating chat with self', async () => {
      const chatData = {
        participantEmail: 'alice@example.com', // Same as authenticated user
        chatName: 'Self Chat',
      };

      const response = await request(app)
        .post('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(chatData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot create chat with yourself');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat/chats')
        .send({ participantEmail: 'bob@example.com' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/chats/:id', () => {
    it('should return specific chat details', async () => {
      const response = await request(app)
        .get(`/api/chat/chats/${testChat._id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chat).toBeDefined();
      expect(response.body.data.chat._id).toBe(testChat._id.toString());
      expect(response.body.data.chat.participants).toHaveLength(2);
    });

    it('should deny access to non-participant', async () => {
      const otherUser = new User({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { userId: otherUser._id, email: otherUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/chat/chats/${testChat._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');

      await User.findByIdAndDelete(otherUser._id);
    });

    it('should return 404 for non-existent chat', async () => {
      const fakeId = new require('mongoose').Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/chat/chats/${fakeId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/chats/:id/messages', () => {
    beforeEach(async () => {
      // Create test messages
      const messages = [];
      for (let i = 0; i < 25; i++) {
        const message = new Message({
          chat: testChat._id,
          sender: i % 2 === 0 ? testUser1._id : testUser2._id,
          content: {
            text: `Test message ${i + 1}`,
            type: 'text',
          },
          createdAt: new Date(Date.now() - (25 - i) * 60000), // 1 minute apart
        });
        messages.push(message);
      }
      await Message.insertMany(messages);
    });

    it('should return chat messages with pagination', async () => {
      const response = await request(app)
        .get(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
      expect(response.body.data.messages).toHaveLength(10);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it('should return messages in reverse chronological order', async () => {
      const response = await request(app)
        .get(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      const messages = response.body.data.messages;
      expect(messages[0].content.text).toBe('Test message 25'); // Most recent first
      expect(messages[4].content.text).toBe('Test message 21');
    });

    it('should populate sender information', async () => {
      const response = await request(app)
        .get(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      const message = response.body.data.messages[0];
      expect(message.sender.name).toBeDefined();
      expect(message.sender.email).toBeDefined();
    });

    it('should handle empty message list', async () => {
      await Message.deleteMany({ chat: testChat._id });

      const response = await request(app)
        .get(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(0);
      expect(response.body.data.pagination.hasMore).toBe(false);
    });

    it('should deny access to non-participant', async () => {
      const otherUser = new User({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { userId: otherUser._id, email: otherUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      await User.findByIdAndDelete(otherUser._id);
    });
  });

  describe('POST /api/chat/chats/:id/messages', () => {
    it('should send a text message', async () => {
      const messageData = {
        content: 'Hello, this is a test message!',
        type: 'text',
      };

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
      expect(response.body.data.message.content.text).toBe(messageData.content);
      expect(response.body.data.message.sender._id).toBe(testUser1._id.toString());

      // Verify message was saved to database
      const savedMessage = await Message.findById(response.body.data.message._id);
      expect(savedMessage).toBeTruthy();
      expect(savedMessage.content.text).toBe(messageData.content);
    });

    it('should update chat lastMessageAt timestamp', async () => {
      const originalTimestamp = testChat.lastMessageAt;

      await request(app)
        .post(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: 'Test message', type: 'text' })
        .expect(201);

      const updatedChat = await Chat.findById(testChat._id);
      expect(updatedChat.lastMessageAt).not.toEqual(originalTimestamp);
    });

    it('should validate message content', async () => {
      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ type: 'text' }) // Missing content
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('content');
    });

    it('should sanitize message content', async () => {
      const maliciousContent = '<script>alert("xss")</script>Hello';

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: maliciousContent, type: 'text' })
        .expect(201);

      expect(response.body.data.message.content.text).not.toContain('<script>');
      expect(response.body.data.message.content.text).toContain('Hello');
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(5000); // 5000 characters

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: longMessage, type: 'text' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('too long');
    });

    it('should deny access to non-participant', async () => {
      const otherUser = new User({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { userId: otherUser._id, email: otherUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Unauthorized message', type: 'text' })
        .expect(403);

      expect(response.body.success).toBe(false);

      await User.findByIdAndDelete(otherUser._id);
    });
  });

  describe('POST /api/chat/chats/:id/upload-csv', () => {
    let testCsvPath;

    beforeAll(() => {
      // Create test CSV file
      testCsvPath = path.join(__dirname, 'test-chat.csv');
      const csvContent = `sender,message,timestamp
Alice,Hello there!,2023-01-01 10:00:00
Bob,Hi! How are you?,2023-01-01 10:05:00
Alice,I'm doing great!,2023-01-01 10:10:00
Bob,That's wonderful to hear,2023-01-01 10:15:00`;
      
      fs.writeFileSync(testCsvPath, csvContent);
    });

    afterAll(() => {
      // Clean up test file
      if (fs.existsSync(testCsvPath)) {
        fs.unlinkSync(testCsvPath);
      }
    });

    it('should upload and process CSV file', async () => {
      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/upload-csv`)
        .set('Authorization', `Bearer ${authToken1}`)
        .attach('file', testCsvPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(4);
      expect(response.body.data.summary).toBeDefined();

      // Verify messages were imported
      const importedMessages = await Message.find({ 
        chat: testChat._id,
        'content.metadata.isImported': true 
      });
      expect(importedMessages).toHaveLength(4);
    });

    it('should validate file format', async () => {
      // Create invalid file
      const invalidPath = path.join(__dirname, 'invalid.txt');
      fs.writeFileSync(invalidPath, 'This is not a CSV file');

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/upload-csv`)
        .set('Authorization', `Bearer ${authToken1}`)
        .attach('file', invalidPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('CSV');

      fs.unlinkSync(invalidPath);
    });

    it('should validate file size', async () => {
      // Create large file (mock)
      const largePath = path.join(__dirname, 'large.csv');
      const largeContent = 'sender,message,timestamp\n' + 'Alice,Test,2023-01-01\n'.repeat(100000);
      fs.writeFileSync(largePath, largeContent);

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/upload-csv`)
        .set('Authorization', `Bearer ${authToken1}`)
        .attach('file', largePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('size');

      fs.unlinkSync(largePath);
    });

    it('should handle malformed CSV', async () => {
      const malformedPath = path.join(__dirname, 'malformed.csv');
      const malformedContent = `sender,message,timestamp
Alice,Hello,2023-01-01
Bob,"Unclosed quote,2023-01-02
Alice,Normal message,2023-01-03`;
      
      fs.writeFileSync(malformedPath, malformedContent);

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/upload-csv`)
        .set('Authorization', `Bearer ${authToken1}`)
        .attach('file', malformedPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('format');

      fs.unlinkSync(malformedPath);
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/upload-csv`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('file');
    });

    it('should deny access to non-participant', async () => {
      const otherUser = new User({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { userId: otherUser._id, email: otherUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post(`/api/chat/chats/${testChat._id}/upload-csv`)
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('file', testCsvPath)
        .expect(403);

      expect(response.body.success).toBe(false);

      await User.findByIdAndDelete(otherUser._id);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit message sending', async () => {
      // Send multiple messages quickly
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post(`/api/chat/chats/${testChat._id}/messages`)
            .set('Authorization', `Bearer ${authToken1}`)
            .send({ content: `Spam message ${i}`, type: 'text' })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Message Reactions', () => {
    let testMessage;

    beforeEach(async () => {
      testMessage = new Message({
        chat: testChat._id,
        sender: testUser1._id,
        content: {
          text: 'Test message for reactions',
          type: 'text',
        },
      });
      await testMessage.save();
    });

    it('should add reaction to message', async () => {
      const response = await request(app)
        .post(`/api/chat/messages/${testMessage._id}/reactions`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ emoji: '❤️' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.reactions).toHaveLength(1);
      expect(response.body.data.message.reactions[0].emoji).toBe('❤️');
      expect(response.body.data.message.reactions[0].userId).toBe(testUser2._id.toString());
    });

    it('should remove reaction from message', async () => {
      // First add a reaction
      await request(app)
        .post(`/api/chat/messages/${testMessage._id}/reactions`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ emoji: '❤️' })
        .expect(200);

      // Then remove it
      const response = await request(app)
        .delete(`/api/chat/messages/${testMessage._id}/reactions`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ emoji: '❤️' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.reactions).toHaveLength(0);
    });

    it('should prevent duplicate reactions', async () => {
      // Add reaction
      await request(app)
        .post(`/api/chat/messages/${testMessage._id}/reactions`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ emoji: '❤️' })
        .expect(200);

      // Try to add same reaction again
      const response = await request(app)
        .post(`/api/chat/messages/${testMessage._id}/reactions`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ emoji: '❤️' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already reacted');
    });
  });
});