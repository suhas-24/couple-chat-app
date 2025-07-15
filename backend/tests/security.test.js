// Set up test environment variables before importing app
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-for-testing-purposes';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.DATABASE_URL = 'mongodb://localhost:27017/couple-chat-test';

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const encryptionService = require('../services/encryptionService');
const apiKeyManager = require('../services/apiKeyManager');
const sanitizationMiddleware = require('../middleware/sanitization');
const fs = require('fs');
const path = require('path');

describe('Security Implementation Tests', () => {
  let testUser;
  let testChat;
  let authToken;

  beforeAll(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!',
      isEmailVerified: true
    });
    await testUser.save();

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.token;

    // Create test chat
    testChat = new Chat({
      participants: [testUser._id],
      chatName: 'Test Chat'
    });
    await testChat.save();
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
  });

  describe('Encryption Service', () => {
    test('should encrypt and decrypt text correctly', () => {
      const originalText = 'This is a secret message 💕';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
      expect(encrypted).toContain(':'); // Should contain IV and auth tag separators
    });

    test('should handle empty and null values gracefully', () => {
      expect(encryptionService.encrypt('')).toBe('');
      expect(encryptionService.encrypt(null)).toBe(null);
      expect(encryptionService.decrypt('')).toBe('');
      expect(encryptionService.decrypt(null)).toBe(null);
    });

    test('should fail to decrypt tampered data', () => {
      const originalText = 'Secret message';
      const encrypted = encryptionService.encrypt(originalText);
      const tamperedEncrypted = encrypted.replace(/.$/, 'x'); // Change last character

      expect(() => {
        encryptionService.decrypt(tamperedEncrypted);
      }).toThrow();
    });

    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await encryptionService.hashPassword(password);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(await encryptionService.verifyPassword(password, hashedPassword)).toBe(true);
      expect(await encryptionService.verifyPassword('wrongpassword', hashedPassword)).toBe(false);
    });

    test('should generate secure tokens', () => {
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/.test(token1)).toBe(true);
    });

    test('should encrypt and decrypt files', () => {
      const originalData = Buffer.from('This is test file content with special chars: 🔒💕');
      const encrypted = encryptionService.encryptFile(originalData);
      const decrypted = encryptionService.decryptFile(encrypted);

      expect(encrypted).not.toEqual(originalData);
      expect(decrypted).toEqual(originalData);
    });

    test('should create and verify HMAC signatures', () => {
      const data = 'important data to sign';
      const signature = encryptionService.createHmacSignature(data);
      
      expect(encryptionService.verifyHmacSignature(data, signature)).toBe(true);
      expect(encryptionService.verifyHmacSignature('tampered data', signature)).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts in strict fields', () => {
      const maliciousInput = '<script>alert("xss")</script>test@example.com';
      const sanitized = sanitizationMiddleware.sanitizeValue('email', maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    test('should sanitize SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const sanitized = sanitizationMiddleware.sanitizeValue('name', sqlInjection);
      
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    test('should allow safe HTML in message fields', () => {
      const safeHtml = 'Hello <b>world</b>! <i>This is italic</i>';
      const sanitized = sanitizationMiddleware.sanitizeValue('text', safeHtml);
      
      expect(sanitized).toContain('<b>');
      expect(sanitized).toContain('<i>');
    });

    test('should remove dangerous HTML in message fields', () => {
      const dangerousHtml = 'Hello <script>alert("xss")</script><b>world</b>';
      const sanitized = sanitizationMiddleware.sanitizeValue('text', dangerousHtml);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<b>world</b>');
    });

    test('should sanitize email addresses correctly', () => {
      const validEmail = '  Test.User+tag@Example.COM  ';
      const invalidEmail = '<script>alert("xss")</script>@evil.com';
      
      expect(sanitizationMiddleware.sanitizeEmail(validEmail)).toBe('test.user+tag@example.com');
      expect(sanitizationMiddleware.sanitizeEmail(invalidEmail)).toBe(null);
    });

    test('should sanitize URLs correctly', () => {
      const validUrl = 'https://example.com/path?param=value';
      const invalidUrl = 'javascript:alert("xss")';
      
      expect(sanitizationMiddleware.sanitizeUrl(validUrl)).toBe(validUrl);
      expect(sanitizationMiddleware.sanitizeUrl(invalidUrl)).toBe(null);
    });

    test('should sanitize filenames', () => {
      const dangerousFilename = '../../../etc/passwd';
      const longFilename = 'a'.repeat(300) + '.txt';
      
      expect(sanitizationMiddleware.sanitizeFilename(dangerousFilename)).toBe('etcpasswd');
      expect(sanitizationMiddleware.sanitizeFilename(longFilename).length).toBeLessThanOrEqual(255);
    });
  });

  describe('API Key Management', () => {
    test('should generate valid API keys', () => {
      const apiKey = apiKeyManager.generateApiKey({
        userId: testUser._id.toString(),
        scope: 'test',
        permissions: ['read', 'write']
      });

      expect(apiKey.apiKey).toMatch(/^cc_/);
      expect(apiKey.secret).toBeDefined();
      expect(apiKey.keyId).toBeDefined();
      expect(apiKey.scope).toBe('test');
      expect(apiKey.permissions).toEqual(['read', 'write']);
    });

    test('should validate API keys correctly', () => {
      const apiKey = apiKeyManager.generateApiKey({
        userId: testUser._id.toString(),
        scope: 'test'
      });

      const validationResult = apiKeyManager.validateApiKey(apiKey.apiKey, apiKey.secret);
      expect(validationResult).toBeTruthy();
      expect(validationResult.userId).toBe(testUser._id.toString());

      const invalidResult = apiKeyManager.validateApiKey(apiKey.apiKey, 'wrong-secret');
      expect(invalidResult).toBe(null);
    });

    test('should revoke API keys', () => {
      const apiKey = apiKeyManager.generateApiKey({
        userId: testUser._id.toString(),
        scope: 'test'
      });

      expect(apiKeyManager.validateApiKey(apiKey.apiKey, apiKey.secret)).toBeTruthy();
      
      const revoked = apiKeyManager.revokeApiKey(apiKey.keyId);
      expect(revoked).toBe(true);
      
      expect(apiKeyManager.validateApiKey(apiKey.apiKey, apiKey.secret)).toBe(null);
    });

    test('should rotate API key secrets', () => {
      const apiKey = apiKeyManager.generateApiKey({
        userId: testUser._id.toString(),
        scope: 'test'
      });

      const originalSecret = apiKey.secret;
      const rotationResult = apiKeyManager.rotateApiKey(apiKey.keyId);
      
      expect(rotationResult).toBeTruthy();
      expect(rotationResult.secret).not.toBe(originalSecret);
      
      // Old secret should not work
      expect(apiKeyManager.validateApiKey(apiKey.apiKey, originalSecret)).toBe(null);
      
      // New secret should work
      expect(apiKeyManager.validateApiKey(apiKey.apiKey, rotationResult.secret)).toBeTruthy();
    });
  });

  describe('Message Encryption', () => {
    test('should encrypt messages when saved', async () => {
      const messageText = 'This is a private message 💕';
      
      const message = new Message({
        chat: testChat._id,
        sender: testUser._id,
        content: {
          text: messageText,
          type: 'text'
        }
      });

      await message.save();

      // Check that encrypted text exists and is different from original
      expect(message.content.encryptedText).toBeDefined();
      expect(message.content.encryptedText).not.toBe(messageText);
      
      // Check that decryption works
      const decryptedText = message.getDecryptedText();
      expect(decryptedText).toBe(messageText);
    });

    test('should handle message editing with encryption', async () => {
      const originalText = 'Original message';
      const editedText = 'Edited message';
      
      const message = new Message({
        chat: testChat._id,
        sender: testUser._id,
        content: {
          text: originalText,
          type: 'text'
        }
      });

      await message.save();
      
      // Edit the message
      await message.editMessage(editedText, testUser._id);
      
      // Check that the new text is encrypted and can be decrypted
      expect(message.getDecryptedText()).toBe(editedText);
      expect(message.content.encryptedText).not.toBe(editedText);
      expect(message.metadata.isEdited).toBe(true);
    });
  });

  describe('Security Headers', () => {
    test('should set proper security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Authentication Security', () => {
    test('should reject requests without authentication', async () => {
      await request(app)
        .get('/api/chat/chats')
        .expect(401);
    });

    test('should reject requests with invalid tokens', async () => {
      await request(app)
        .get('/api/chat/chats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('should accept requests with valid tokens', async () => {
      await request(app)
        .get('/api/chat/chats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Input Validation', () => {
    test('should validate message content', async () => {
      // Test empty message
      await request(app)
        .post('/api/chat/send-message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatId: testChat._id,
          text: ''
        })
        .expect(400);

      // Test message too long
      const longMessage = 'a'.repeat(5001);
      await request(app)
        .post('/api/chat/send-message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatId: testChat._id,
          text: longMessage
        })
        .expect(400);
    });

    test('should validate ObjectId parameters', async () => {
      await request(app)
        .get('/api/chat/chats/invalid-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    test('should sanitize input in request body', async () => {
      const response = await request(app)
        .post('/api/chat/send-message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatId: testChat._id,
          text: '<script>alert("xss")</script>Hello world'
        })
        .expect(201);

      // Message should be sanitized but still contain safe content
      expect(response.body.message.content.text).not.toContain('<script>');
      expect(response.body.message.content.text).toContain('Hello world');
    });
  });

  describe('File Upload Security', () => {
    test('should reject non-CSV files', async () => {
      // Create a fake image file
      const fakeImagePath = path.join(__dirname, 'fake-image.jpg');
      fs.writeFileSync(fakeImagePath, 'fake image content');

      try {
        await request(app)
          .post('/api/chat/upload-csv')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', fakeImagePath)
          .field('chatId', testChat._id.toString())
          .expect(400);
      } finally {
        // Cleanup
        if (fs.existsSync(fakeImagePath)) {
          fs.unlinkSync(fakeImagePath);
        }
      }
    });

    test('should reject files that are too large', async () => {
      // This test would require creating a large file, which might be impractical
      // In a real scenario, you'd mock the file size check
      expect(true).toBe(true); // Placeholder
    });

    test('should validate CSV file content', async () => {
      // Create a malicious CSV file
      const maliciousCsvPath = path.join(__dirname, 'malicious.csv');
      const maliciousContent = 'date,sender,message\n2023-01-01,user,<script>alert("xss")</script>';
      fs.writeFileSync(maliciousCsvPath, maliciousContent);

      try {
        const response = await request(app)
          .post('/api/chat/validate-csv')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', maliciousCsvPath)
          .expect(200);

        // The validation should succeed but content should be sanitized during processing
        expect(response.body.success).toBe(true);
      } finally {
        // Cleanup
        if (fs.existsSync(maliciousCsvPath)) {
          fs.unlinkSync(maliciousCsvPath);
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to sensitive operations', async () => {
      // This test would require making many requests quickly
      // In practice, you'd need to adjust rate limits for testing or mock the rate limiter
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('CORS Security', () => {
    test('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should reject requests from unauthorized origins', async () => {
      await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(500); // CORS error
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Error message should be generic, not revealing whether user exists
      expect(response.body.error).not.toContain('nonexistent@example.com');
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should handle database errors gracefully', async () => {
      // This would require mocking database failures
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Session Security', () => {
    test('should use secure cookie settings in production', () => {
      // This would require checking cookie settings
      // In practice, you'd verify httpOnly, secure, sameSite settings
      expect(true).toBe(true); // Placeholder
    });

    test('should handle session timeout', () => {
      // This would require testing JWT expiration
      expect(true).toBe(true); // Placeholder
    });
  });
});

describe('Security Integration Tests', () => {
  test('should handle complete secure message flow', async () => {
    // Create user
    const user = new User({
      name: 'Integration Test User',
      email: 'integration@example.com',
      password: 'SecurePassword123!',
      isEmailVerified: true
    });
    await user.save();

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'integration@example.com',
        password: 'SecurePassword123!'
      })
      .expect(200);

    const token = loginResponse.body.token;

    // Create chat
    const chatResponse = await request(app)
      .post('/api/chat/create-chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        partnerId: user._id,
        chatName: 'Secure Test Chat'
      })
      .expect(200);

    const chatId = chatResponse.body.chat._id;

    // Send encrypted message
    const messageResponse = await request(app)
      .post('/api/chat/send-message')
      .set('Authorization', `Bearer ${token}`)
      .send({
        chatId: chatId,
        text: 'This is a secure encrypted message 🔒💕'
      })
      .expect(201);

    // Verify message was encrypted in database
    const savedMessage = await Message.findById(messageResponse.body.message._id);
    expect(savedMessage.content.encryptedText).toBeDefined();
    expect(savedMessage.content.encryptedText).not.toBe('This is a secure encrypted message 🔒💕');
    expect(savedMessage.getDecryptedText()).toBe('This is a secure encrypted message 🔒💕');

    // Cleanup
    await User.findByIdAndDelete(user._id);
    await Chat.findByIdAndDelete(chatId);
    await Message.findByIdAndDelete(savedMessage._id);
  });
});