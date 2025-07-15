// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-for-testing-purposes';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.DATABASE_URL = 'mongodb://localhost:27017/couple-chat-test';

const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const dataManagementService = require('../services/dataManagementService');
const auditLogger = require('../services/auditLogger');

// Mock the app without starting the server
const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const app = express();
app.use(express.json());

// Add test routes
app.get('/api/auth/privacy-settings', authMiddleware, authController.getPrivacySettings);
app.put('/api/auth/privacy-settings', authMiddleware, authController.updatePrivacySettings);
app.get('/api/auth/export-data', authMiddleware, authController.exportUserData);
app.post('/api/auth/delete-data-gdpr', authMiddleware, authController.deleteUserDataGDPR);
app.get('/api/auth/security-events', authMiddleware, authController.getSecurityEvents);
app.post('/api/auth/revoke-all-sessions', authMiddleware, authController.revokeAllSessions);

describe('Privacy Controls and Data Management', () => {
  let testUser;
  let testChat;
  let testMessage;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});

    // Create test user
    testUser = new User({
      name: 'Privacy Test User',
      email: 'privacy@test.com',
      password: 'TestPassword123!',
      isEmailVerified: true,
      authProvider: 'local'
    });
    await testUser.save();

    // Create second user for chat (couples need 2 participants)
    const secondUser = new User({
      name: 'Second Test User',
      email: 'second@test.com',
      password: 'TestPassword123!',
      isEmailVerified: true,
      authProvider: 'local'
    });
    await secondUser.save();

    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create test chat with 2 participants (required for couple chat)
    testChat = new Chat({
      participants: [testUser._id, secondUser._id],
      chatName: 'Test Chat'
    });
    await testChat.save();

    testMessage = new Message({
      chat: testChat._id,
      sender: testUser._id,
      content: {
        text: 'Test message for privacy testing',
        type: 'text'
      }
    });
    await testMessage.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Privacy Settings Management', () => {
    test('should get default privacy settings', async () => {
      const response = await request(app)
        .get('/api/auth/privacy-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('allowAnalytics', true);
      expect(response.body.data).toHaveProperty('allowAIFeatures', true);
      expect(response.body.data).toHaveProperty('showOnlineStatus', true);
      expect(response.body.data).toHaveProperty('allowDataCollection', true);
      expect(response.body.data).toHaveProperty('allowPersonalization', true);
      expect(response.body.data).toHaveProperty('shareUsageData', false);
    });

    test('should update privacy settings', async () => {
      const newSettings = {
        allowAnalytics: false,
        allowAIFeatures: false,
        shareUsageData: true
      };

      const response = await request(app)
        .put('/api/auth/privacy-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSettings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowAnalytics).toBe(false);
      expect(response.body.data.allowAIFeatures).toBe(false);
      expect(response.body.data.shareUsageData).toBe(true);

      // Verify settings were saved to database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.preferences.privacy.allowAnalytics).toBe(false);
      expect(updatedUser.preferences.privacy.allowAIFeatures).toBe(false);
      expect(updatedUser.preferences.privacy.shareUsageData).toBe(true);
    });

    test('should reject invalid privacy settings', async () => {
      const invalidSettings = {
        allowAnalytics: 'not-a-boolean',
        invalidField: true
      };

      const response = await request(app)
        .put('/api/auth/privacy-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSettings)
        .expect(500); // Should fail validation

      // Original settings should remain unchanged
      const user = await User.findById(testUser._id);
      expect(user.preferences.privacy.allowAnalytics).toBe(true);
    });
  });

  describe('Data Export (GDPR Compliance)', () => {
    test('should export user data successfully', async () => {
      const response = await request(app)
        .get('/api/auth/export-data?format=json&includeMessages=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.exportId).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.encrypted).toBe(true);
      expect(response.body.data.data).toBeDefined();
    });

    test('should export data without messages when requested', async () => {
      const response = await request(app)
        .get('/api/auth/export-data?includeMessages=false')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Data Management Service', () => {
    test('should delete user data completely', async () => {
      const deletionResult = await dataManagementService.deleteUserData(testUser._id, {
        immediate: true,
        keepAnonymized: false,
        reason: 'test_deletion'
      });

      expect(deletionResult.success).toBe(true);
      expect(deletionResult.deletionId).toBeDefined();
      expect(deletionResult.summary).toBeDefined();

      // Verify user is deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBe(null);

      // Verify messages are deleted
      const messages = await Message.find({ sender: testUser._id });
      expect(messages.length).toBe(0);
    });

    test('should anonymize user data when requested', async () => {
      const deletionResult = await dataManagementService.deleteUserData(testUser._id, {
        immediate: true,
        keepAnonymized: true,
        reason: 'test_anonymization'
      });

      expect(deletionResult.success).toBe(true);

      // Verify user is deleted but messages are anonymized
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBe(null);

      const messages = await Message.find({ 'metadata.isAnonymized': true });
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content.text).toBe('[Message from deleted user]');
    });

    test('should export user data with proper structure', async () => {
      const exportResult = await dataManagementService.exportUserData(testUser._id, {
        format: 'json',
        includeMessages: true,
        encryptExport: false
      });

      expect(exportResult.success).toBe(true);
      expect(exportResult.data.user).toBeDefined();
      expect(exportResult.data.messages).toBeDefined();
      expect(exportResult.data.chats).toBeDefined();
      expect(exportResult.data.exportInfo).toBeDefined();
    });

    test('should update privacy settings correctly', async () => {
      const newSettings = {
        allowAnalytics: false,
        allowAIFeatures: true,
        shareUsageData: true
      };

      const result = await dataManagementService.updatePrivacySettings(testUser._id, newSettings);

      expect(result.success).toBe(true);
      expect(result.privacySettings.allowAnalytics).toBe(false);
      expect(result.privacySettings.allowAIFeatures).toBe(true);
      expect(result.privacySettings.shareUsageData).toBe(true);
    });

    test('should get privacy settings correctly', async () => {
      const result = await dataManagementService.getPrivacySettings(testUser._id);

      expect(result.success).toBe(true);
      expect(result.privacySettings).toBeDefined();
      expect(typeof result.privacySettings.allowAnalytics).toBe('boolean');
    });

    test('should handle non-existent user gracefully', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();

      await expect(
        dataManagementService.deleteUserData(fakeUserId)
      ).rejects.toThrow('User not found');

      await expect(
        dataManagementService.exportUserData(fakeUserId)
      ).rejects.toThrow('User not found');

      await expect(
        dataManagementService.getPrivacySettings(fakeUserId)
      ).rejects.toThrow('User not found');
    });
  });

  describe('Audit Logging', () => {
    test('should log authentication events', async () => {
      const authEvent = {
        userId: testUser._id.toString(),
        email: testUser.email,
        action: 'login',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        success: true,
        sessionId: 'test-session'
      };

      // This should not throw an error
      await expect(auditLogger.logAuthEvent(authEvent)).resolves.not.toThrow();
    });

    test('should log privacy events', async () => {
      const privacyEvent = {
        userId: testUser._id.toString(),
        action: 'privacy_settings_updated',
        changes: { allowAnalytics: false },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      await expect(auditLogger.logPrivacyEvent(privacyEvent)).resolves.not.toThrow();
    });

    test('should log security events', async () => {
      const securityEvent = {
        userId: testUser._id.toString(),
        action: 'suspicious_activity',
        severity: 'medium',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        details: 'Test security event'
      };

      await expect(auditLogger.logSecurityEvent(securityEvent)).resolves.not.toThrow();
    });

    test('should search logs correctly', async () => {
      // Log some test events first
      await auditLogger.logAuthEvent({
        userId: testUser._id.toString(),
        action: 'login',
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Wait a bit for logs to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const searchResults = await auditLogger.searchLogs({
        userId: testUser._id.toString(),
        type: 'authentication',
        limit: 10
      });

      expect(Array.isArray(searchResults)).toBe(true);
    });
  });

  describe('Session Management', () => {
    test('should revoke all sessions', async () => {
      // Add some refresh tokens
      await testUser.addRefreshToken('token1', 'agent1', '127.0.0.1');
      await testUser.addRefreshToken('token2', 'agent2', '127.0.0.1');

      const response = await request(app)
        .post('/api/auth/revoke-all-sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('revoked');

      // Verify tokens were cleared
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.refreshTokens.length).toBe(0);
      expect(updatedUser.tokenVersion).toBeGreaterThan(0);
    });

    test('should handle session timeout updates', async () => {
      const newTimeout = 120; // 2 hours

      // Update user's session timeout
      await User.findByIdAndUpdate(testUser._id, {
        'preferences.security.sessionTimeoutMinutes': newTimeout
      });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.preferences.security.sessionTimeoutMinutes).toBe(newTimeout);
    });
  });

  describe('Security Event Tracking', () => {
    test('should track failed login attempts', async () => {
      const user = await User.findById(testUser._id);
      
      // Simulate failed login attempts
      await user.incLoginAttempts();
      await user.incLoginAttempts();
      
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.loginAttempts).toBe(2);
    });

    test('should lock account after multiple failed attempts', async () => {
      const user = await User.findById(testUser._id);
      
      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await user.incLoginAttempts();
      }
      
      const lockedUser = await User.findById(testUser._id);
      expect(lockedUser.isLocked).toBe(true);
      expect(lockedUser.lockUntil).toBeDefined();
    });

    test('should reset login attempts after successful login', async () => {
      const user = await User.findById(testUser._id);
      
      // Add some failed attempts
      await user.incLoginAttempts();
      await user.incLoginAttempts();
      
      // Reset attempts (simulate successful login)
      await user.resetLoginAttempts();
      
      const resetUser = await User.findById(testUser._id);
      expect(resetUser.loginAttempts).toBeUndefined();
      expect(resetUser.lockUntil).toBeUndefined();
    });
  });

  describe('Data Validation and Sanitization', () => {
    test('should validate privacy setting types', async () => {
      const result = await dataManagementService.updatePrivacySettings(testUser._id, {
        allowAnalytics: true,
        allowAIFeatures: false,
        invalidSetting: 'should-be-ignored'
      });

      expect(result.success).toBe(true);
      expect(result.privacySettings.allowAnalytics).toBe(true);
      expect(result.privacySettings.allowAIFeatures).toBe(false);
      expect(result.privacySettings.invalidSetting).toBeUndefined();
    });

    test('should handle malformed deletion requests', async () => {
      await expect(
        dataManagementService.deleteUserData(null)
      ).rejects.toThrow();

      await expect(
        dataManagementService.deleteUserData('invalid-id')
      ).rejects.toThrow();
    });
  });

  describe('GDPR Compliance Features', () => {
    test('should provide complete data export', async () => {
      const exportResult = await dataManagementService.exportUserData(testUser._id, {
        includeMessages: true,
        includeAnalytics: false,
        encryptExport: false
      });

      expect(exportResult.success).toBe(true);
      expect(exportResult.data.user.email).toBe(testUser.email);
      expect(exportResult.data.messages).toBeDefined();
      expect(exportResult.data.exportInfo.version).toBeDefined();
    });

    test('should support right to be forgotten', async () => {
      const deletionResult = await dataManagementService.deleteUserData(testUser._id, {
        immediate: true,
        keepAnonymized: false
      });

      expect(deletionResult.success).toBe(true);
      
      // Verify complete removal
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBe(null);
    });

    test('should track deletion status', async () => {
      const deletionResult = await dataManagementService.deleteUserData(testUser._id);
      const status = dataManagementService.getDeletionStatus(deletionResult.deletionId);

      expect(status.found).toBe(true);
      expect(status.status).toBe('completed');
    });
  });
});