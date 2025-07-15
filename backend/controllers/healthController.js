const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const pkg = require('../package.json');

/**
 * Health Check Controller
 * Provides comprehensive health monitoring endpoints
 */

// Health check endpoint
const healthCheck = async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: pkg.version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: await checkDatabase(),
        memory: checkMemory(),
        cpu: checkCPU(),
        disk: checkDisk()
      },
      performance: {
        responseTime: Date.now() - req.startTime,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    // Determine overall health status
    const isHealthy = Object.values(healthStatus.services).every(service => service.status === 'healthy');
    healthStatus.status = isHealthy ? 'healthy' : 'unhealthy';

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

// Readiness check endpoint
const readinessCheck = async (req, res) => {
  try {
    const readinessStatus = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: await checkDatabase(),
        environment: checkEnvironment(),
        dependencies: checkDependencies()
      }
    };

    const isReady = Object.values(readinessStatus.checks).every(check => check.status === 'ready');
    readinessStatus.status = isReady ? 'ready' : 'not_ready';

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json(readinessStatus);

  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

// Liveness check endpoint
const livenessCheck = (req, res) => {
  try {
    const livenessStatus = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    res.status(200).json(livenessStatus);

  } catch (error) {
    console.error('Liveness check failed:', error);
    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

// Detailed system metrics endpoint
const metricsCheck = async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        cpus: os.cpus().length,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        }
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      database: await getDatabaseMetrics(),
      application: {
        name: pkg.name,
        version: pkg.version,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000
      }
    };

    res.status(200).json(metrics);

  } catch (error) {
    console.error('Metrics check failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
};

// Database health check
async function checkDatabase() {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    if (dbState === 1) {
      // Test database connection with a simple query
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        state: states[dbState],
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        responseTime: Date.now() - Date.now() // Will be calculated in actual implementation
      };
    } else {
      return {
        status: 'unhealthy',
        state: states[dbState],
        error: 'Database not connected'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

// Memory health check
function checkMemory() {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  const memoryThreshold = 0.9; // 90% threshold
  const isHealthy = (usedMemory / totalMemory) < memoryThreshold;

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    usage: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    },
    system: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      percentage: ((usedMemory / totalMemory) * 100).toFixed(2)
    },
    threshold: memoryThreshold * 100
  };
}

// CPU health check
function checkCPU() {
  const loadAverage = os.loadavg();
  const cpuCount = os.cpus().length;
  
  const cpuThreshold = 0.8; // 80% threshold
  const currentLoad = loadAverage[0] / cpuCount;
  const isHealthy = currentLoad < cpuThreshold;

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    loadAverage: loadAverage,
    cpuCount: cpuCount,
    currentLoad: currentLoad.toFixed(2),
    threshold: cpuThreshold * 100
  };
}

// Disk health check
function checkDisk() {
  // This is a simplified check - in production, you might use fs.statvfs or similar
  const isHealthy = true; // Placeholder
  
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    // Add actual disk usage metrics here
    note: 'Disk monitoring requires additional implementation'
  };
}

// Environment check
function checkEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GEMINI_API_KEY',
    'ENCRYPTION_KEY'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const isReady = missingVars.length === 0;

  return {
    status: isReady ? 'ready' : 'not_ready',
    required: requiredEnvVars,
    missing: missingVars,
    environment: process.env.NODE_ENV || 'development'
  };
}

// Dependencies check
function checkDependencies() {
  try {
    // Check critical dependencies
    const dependencies = {
      express: require('express'),
      mongoose: require('mongoose'),
      cors: require('cors'),
      helmet: require('helmet')
    };

    return {
      status: 'ready',
      dependencies: Object.keys(dependencies),
      versions: Object.keys(dependencies).reduce((acc, dep) => {
        acc[dep] = require(`${dep}/package.json`).version;
        return acc;
      }, {})
    };
  } catch (error) {
    return {
      status: 'not_ready',
      error: error.message
    };
  }
}

// Database metrics
async function getDatabaseMetrics() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        status: 'disconnected',
        metrics: null
      };
    }

    const db = mongoose.connection.db;
    const admin = db.admin();
    
    // Get database statistics
    const stats = await db.stats();
    const serverStatus = await admin.serverStatus();

    return {
      status: 'connected',
      stats: {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      },
      server: {
        version: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        memory: serverStatus.mem
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
  metricsCheck
};