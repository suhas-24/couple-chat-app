const rateLimit = require('express-rate-limit');

// Enhanced error response format
const createRateLimitResponse = (message, code) => ({
  success: false,
  error: message,
  code: code,
  timestamp: new Date().toISOString()
});

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: createRateLimitResponse(
    'Too many requests from this IP, please try again later.',
    'RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path} at ${new Date().toISOString()}`);
    res.status(429).json(createRateLimitResponse(
      'Too many requests from this IP, please try again later.',
      'RATE_LIMIT_EXCEEDED'
    ));
  }
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Increased slightly for better UX while maintaining security
  message: createRateLimitResponse(
    'Too many authentication attempts, please try again later.',
    'AUTH_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Auth rate limit exceeded for IP: ${req.ip} on ${req.path} at ${new Date().toISOString()}`);
    res.status(429).json(createRateLimitResponse(
      'Too many authentication attempts, please try again later.',
      'AUTH_RATE_LIMIT_EXCEEDED'
    ));
  },
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  }
});

// Strict rate limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Slightly increased for better UX
  message: createRateLimitResponse(
    'Too many password reset attempts, please try again later.',
    'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Password reset rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json(createRateLimitResponse(
      'Too many password reset attempts, please try again later.',
      'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
    ));
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

// Email verification rate limiter
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 email verification requests per hour
  message: createRateLimitResponse(
    'Too many email verification attempts, please try again later.',
    'EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Email verification rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json(createRateLimitResponse(
      'Too many email verification attempts, please try again later.',
      'EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED'
    ));
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

// AI endpoint rate limiter
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 AI requests per minute
  message: createRateLimitResponse(
    'Too many AI requests, please slow down.',
    'AI_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`AI rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json(createRateLimitResponse(
      'Too many AI requests, please slow down.',
      'AI_RATE_LIMIT_EXCEEDED'
    ));
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  aiLimiter,
};