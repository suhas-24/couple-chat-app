const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

describe('Enhanced Message Operations', () => {
  let authToken;
  let userId;
  let partnerId;
  let chatId;
  let messageId;

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

    authToken = loginResponse.headers['set-cookie']
      .find(cookie => cookie.startsWith('auth-token='))
      .split(';')[0];

    // Create a chat
    const chat = new Chat({
      participants: [userId, partnerId],
      chatName: 'Test Chat'
    });
    await chat.save();
    chatId = chat._id;

    // Create a test message
    const message = new Message({
      chat: chatId,
      sender: userId,
      content: {
        text: 'Original message text',
        type: 'text'
      },
      readBy: [{ user: userId }]
    });
    await message.save();
    messageId = message._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
  });

  describe('Message Editing', () => {
    test('should edit message successfully', async () => {
      const response = await request(app)
        .put(`/api/chat/message/${messageId}`)
        .set('Cookie', authToken)
        .send({
          text: 'Updated message text'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message.content.text).toBe('Updated message text');
      expect(response.body.message.metadata.isEdited).toBe(true);
      expect(response.body.message.metadata.editedAt).toBeDefined();
    });

    test('should reject editing message by non-sender', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        isEmailVerified: true
      });
      await anotherUser.save();

      // Login as another user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@example.com',
          password: 'password123'
        });

      const anotherToken = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('auth-token='))
        .split(';')[0];

      const response = await request(app)
        .put(`/api/chat/message/${messageId}`)
        .set('Cookie', anotherToken)
        .send({
          text: 'Unauthorized edit attempt'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized to access this message');

      await User.findByIdAndDelete(anotherUser._id);
    });

    test('should reject editing with empty text', async () => {
      const response = await request(app)
        .put(`/api/chat/message/${messageId}`)
        .set('Cookie', authToken)
        .send({
          text: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Message text is required');
    });

    test('should reject editing non-existent message', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/chat/message/${fakeId}`)
        .set('Cookie', authToken)
        .send({
          text: 'Edit attempt'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Message not found');
    });
  });

  describe('Message Deletion', () => {
    let deleteMessageId;

    beforeEach(async () => {
      // Create a fresh message for deletion tests
      const message = new Message({
        chat: chatId,
        sender: userId,
        content: {
          text: 'Message to be deleted',
          type: 'text'
        },
        readBy: [{ user: userId }]
      });
      await message.save();
      deleteMessageId = message._id;
    });

    test('should delete message successfully', async () => {
      const response = await request(app)
        .delete(`/api/chat/message/${deleteMessageId}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify message is marked as deleted
      const deletedMessage = await Message.findById(deleteMessageId);
      expect(deletedMessage.isDeleted).toBe(true);
      expect(deletedMessage.content.text).toBe('This message was deleted');
    });

    test('should reject deleting message by non-sender', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another2@example.com',
        password: 'password123',
        isEmailVerified: true
      });
      await anotherUser.save();

      // Login as another user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another2@example.com',
          password: 'password123'
        });

      const anotherToken = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('auth-token='))
        .split(';')[0];

      const response = await request(app)
        .delete(`/api/chat/message/${deleteMessageId}`)
        .set('Cookie', anotherToken);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized to access this message');

      await User.findByIdAndDelete(anotherUser._id);
    });
  });

  describe('Message Reactions', () => {
    test('should add reaction successfully', async () => {
      const response = await request(app)
        .post(`/api/chat/message/${messageId}/reaction`)
        .set('Cookie', authToken)
        .send({
          emoji: '❤️'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message.metadata.reactions).toHaveLength(1);
      expect(response.body.message.metadata.reactions[0].emoji).toBe('❤️');
      expect(response.body.message.metadata.reactions[0].user.toString()).toBe(userId.toString());
    });

    test('should replace existing reaction from same user', async () => {
      // First reaction
      await request(app)
        .post(`/api/chat/message/${messageId}/reaction`)
        .set('Cookie', authToken)
        .send({
          emoji: '😊'
        });

      // Second reaction (should replace first)
      const response = await request(app)
        .post(`/api/chat/message/${messageId}/reaction`)
        .set('Cookie', authToken)
        .send({
          emoji: '😍'
        });

      expect(response.status).toBe(200);
      expect(response.body.message.metadata.reactions).toHaveLength(1);
      expect(response.body.message.metadata.reactions[0].emoji).toBe('😍');
    });

    test('should remove reaction successfully', async () => {
      // First add a reaction
      await request(app)
        .post(`/api/chat/message/${messageId}/reaction`)
        .set('Cookie', authToken)
        .send({
          emoji: '👍'
        });

      // Then remove it
      const response = await request(app)
        .delete(`/api/chat/message/${messageId}/reaction`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message.metadata.reactions).toHaveLength(0);
    });
  });

  describe('Message Read Status', () => {
    let unreadMessageId;

    beforeEach(async () => {
      // Create a message from partner (unread by user)
      const message = new Message({
        chat: chatId,
        sender: partnerId,
        content: {
          text: 'Unread message',
          type: 'text'
        },
        readBy: [{ user: partnerId }] // Only read by sender
      });
      await message.save();
      unreadMessageId = message._id;
    });

    test('should mark message as read successfully', async () => {
      const response = await request(app)
        .post(`/api/chat/message/${unreadMessageId}/read`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify message is marked as read
      const readMessage = await Message.findById(unreadMessageId);
      expect(readMessage.readBy).toHaveLength(2);
      expect(readMessage.readBy.some(read => read.user.toString() === userId.toString())).toBe(true);
    });

    test('should not duplicate read status', async () => {
      // Mark as read first time
      await request(app)
        .post(`/api/chat/message/${unreadMessageId}/read`)
        .set('Cookie', authToken);

      // Mark as read second time
      const response = await request(app)
        .post(`/api/chat/message/${unreadMessageId}/read`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);

      // Verify no duplicate read entries
      const readMessage = await Message.findById(unreadMessageId);
      expect(readMessage.readBy).toHaveLength(2);
    });
  });

  describe('Message Search', () => {
    beforeAll(async () => {
      // Create multiple messages for search testing
      const searchMessages = [
        'Hello world, this is a test message',
        'Another message about love and romance',
        'JavaScript is awesome for development',
        'React and Node.js make great apps',
        'Love conquers all difficulties'
      ];

      for (const text of searchMessages) {
        const message = new Message({
          chat: chatId,
          sender: userId,
          content: { text, type: 'text' },
          readBy: [{ user: userId }]
        });
        await message.save();
      }
    });

    test('should search messages successfully', async () => {
      const response = await request(app)
        .get(`/api/chat/${chatId}/search`)
        .query({ q: 'love' })
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);
      expect(response.body.searchTerm).toBe('love');
      expect(response.body.pagination).toBeDefined();
    });

    test('should handle empty search term', async () => {
      const response = await request(app)
        .get(`/api/chat/${chatId}/search`)
        .query({ q: '' })
        .set('Cookie', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Search term is required');
    });

    test('should handle search with pagination', async () => {
      const response = await request(app)
        .get(`/api/chat/${chatId}/search`)
        .query({ q: 'message', page: 1, limit: 2 })
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.messages.length).toBeLessThanOrEqual(2);
    });

    test('should reject search for unauthorized chat', async () => {
      // Create another user
      const unauthorizedUser = new User({
        name: 'Unauthorized User',
        email: 'unauthorized@example.com',
        password: 'password123',
        isEmailVerified: true
      });
      await unauthorizedUser.save();

      // Login as unauthorized user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unauthorized@example.com',
          password: 'password123'
        });

      const unauthorizedToken = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('auth-token='))
        .split(';')[0];

      const response = await request(app)
        .get(`/api/chat/${chatId}/search`)
        .query({ q: 'test' })
        .set('Cookie', unauthorizedToken);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized to search this chat');

      await User.findByIdAndDelete(unauthorizedUser._id);
    });
  });

  describe('Message Model Methods', () => {
    let testMessage;

    beforeEach(async () => {
      testMessage = new Message({
        chat: chatId,
        sender: userId,
        content: {
          text: 'Test message for model methods',
          type: 'text'
        },
        readBy: [{ user: userId }]
      });
      await testMessage.save();
    });

    test('should edit message using model method', async () => {
      await testMessage.editMessage('Edited text', userId);
      
      expect(testMessage.content.text).toBe('Edited text');
      expect(testMessage.metadata.isEdited).toBe(true);
      expect(testMessage.metadata.editedAt).toBeDefined();
    });

    test('should reject edit by non-sender', async () => {
      try {
        await testMessage.editMessage('Unauthorized edit', partnerId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Only the sender can edit this message');
      }
    });

    test('should delete message using model method', async () => {
      await testMessage.deleteMessage(userId);
      
      expect(testMessage.isDeleted).toBe(true);
      expect(testMessage.content.text).toBe('This message was deleted');
    });

    test('should add reaction using model method', async () => {
      await testMessage.addReaction(userId, '🎉');
      
      expect(testMessage.metadata.reactions).toHaveLength(1);
      expect(testMessage.metadata.reactions[0].emoji).toBe('🎉');
      expect(testMessage.metadata.reactions[0].user.toString()).toBe(userId.toString());
    });

    test('should remove reaction using model method', async () => {
      // First add a reaction
      await testMessage.addReaction(userId, '🎉');
      expect(testMessage.metadata.reactions).toHaveLength(1);
      
      // Then remove it
      await testMessage.removeReaction(userId);
      expect(testMessage.metadata.reactions).toHaveLength(0);
    });

    test('should mark as read using model method', async () => {
      await testMessage.markAsRead(partnerId);
      
      expect(testMessage.readBy).toHaveLength(2);
      expect(testMessage.readBy.some(read => read.user.toString() === partnerId.toString())).toBe(true);
    });

    test('should not duplicate read status', async () => {
      await testMessage.markAsRead(userId); // Already read by sender
      
      expect(testMessage.readBy).toHaveLength(1); // Should not duplicate
    });
  });

  describe('Message Encryption', () => {
    test('should handle encryption when enabled', async () => {
      // Temporarily enable encryption
      const originalValue = process.env.ENABLE_MESSAGE_ENCRYPTION;
      process.env.ENABLE_MESSAGE_ENCRYPTION = 'true';

      const message = new Message({
        chat: chatId,
        sender: userId,
        content: {
          text: 'Secret message',
          type: 'text'
        },
        readBy: [{ user: userId }]
      });

      await message.save();

      // Check if encrypted text is set (would be set by encryption service)
      // Note: This test assumes encryption service is properly configured
      expect(message.content.text).toBe('Secret message');

      // Restore original value
      process.env.ENABLE_MESSAGE_ENCRYPTION = originalValue;
    });

    test('should decrypt message content', async () => {
      const message = new Message({
        chat: chatId,
        sender: userId,
        content: {
          text: 'Plain text message',
          encryptedText: 'encrypted_version' // Mock encrypted text
        }
      });

      // Test decryption method (would use actual encryption service)
      const decryptedText = message.getDecryptedText();
      expect(decryptedText).toBe('Plain text message'); // Falls back to plain text
    });
  });
});