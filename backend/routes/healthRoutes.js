const express = require('express');
const { 
  healthCheck, 
  readinessCheck, 
  livenessCheck, 
  metricsCheck 
} = require('../controllers/healthController');

const router = express.Router();

// Middleware to track request start time
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

/**
 * Health Check Routes
 * Provides various health monitoring endpoints for the application
 */

// Main health check endpoint
// GET /api/health
router.get('/', healthCheck);

// Readiness check - checks if the application is ready to serve traffic
// GET /api/health/ready
router.get('/ready', readinessCheck);

// Liveness check - checks if the application is alive
// GET /api/health/live
router.get('/live', livenessCheck);

// Metrics endpoint - provides detailed system metrics
// GET /api/health/metrics
router.get('/metrics', metricsCheck);

// Simple ping endpoint for basic connectivity tests
// GET /api/health/ping
router.get('/ping', (req, res) => {
  res.status(200).json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;