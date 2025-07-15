const app = require('./app');
const http = require('http');

// Create HTTP server
const server = http.createServer(app);

// Get port from environment or use default
const PORT = process.env.PORT || 5000;

// State management
let isShuttingDown = false;
const connections = new Set();

// Track connections for graceful shutdown
server.on('connection', (connection) => {
  connections.add(connection);
  connection.on('close', () => {
    connections.delete(connection);
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  console.log(`\n💔 Received ${signal}, starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('💕 Server closed successfully');
  });

  // Close existing connections
  const connectionTimeout = setTimeout(() => {
    console.log('⏰ Connection timeout reached, forcing shutdown...');
    for (const connection of connections) {
      connection.destroy();
    }
  }, 30000); // 30 second timeout

  // Wait for all connections to close
  while (connections.size > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  clearTimeout(connectionTimeout);

  // Close database connections
  try {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('📊 Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }

  // Get socket manager and close connections
  try {
    const socketManager = app.get('socketManager');
    if (socketManager) {
      socketManager.close();
      console.log('🔌 WebSocket connections closed');
    }
  } catch (error) {
    console.error('Error closing WebSocket:', error);
  }

  console.log('👋 Graceful shutdown complete');
  process.exit(0);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to:
  // 1. Send error to monitoring service
  // 2. Attempt graceful shutdown
  // 3. Exit with error code
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // In production, immediately shutdown as state might be corrupted
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Development error handler
if (process.env.NODE_ENV === 'development') {
  // Log all errors but keep server running
  process.on('warning', (warning) => {
    console.warn('⚠️ Warning:', warning);
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`💕 Couple Chat Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS: ${process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000'}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL || 'mongodb://localhost:27017/couple-chat'}`);
  
  // Initialize Socket.io after server starts
  const SocketManager = require('./services/socketManager');
  const socketManager = new SocketManager(server);
  app.set('socketManager', socketManager);
  
  // Log startup time
  console.log(`⏱️ Server started at: ${new Date().toISOString()}`);
});

// Export server for testing
module.exports = server;
