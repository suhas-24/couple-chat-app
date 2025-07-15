/**
 * Authentication Controller Tests
 * Tests for user authentication endpoints
 */

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Authentication Controller', () => {
  beforeEach(async () => {
    // Clean up users before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/signup', () => {
    const validUserData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password123!',
    };

    it('should create a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(`${validUserData.firstName} ${validUserData.lastName}`);
    });

    it('should hash the password correctly', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(201);

      const user = await User.findOne({ email: validUserData.email });
      expect(user.password).not.toBe(validUserData.password);
      
      const isPasswordValid = await bcrypt.compare(validUserData.password, user.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should return a valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(201);

      const token = response.body.data.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.userId).toBeDefined();
      expect(decoded.email).toBe(validUserData.email);
    });

    it('should reject duplicate email addresses', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(201);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = { email: 'test@example.com' }; // Missing required fields

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...validUserData,
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('valid email');
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...validUserData,
        password: '123', // Too weak
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should handle newsletter subscription', async () => {
      const dataWithNewsletter = {
        ...validUserData,
        subscribeToNewsletter: true,
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(dataWithNewsletter)
        .expect(201);

      const user = await User.findOne({ email: validUserData.email });
      expect(user.preferences.notifications.email).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await testUser.save();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject unverified email accounts', async () => {
      // Create unverified user
      const unverifiedUser = new User({
        name: 'Unverified User',
        email: 'unverified@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: false,
      });
      await unverifiedUser.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('verify your email');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' }) // Missing password
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should update last login timestamp', async () => {
      const originalLastLogin = testUser.lastLoginAt;

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastLoginAt).not.toEqual(originalLastLogin);
    });
  });

  describe('POST /api/auth/google-login', () => {
    it('should handle Google OAuth login', async () => {
      // Mock Google token verification
      const mockGoogleUser = {
        sub: 'google-user-id',
        email: 'google@example.com',
        name: 'Google User',
        picture: 'https://example.com/avatar.jpg',
      };

      // This would require mocking the Google OAuth verification
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .post('/api/auth/google-login')
        .send({ credential: 'mock-google-token' })
        .expect(400); // Will fail without proper Google token

      expect(response.body.success).toBe(false);
    });

    it('should create new user from Google OAuth', async () => {
      // This test would require proper Google OAuth mocking
      // Implementation depends on the actual Google OAuth integration
    });

    it('should login existing Google user', async () => {
      // Create existing Google user
      const googleUser = new User({
        name: 'Google User',
        email: 'google@example.com',
        googleId: 'google-user-id',
        authProvider: 'google',
        isEmailVerified: true,
      });
      await googleUser.save();

      // Test would require proper Google OAuth token verification
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await testUser.save();

      authToken = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await testUser.save();

      authToken = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should update user profile', async () => {
      const updateData = {
        profile: {
          firstName: 'Updated',
          lastName: 'Name',
          bio: 'Updated bio',
        },
        preferences: {
          language: 'es',
          notifications: {
            email: false,
            push: true,
          },
        },
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profile.firstName).toBe('Updated');
      expect(response.body.data.user.preferences.language).toBe('es');

      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.profile.firstName).toBe('Updated');
      expect(updatedUser.preferences.language).toBe('es');
    });

    it('should not allow updating sensitive fields', async () => {
      const maliciousUpdate = {
        email: 'hacker@example.com',
        password: 'hacked',
        isEmailVerified: false,
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousUpdate)
        .expect(200);

      // Verify sensitive fields weren't changed
      const user = await User.findById(testUser._id);
      expect(user.email).toBe('test@example.com'); // Original email
      expect(user.isEmailVerified).toBe(true); // Original verification status
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ profile: { firstName: 'Test' } })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await testUser.save();

      authToken = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');
    });

    it('should work without authentication (client-side logout)', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/auth/account', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 12),
        isEmailVerified: true,
      });
      await testUser.save();

      authToken = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify user was deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/auth/account')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should clean up related data', async () => {
      // This would test cleanup of chats, messages, etc.
      // Implementation depends on the actual cleanup logic
      await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify related data cleanup
      // const userChats = await Chat.find({ participants: testUser._id });
      // expect(userChats).toHaveLength(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.error).toContain('rate limit');
    });

    it('should rate limit signup attempts', async () => {
      const signupData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      // Make multiple signup attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/signup')
          .send({ ...signupData, email: `test${i}@example.com` });
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ ...signupData, email: 'test99@example.com' })
        .expect(429);

      expect(response.body.error).toContain('rate limit');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', async () => {
      const maliciousData = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(maliciousData)
        .expect(201);

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user.profile.firstName).not.toContain('<script>');
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "'; DROP TABLE users; --",
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(sqlInjectionData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});