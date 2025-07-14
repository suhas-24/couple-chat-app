// Test setup file
const mongoose = require('mongoose');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRE = '1h';

// Suppress console.log during tests unless explicitly needed
if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.error = jest.fn();
}

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Close any remaining database connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});