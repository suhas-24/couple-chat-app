const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { generalLimiter } = require('./middleware/rateLimiter');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
// Add more route imports as needed

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
// Add more route mounts as needed

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Couple Chat API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`💕 Couple Chat Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize Socket.io
const SocketManager = require('./services/socketManager');
const socketManager = new SocketManager(server);

// Make socket manager available to other modules
app.set('socketManager', socketManager);

module.exports = app;

// Created with Comet Assistant
