const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

/**
 * Application Monitoring Service
 * Tracks performance, errors, and system metrics
 */

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      errors: {
        total: 0,
        types: {},
        recent: []
      },
      system: {
        startTime: Date.now(),
        uptime: 0,
        memory: {},
        cpu: {}
      },
      users: {
        active: 0,
        total: 0,
        concurrent: 0
      }
    };
    
    this.alerts = [];
    this.thresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      memoryUsage: 0.9, // 90%
      cpuUsage: 0.8 // 80%
    };

    // Start monitoring intervals
    this.startMonitoring();
  }

  // Start monitoring intervals
  startMonitoring() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Clean old data every hour
    setInterval(() => {
      this.cleanOldData();
    }, 3600000);

    // Generate alerts every 5 minutes
    setInterval(() => {
      this.checkAlerts();
    }, 300000);
  }

  // Track HTTP requests
  trackRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    this.metrics.requests.responseTimes.push(responseTime);
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Calculate average response time
    const responseTimes = this.metrics.requests.responseTimes;
    this.metrics.requests.averageResponseTime = 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Keep only last 1000 response times
    if (responseTimes.length > 1000) {
      this.metrics.requests.responseTimes = responseTimes.slice(-1000);
    }

    // Emit event for real-time monitoring
    this.emit('request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  // Track errors
  trackError(error, context = {}) {
    this.metrics.errors.total++;
    
    const errorType = error.name || 'Unknown';
    this.metrics.errors.types[errorType] = (this.metrics.errors.types[errorType] || 0) + 1;
    
    const errorData = {
      message: error.message,
      stack: error.stack,
      type: errorType,
      context,
      timestamp: new Date().toISOString()
    };

    this.metrics.errors.recent.push(errorData);
    
    // Keep only last 100 errors
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(-100);
    }

    // Emit event for real-time monitoring
    this.emit('error', errorData);

    // Log to file
    this.logError(errorData);
  }

  // Track user activity
  trackUserActivity(action, userId = null) {
    switch (action) {
      case 'login':
        this.metrics.users.active++;
        break;
      case 'logout':
        this.metrics.users.active = Math.max(0, this.metrics.users.active - 1);
        break;
      case 'register':
        this.metrics.users.total++;
        break;
      case 'concurrent_add':
        this.metrics.users.concurrent++;
        break;
      case 'concurrent_remove':
        this.metrics.users.concurrent = Math.max(0, this.metrics.users.concurrent - 1);
        break;
    }

    this.emit('user_activity', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      metrics: { ...this.metrics.users }
    });
  }

  // Update system metrics
  updateSystemMetrics() {
    const now = Date.now();
    this.metrics.system.uptime = now - this.metrics.system.startTime;
    this.metrics.system.memory = process.memoryUsage();
    this.metrics.system.cpu = process.cpuUsage();

    this.emit('system_metrics', {
      timestamp: new Date().toISOString(),
      uptime: this.metrics.system.uptime,
      memory: this.metrics.system.memory,
      cpu: this.metrics.system.cpu
    });
  }

  // Check for alerts
  checkAlerts() {
    const now = Date.now();
    const newAlerts = [];

    // Check response time
    if (this.metrics.requests.averageResponseTime > this.thresholds.responseTime) {
      newAlerts.push({
        type: 'high_response_time',
        severity: 'warning',
        message: `Average response time: ${this.metrics.requests.averageResponseTime.toFixed(2)}ms`,
        threshold: this.thresholds.responseTime,
        value: this.metrics.requests.averageResponseTime,
        timestamp: new Date().toISOString()
      });
    }

    // Check error rate
    const errorRate = this.metrics.requests.total > 0 ? 
      this.metrics.requests.failed / this.metrics.requests.total : 0;
    
    if (errorRate > this.thresholds.errorRate) {
      newAlerts.push({
        type: 'high_error_rate',
        severity: 'error',
        message: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
        threshold: this.thresholds.errorRate * 100,
        value: errorRate * 100,
        timestamp: new Date().toISOString()
      });
    }

    // Check memory usage
    if (this.metrics.system.memory.heapUsed) {
      const memoryUsage = this.metrics.system.memory.heapUsed / this.metrics.system.memory.heapTotal;
      if (memoryUsage > this.thresholds.memoryUsage) {
        newAlerts.push({
          type: 'high_memory_usage',
          severity: 'warning',
          message: `Memory usage: ${(memoryUsage * 100).toFixed(2)}%`,
          threshold: this.thresholds.memoryUsage * 100,
          value: memoryUsage * 100,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Add new alerts
    this.alerts.push(...newAlerts);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Emit alerts
    newAlerts.forEach(alert => {
      this.emit('alert', alert);
    });
  }

  // Clean old data
  cleanOldData() {
    const oneHourAgo = Date.now() - 3600000;
    
    // Clean old response times
    this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.slice(-500);
    
    // Clean old errors
    this.metrics.errors.recent = this.metrics.errors.recent.filter(error => 
      new Date(error.timestamp).getTime() > oneHourAgo
    );

    // Clean old alerts
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > oneHourAgo
    );
  }

  // Log error to file
  logError(errorData) {
    const logDir = path.join(__dirname, '../logs');
    const logFile = path.join(logDir, 'errors.log');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = `${errorData.timestamp} - ${errorData.type}: ${errorData.message}\n${errorData.stack}\n---\n`;
    
    fs.appendFile(logFile, logEntry, (err) => {
      if (err) {
        console.error('Failed to write error log:', err);
      }
    });
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      alerts: this.alerts,
      timestamp: new Date().toISOString()
    };
  }

  // Get performance summary
  getPerformanceSummary() {
    return {
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        successRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.successful / this.metrics.requests.total * 100).toFixed(2) : 0,
        errorRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.failed / this.metrics.requests.total * 100).toFixed(2) : 0,
        averageResponseTime: this.metrics.requests.averageResponseTime.toFixed(2)
      },
      errors: {
        total: this.metrics.errors.total,
        types: this.metrics.errors.types,
        recent: this.metrics.errors.recent.length
      },
      system: {
        uptime: this.metrics.system.uptime,
        memory: this.metrics.system.memory,
        cpu: this.metrics.system.cpu
      },
      users: this.metrics.users,
      alerts: this.alerts.length,
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics
  resetMetrics() {
    this.metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
    
    this.metrics.errors = {
      total: 0,
      types: {},
      recent: []
    };
    
    this.alerts = [];
    
    this.emit('metrics_reset', {
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Middleware to track requests
const requestTracker = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    monitoringService.trackRequest(req, res, responseTime);
  });
  
  next();
};

module.exports = {
  monitoringService,
  requestTracker
};