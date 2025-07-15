const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { generalLimiter } = require('./middleware/rateLimiter');
const { 
  globalErrorHandler, 
  handleNotFound, 
  handleDatabaseErrors,
  requestTimeout,
  requestLogger 
} = require('./middleware/errorHandler');
const sanitizationMiddleware = require('./middleware/sanitization');
const { requestTracker } = require('./services/monitoringService');

// Load environment variables
dotenv.config();

// Initialize database error handlers
handleDatabaseErrors();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://apis.google.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    reportOnly: false
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Rate limiting
app.use(generalLimiter);

// Cookie parser
app.use(cookieParser());

/**
 * ---------------------------------------------------------------------------
 * CORS configuration
 * ---------------------------------------------------------------------------
 *  - Accepts any localhost:<port> in development (helpful for Storybook, Vercel
 *    previews, etc.).
 *  - In production uses comma-separated CORS_ALLOWED_ORIGINS or FRONTEND_URL.
 *  - Handles requests without Origin header (e.g. curl / mobile apps).
 *  - Exposes all common headers / methods and supports credentials.
 *  - Ensures proper 204 status for pre-flight OPTIONS.
 */
const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // No origin (curl, mobile) – allow.
    if (!origin) return callback(null, true);

    // Allow any localhost with arbitrary port in dev.
    // Matches: http://localhost, https://localhost, and any port variant like http://localhost:3001
    if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Check whitelist for production URLs.
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Otherwise reject.
    return callback(new Error('Not allowed by CORS'));
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false
};

app.use(cors(corsOptions));
// Handle pre-flight explicitly (some proxies strip automatic handling).
app.options('*', cors(corsOptions));

// Request timeout middleware
app.use(requestTimeout(30000)); // 30 second timeout

// Enhanced request logging
app.use(requestLogger);

// Request tracking for monitoring
app.use(requestTracker);

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      const error = new Error('Invalid JSON');
      error.statusCode = 400;
      throw error;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware (after body parsing)
app.use(sanitizationMiddleware.sanitizeInput());

// Additional security headers
app.use(sanitizationMiddleware.setSecurityHeaders());

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/monitoring', express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/couple-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

// Routes mountpoint
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const healthRoutes = require('./routes/healthRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
// Add more route imports as needed

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/monitoring', monitoringRoutes);
// Add more route mounts as needed

// 404 handler (must come before global error handler)
app.use(handleNotFound);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Socket manager will be initialized by server.js

module.exports = app;

// Created with Comet Assistant
