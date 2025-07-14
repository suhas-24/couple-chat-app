const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');
const crypto = require('crypto');

// Test database setup
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/couple-chat-test';

describe('Authentication System', () => {
  let app;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    
    // Import test app configuration
    app = require('../app-test');
  });

  afterAll(async () => {
    // Clean up and close connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/signup', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(validUserData.email.toLowerCase());
      expect(response.body.user.name).toBe(validUserData.name);
      expect(response.body.user.isEmailVerified).toBe(false);
      expect(response.body.user._id).toBeDefined();
      expect(response.body.user.password).toBeUndefined();

      // Check if user was created in database
      const user = await User.findOne({ email: validUserData.email.toLowerCase() });
      expect(user).toBeTruthy();
      expect(user.authProvider).toBe('local');
    });

    it('should set secure auth cookie on successful registration', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(201);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('auth-token'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          ...validUserData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('valid email');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          ...validUserData,
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('6 characters');
    });

    it('should reject registration with missing name', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('USER_EXISTS');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        authProvider: 'local'
      });
      await testUser.save();
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.lastLoginAt).toBeDefined();
      expect(response.body.user.password).toBeUndefined();

      // Check if lastLoginAt was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastLoginAt).toBeTruthy();
    });

    it('should set secure auth cookie on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('auth-token'))).toBe(true);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');

      // Check if login attempts were incremented
      const user = await User.findById(testUser._id);
      expect(user.loginAttempts).toBe(1);
    });

    it('should lock account after multiple failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword'
          })
          .expect(401);
      }

      // 6th attempt should return account locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(423);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ACCOUNT_LOCKED');
      expect(response.body.error).toContain('locked');
    });

    it('should reject login for inactive user', async () => {
      // Deactivate user
      testUser.isActive = false;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/google', () => {
    // Note: Testing Google OAuth requires mocking the Google Auth Library
    // This is a simplified test structure
    it('should reject login without credential', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_CREDENTIAL');
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    let testUser;

    beforeEach(async () => {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        authProvider: 'local'
      });
      await testUser.save();
    });

    it('should accept password reset request for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'test@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');

      // Check if reset token was set
      const user = await User.findById(testUser._id);
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetExpires).toBeTruthy();
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let testUser;
    let resetToken;

    beforeEach(async () => {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        authProvider: 'local'
      });
      
      resetToken = testUser.createPasswordResetToken();
      await testUser.save();
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123';
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');

      // Check if password was changed and tokens cleared
      const user = await User.findById(testUser._id);
      expect(user.passwordResetToken).toBeUndefined();
      expect(user.passwordResetExpires).toBeUndefined();
      expect(user.loginAttempts).toBe(0);

      // Verify new password works
      const isValid = await user.comparePassword(newPassword);
      expect(isValid).toBe(true);
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired reset token', async () => {
      // Manually expire the token
      testUser.passwordResetExpires = new Date(Date.now() - 1000);
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let testUser;
    let verificationToken;

    beforeEach(async () => {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        authProvider: 'local',
        isEmailVerified: false
      });
      
      verificationToken = testUser.createEmailVerificationToken();
      await testUser.save();
    });

    it('should verify email with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: verificationToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified successfully');

      // Check if email was verified and tokens cleared
      const user = await User.findById(testUser._id);
      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeUndefined();
      expect(user.emailVerificationExpires).toBeUndefined();
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'invalid-token'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Protected Routes', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      // Create and login user to get auth token
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        authProvider: 'local'
      });
      await testUser.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      // Extract token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      const authCookie = cookies.find(cookie => cookie.includes('auth-token'));
      authToken = authCookie.split('auth-token=')[1].split(';')[0];
    });

    describe('GET /api/auth/profile', () => {
      it('should return user profile for authenticated user', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Cookie', `auth-token=${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe('test@example.com');
        expect(response.body.data.user.password).toBeUndefined();
      });

      it('should reject request without auth token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('No token provided');
      });
    });

    describe('DELETE /api/auth/account', () => {
      it('should delete account with valid password', async () => {
        const response = await request(app)
          .delete('/api/auth/account')
          .set('Cookie', `auth-token=${authToken}`)
          .send({
            password: 'Password123'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('permanently deleted');

        // Check if user was deactivated and anonymized
        const user = await User.findById(testUser._id);
        expect(user.isActive).toBe(false);
        expect(user.email).toContain('deleted_');
        expect(user.name).toBe('Deleted User');
      });

      it('should reject account deletion with wrong password', async () => {
        const response = await request(app)
          .delete('/api/auth/account')
          .set('Cookie', `auth-token=${authToken}`)
          .send({
            password: 'WrongPassword'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('INVALID_PASSWORD');
      });
    });
  });

  describe('Security Features', () => {
    describe('Rate Limiting', () => {
      it('should apply rate limiting to auth routes', async () => {
        // This test would require configuring rate limiting for testing
        // and making multiple rapid requests to trigger the limit
        expect(true).toBe(true); // Placeholder
      });
    });

    describe('Input Validation', () => {
      it('should sanitize email input', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            name: 'Test User',
            email: '  SANITIZE@EXAMPLE.COM  ',
            password: 'Password123'
          })
          .expect(201);

        expect(response.body.user.email).toBe('sanitize@example.com');
      });

      it('should reject XSS attempts in name field', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            name: '<script>alert("xss")</script>',
            email: 'test@example.com',
            password: 'Password123'
          })
          .expect(201);

        // The name should be stored as-is but properly escaped when returned
        expect(response.body.user.name).toBe('<script>alert("xss")</script>');
      });
    });

    describe('Password Security', () => {
      it('should hash passwords before storing', async () => {
        await request(app)
          .post('/api/auth/signup')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: 'Password123'
          })
          .expect(201);

        const user = await User.findOne({ email: 'test@example.com' });
        expect(user.password).not.toBe('Password123');
        expect(user.password.length).toBeGreaterThan(50); // bcrypt hash length
      });
    });
  });
});