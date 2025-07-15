const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./encryptionService');

/**
 * Audit Logger Service
 * Logs security events and user actions for compliance and monitoring
 */
class AuditLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 10;
    this.logQueue = [];
    this.isProcessing = false;
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Process log queue periodically (only in non-test environment)
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => this.processLogQueue(), 5000);
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Log authentication events
   * @param {Object} event - Authentication event
   */
  async logAuthEvent(event) {
    const auditEvent = {
      type: 'authentication',
      timestamp: new Date().toISOString(),
      userId: event.userId,
      email: event.email,
      action: event.action, // login, logout, failed_login, password_change, etc.
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success,
      reason: event.reason,
      sessionId: event.sessionId,
      metadata: event.metadata || {}
    };

    await this.writeAuditLog(auditEvent);
  }

  /**
   * Log data access events
   * @param {Object} event - Data access event
   */
  async logDataAccess(event) {
    const auditEvent = {
      type: 'data_access',
      timestamp: new Date().toISOString(),
      userId: event.userId,
      action: event.action, // read, write, delete, export
      resource: event.resource, // messages, chats, user_data
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success,
      reason: event.reason,
      metadata: event.metadata || {}
    };

    await this.writeAuditLog(auditEvent);
  }

  /**
   * Log privacy events
   * @param {Object} event - Privacy event
   */
  async logPrivacyEvent(event) {
    const auditEvent = {
      type: 'privacy',
      timestamp: new Date().toISOString(),
      userId: event.userId,
      action: event.action, // settings_change, data_export, data_deletion
      changes: event.changes,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata || {}
    };

    await this.writeAuditLog(auditEvent);
  }

  /**
   * Log security events
   * @param {Object} event - Security event
   */
  async logSecurityEvent(event) {
    const auditEvent = {
      type: 'security',
      timestamp: new Date().toISOString(),
      userId: event.userId,
      action: event.action, // suspicious_activity, rate_limit_exceeded, invalid_token
      severity: event.severity, // low, medium, high, critical
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      metadata: event.metadata || {}
    };

    await this.writeAuditLog(auditEvent);
  }

  /**
   * Log file upload events
   * @param {Object} event - File upload event
   */
  async logFileEvent(event) {
    const auditEvent = {
      type: 'file_operation',
      timestamp: new Date().toISOString(),
      userId: event.userId,
      action: event.action, // upload, download, delete
      fileName: event.fileName,
      fileSize: event.fileSize,
      fileType: event.fileType,
      success: event.success,
      reason: event.reason,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata || {}
    };

    await this.writeAuditLog(auditEvent);
  }

  /**
   * Log API key events
   * @param {Object} event - API key event
   */
  async logApiKeyEvent(event) {
    const auditEvent = {
      type: 'api_key',
      timestamp: new Date().toISOString(),
      userId: event.userId,
      action: event.action, // generate, revoke, rotate, validate
      keyId: event.keyId,
      scope: event.scope,
      success: event.success,
      reason: event.reason,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata || {}
    };

    await this.writeAuditLog(auditEvent);
  }

  /**
   * Log admin actions
   * @param {Object} event - Admin event
   */
  async logAdminEvent(event) {
    const auditEvent = {
      type: 'admin',
      timestamp: new Date().toISOString(),
      adminUserId: event.adminUserId,
      targetUserId: event.targetUserId,
      action: event.action, // user_suspend, user_delete, system_config_change
      changes: event.changes,
      reason: event.reason,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata || {}
    };

    await this.writeAuditLog(auditEvent);
  }

  /**
   * Write audit log entry
   * @param {Object} auditEvent - Audit event to log
   */
  async writeAuditLog(auditEvent) {
    // Add to queue for batch processing
    this.logQueue.push(auditEvent);
    
    // If queue is getting large, process immediately
    if (this.logQueue.length > 100) {
      await this.processLogQueue();
    }
  }

  /**
   * Process log queue
   */
  async processLogQueue() {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const logsToProcess = [...this.logQueue];
      this.logQueue = [];

      // Group logs by date for daily log files
      const logsByDate = {};
      logsToProcess.forEach(log => {
        const date = log.timestamp.split('T')[0];
        if (!logsByDate[date]) {
          logsByDate[date] = [];
        }
        logsByDate[date].push(log);
      });

      // Write logs to files
      for (const [date, logs] of Object.entries(logsByDate)) {
        await this.writeLogsToFile(date, logs);
      }

    } catch (error) {
      console.error('Failed to process audit logs:', error);
      // Re-add failed logs to queue
      this.logQueue.unshift(...logsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Write logs to file
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {Array} logs - Logs to write
   */
  async writeLogsToFile(date, logs) {
    try {
      const fileName = `audit-${date}.log`;
      const filePath = path.join(this.logDir, fileName);

      // Prepare log entries
      const logEntries = logs.map(log => {
        // Encrypt sensitive data
        const sanitizedLog = this.sanitizeLogEntry(log);
        return JSON.stringify(sanitizedLog);
      }).join('\n') + '\n';

      // Check if file needs rotation
      await this.rotateLogFileIfNeeded(filePath);

      // Append to log file
      await fs.appendFile(filePath, logEntries, 'utf8');

    } catch (error) {
      console.error(`Failed to write logs to file for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize log entry for storage
   * @param {Object} log - Log entry
   * @returns {Object} Sanitized log entry
   */
  sanitizeLogEntry(log) {
    const sanitized = { ...log };

    // Remove or hash sensitive information
    if (sanitized.email) {
      sanitized.emailHash = encryptionService.hashSensitiveData(sanitized.email).hash;
      delete sanitized.email;
    }

    if (sanitized.ipAddress) {
      // Hash IP address for privacy
      sanitized.ipAddressHash = encryptionService.hashSensitiveData(sanitized.ipAddress).hash;
      delete sanitized.ipAddress;
    }

    // Truncate user agent to prevent log bloat
    if (sanitized.userAgent && sanitized.userAgent.length > 200) {
      sanitized.userAgent = sanitized.userAgent.substring(0, 200) + '...';
    }

    return sanitized;
  }

  /**
   * Rotate log file if it's too large
   * @param {string} filePath - Path to log file
   */
  async rotateLogFileIfNeeded(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.maxLogSize) {
        // Rotate the file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = filePath.replace('.log', `-${timestamp}.log`);
        
        await fs.rename(filePath, rotatedPath);
        
        // Clean up old log files
        await this.cleanupOldLogFiles();
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to check log file size:', error);
      }
    }
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogFiles() {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          stat: null
        }));

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch (error) {
          console.warn(`Failed to stat log file ${file.name}:`, error);
        }
      }

      // Sort by modification time (newest first)
      const validFiles = logFiles
        .filter(file => file.stat)
        .sort((a, b) => b.stat.mtime - a.stat.mtime);

      // Delete files beyond the limit
      if (validFiles.length > this.maxLogFiles) {
        const filesToDelete = validFiles.slice(this.maxLogFiles);
        
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
            console.log(`Deleted old log file: ${file.name}`);
          } catch (error) {
            console.error(`Failed to delete log file ${file.name}:`, error);
          }
        }
      }

    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  /**
   * Search audit logs
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching log entries
   */
  async searchLogs(criteria) {
    const {
      startDate,
      endDate,
      userId,
      type,
      action,
      limit = 100
    } = criteria;

    try {
      const results = [];
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
        .sort()
        .reverse(); // Start with newest files

      for (const fileName of logFiles) {
        if (results.length >= limit) break;

        const filePath = path.join(this.logDir, fileName);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (results.length >= limit) break;

          try {
            const logEntry = JSON.parse(line);
            
            // Apply filters
            if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) continue;
            if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue;
            if (userId && logEntry.userId !== userId) continue;
            if (type && logEntry.type !== type) continue;
            if (action && logEntry.action !== action) continue;

            results.push(logEntry);
          } catch (parseError) {
            // Skip invalid log entries
            continue;
          }
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to search audit logs:', error);
      throw new Error(`Log search failed: ${error.message}`);
    }
  }

  /**
   * Get audit log statistics
   * @param {Object} criteria - Criteria for statistics
   * @returns {Promise<Object>} Log statistics
   */
  async getLogStatistics(criteria = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date()
    } = criteria;

    try {
      const logs = await this.searchLogs({
        startDate,
        endDate,
        limit: 10000 // High limit for statistics
      });

      const stats = {
        totalEvents: logs.length,
        eventsByType: {},
        eventsByAction: {},
        eventsByUser: {},
        timeRange: {
          start: startDate,
          end: endDate
        }
      };

      logs.forEach(log => {
        // Count by type
        stats.eventsByType[log.type] = (stats.eventsByType[log.type] || 0) + 1;
        
        // Count by action
        stats.eventsByAction[log.action] = (stats.eventsByAction[log.action] || 0) + 1;
        
        // Count by user
        if (log.userId) {
          stats.eventsByUser[log.userId] = (stats.eventsByUser[log.userId] || 0) + 1;
        }
      });

      return stats;

    } catch (error) {
      console.error('Failed to get log statistics:', error);
      throw new Error(`Statistics generation failed: ${error.message}`);
    }
  }

  /**
   * Create audit log middleware for Express
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createAuditMiddleware(options = {}) {
    const {
      logAllRequests = false,
      logSensitiveRoutes = true,
      sensitiveRoutes = ['/api/auth', '/api/user', '/api/admin']
    } = options;

    return (req, res, next) => {
      const startTime = Date.now();
      
      // Determine if this request should be logged
      const shouldLog = logAllRequests || 
        sensitiveRoutes.some(route => req.path.startsWith(route));

      if (shouldLog) {
        // Log request
        const requestEvent = {
          userId: req.user?.id || req.userId,
          action: `${req.method}_${req.path}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.path,
            query: req.query,
            timestamp: new Date().toISOString()
          }
        };

        // Override res.end to capture response
        const originalEnd = res.end;
        res.end = function(...args) {
          const duration = Date.now() - startTime;
          
          // Log response
          this.logDataAccess({
            ...requestEvent,
            success: res.statusCode < 400,
            reason: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
            metadata: {
              ...requestEvent.metadata,
              statusCode: res.statusCode,
              duration
            }
          }).catch(error => {
            console.error('Failed to log request:', error);
          });

          originalEnd.apply(this, args);
        }.bind(this);
      }

      next();
    };
  }
}

// Export singleton instance
module.exports = new AuditLogger();