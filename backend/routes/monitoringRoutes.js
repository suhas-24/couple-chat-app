const express = require('express');
const { monitoringService } = require('../services/monitoringService');

const router = express.Router();

/**
 * Monitoring Routes
 * Provides real-time monitoring and metrics endpoints
 */

// Get all metrics
// GET /api/monitoring/metrics
router.get('/metrics', (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

// Get performance summary
// GET /api/monitoring/performance
router.get('/performance', (req, res) => {
  try {
    const summary = monitoringService.getPerformanceSummary();
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve performance summary',
      message: error.message
    });
  }
});

// Get current alerts
// GET /api/monitoring/alerts
router.get('/alerts', (req, res) => {
  try {
    const alerts = monitoringService.alerts;
    res.status(200).json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

// Get system status
// GET /api/monitoring/status
router.get('/status', (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const status = {
      overall: 'healthy',
      services: {
        api: metrics.requests.total > 0 ? 'active' : 'idle',
        database: 'connected', // This should be checked from actual DB connection
        monitoring: 'active'
      },
      performance: {
        responseTime: metrics.requests.averageResponseTime,
        errorRate: metrics.requests.total > 0 ? 
          (metrics.requests.failed / metrics.requests.total * 100).toFixed(2) : 0,
        uptime: metrics.system.uptime
      },
      alerts: {
        count: metrics.alerts.length,
        critical: metrics.alerts.filter(alert => alert.severity === 'error').length,
        warnings: metrics.alerts.filter(alert => alert.severity === 'warning').length
      },
      timestamp: new Date().toISOString()
    };

    // Determine overall health
    if (status.alerts.critical > 0) {
      status.overall = 'critical';
    } else if (status.alerts.warnings > 0) {
      status.overall = 'warning';
    }

    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve system status',
      message: error.message
    });
  }
});

// Reset metrics (for testing/debugging)
// POST /api/monitoring/reset
router.post('/reset', (req, res) => {
  try {
    monitoringService.resetMetrics();
    res.status(200).json({
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset metrics',
      message: error.message
    });
  }
});

// Real-time metrics stream (Server-Sent Events)
// GET /api/monitoring/stream
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial data
  res.write(`data: ${JSON.stringify(monitoringService.getPerformanceSummary())}\n\n`);

  // Set up event listeners
  const onRequest = (data) => {
    res.write(`event: request\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onError = (data) => {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onAlert = (data) => {
    res.write(`event: alert\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onSystemMetrics = (data) => {
    res.write(`event: system\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Register event listeners
  monitoringService.on('request', onRequest);
  monitoringService.on('error', onError);
  monitoringService.on('alert', onAlert);
  monitoringService.on('system_metrics', onSystemMetrics);

  // Send periodic updates
  const interval = setInterval(() => {
    res.write(`event: metrics\n`);
    res.write(`data: ${JSON.stringify(monitoringService.getPerformanceSummary())}\n\n`);
  }, 10000); // Every 10 seconds

  // Cleanup on connection close
  req.on('close', () => {
    clearInterval(interval);
    monitoringService.removeListener('request', onRequest);
    monitoringService.removeListener('error', onError);
    monitoringService.removeListener('alert', onAlert);
    monitoringService.removeListener('system_metrics', onSystemMetrics);
  });
});

module.exports = router;