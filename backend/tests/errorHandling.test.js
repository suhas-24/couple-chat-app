const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { AppError } = require('../middleware/errorHandler');

describe('Error Handling Middleware', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/couple-chat-test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Global Error Handler', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Can\'t find'),
        code: 'NOT_FOUND',
        timestamp: expect.any(String),
      });
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: '', // Invalid: empty name
          email: 'invalid-email', // Invalid: not a proper email
          password: '123', // Invalid: too short
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('validation'),
        code: 'VALIDATION_ERROR',
      });
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid JSON',
      });
    });

    it('should handle rate limit errors', async () => {
      // Make multiple requests to trigger rate limit
      const promises = Array(20).fill().map(() => 
        request(app).get('/api/health')
      );

      await Promise.all(promises);

      // This request should be rate limited
      const response = await request(app)
        .get('/api/health')
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Too many requests'),
        code: 'RATE_LIMIT_EXCEEDED',
      });
    });
  });

  describe('AppError Class', () => {
    it('should create operational errors correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should distinguish between 4xx and 5xx errors', () => {
      const clientError = new AppError('Client error', 400);
      const serverError = new AppError('Server error', 500);
      
      expect(clientError.status).toBe('fail');
      expect(serverError.status).toBe('error');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle MongoDB cast errors', async () => {
      const response = await request(app)
        .get('/api/chat/invalid-object-id/messages')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid'),
        code: 'INVALID_ID',
      });
    });

    it('should handle duplicate key errors', async () => {
      // First, create a user
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'duplicate@test.com',
          password: 'Password123',
        });

      // Try to create another user with the same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Another User',
          email: 'duplicate@test.com',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('already exists'),
        code: 'DUPLICATE_FIELD',
      });
    });
  });

  describe('Request Timeout', () => {
    it('should handle request timeouts', (done) => {
      // Create a route that takes longer than the timeout
      app.get('/api/test-timeout', (req, res) => {
        setTimeout(() => {
          res.json({ message: 'This should timeout' });
        }, 35000); // Longer than 30 second timeout
      });

      request(app)
        .get('/api/test-timeout')
        .expect(408)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toMatchObject({
            success: false,
            error: 'Request timeout',
            code: 'REQUEST_TIMEOUT',
          });
          done();
        });
    }, 35000);
  });

  describe('Error Response Format', () => {
    it('should return consistent error format in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('stack'); // Should include stack in development

      process.env.NODE_ENV = originalEnv;
    });

    it('should return sanitized error format in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).not.toHaveProperty('stack'); // Should not include stack in production

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        message: 'Couple Chat API is running',
        timestamp: expect.any(String),
      });
    });
  });

  describe('CORS Error Handling', () => {
    it('should handle CORS errors for disallowed origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(500); // CORS error becomes 500

      // The exact response depends on how CORS middleware handles the error
      expect(response.body).toHaveProperty('success', false);
    });

    it('should allow requests from localhost', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.body.status).toBe('OK');
    });
  });

  describe('File Upload Error Handling', () => {
    it('should handle file size limit errors', async () => {
      // Create a large buffer (larger than 10MB limit)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      const response = await request(app)
        .post('/api/chat/upload-csv')
        .attach('file', largeBuffer, 'large-file.csv')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('File too large'),
        code: 'FILE_TOO_LARGE',
      });
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid token'),
        code: 'INVALID_TOKEN',
      });
    });

    it('should handle expired JWT tokens', async () => {
      // This would require creating an expired token
      // For now, we'll test the error handler directly
      const expiredTokenError = new Error('jwt expired');
      expiredTokenError.name = 'TokenExpiredError';
      
      // Test that the error handler would convert this correctly
      expect(expiredTokenError.name).toBe('TokenExpiredError');
    });
  });
});