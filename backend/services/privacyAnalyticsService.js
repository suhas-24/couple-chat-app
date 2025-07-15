const { monitoringService } = require('./monitoringService');
const crypto = require('crypto');

/**
 * Privacy-Compliant Analytics Service
 * Tracks user behavior while respecting privacy and GDPR compliance
 */

class AnalyticsService {
  constructor() {
    this.events = [];
    this.userSessions = new Map();
    this.privacySettings = {
      enableTracking: true,
      enablePersonalization: true,
      enableTargeting: false,
      dataRetentionDays: 30,
      anonymizeAfterDays: 7
    };
    
    this.eventTypes = {
      PAGE_VIEW: 'page_view',
      USER_ACTION: 'user_action',
      PERFORMANCE: 'performance',
      ERROR: 'error',
      CONVERSION: 'conversion'
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  // Track user event with privacy compliance
  trackEvent(eventType, eventData, userId = null, sessionId = null) {
    if (!this.privacySettings.enableTracking) {
      return;
    }

    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      timestamp: new Date().toISOString(),
      sessionId: sessionId || this.generateSessionId(),
      userId: userId ? this.hashUserId(userId) : null, // Hash user ID for privacy
      data: this.sanitizeEventData(eventData),
      metadata: {
        userAgent: this.parseUserAgent(eventData.userAgent),
        location: this.getGeneralLocation(eventData.location),
        referrer: this.sanitizeReferrer(eventData.referrer)
      }
    };

    this.events.push(event);
    this.updateUserSession(event.sessionId, event);

    // Emit event for real-time monitoring
    monitoringService.emit('analytics_event', event);

    // Keep only recent events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }
  }

  // Track page view
  trackPageView(url, userId = null, sessionId = null, additionalData = {}) {
    this.trackEvent(this.eventTypes.PAGE_VIEW, {
      url: this.sanitizeUrl(url),
      title: additionalData.title,
      loadTime: additionalData.loadTime,
      userAgent: additionalData.userAgent,
      referrer: additionalData.referrer,
      location: additionalData.location
    }, userId, sessionId);
  }

  // Track user action
  trackUserAction(action, details, userId = null, sessionId = null) {
    this.trackEvent(this.eventTypes.USER_ACTION, {
      action: action,
      details: this.sanitizeEventData(details),
      timestamp: new Date().toISOString()
    }, userId, sessionId);
  }

  // Track performance metrics
  trackPerformance(metrics, userId = null, sessionId = null) {
    this.trackEvent(this.eventTypes.PERFORMANCE, {
      loadTime: metrics.loadTime,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      firstInputDelay: metrics.firstInputDelay
    }, userId, sessionId);
  }

  // Track conversion events
  trackConversion(conversionType, value, userId = null, sessionId = null) {
    this.trackEvent(this.eventTypes.CONVERSION, {
      type: conversionType,
      value: value,
      timestamp: new Date().toISOString()
    }, userId, sessionId);
  }

  // Generate anonymous session ID
  generateSessionId() {
    return crypto.randomUUID();
  }

  // Hash user ID for privacy
  hashUserId(userId) {
    if (!userId) return null;
    return crypto.createHash('sha256').update(userId.toString()).digest('hex');
  }

  // Sanitize event data to remove sensitive information
  sanitizeEventData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'ssn', 'credit_card', 'email', 'phone'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });

    // Sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeEventData(sanitized[key]);
      }
    });

    return sanitized;
  }

  // Sanitize URL to remove sensitive parameters
  sanitizeUrl(url) {
    if (!url) return url;
    
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['token', 'password', 'key', 'secret', 'auth'];
      
      sensitiveParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch (error) {
      return url; // Return original if parsing fails
    }
  }

  // Parse user agent for basic device information
  parseUserAgent(userAgent) {
    if (!userAgent) return null;
    
    return {
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent),
      device: this.extractDevice(userAgent),
      mobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
    };
  }

  // Extract browser from user agent
  extractBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  // Extract OS from user agent
  extractOS(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  // Extract device type from user agent
  extractDevice(userAgent) {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }

  // Get general location (country/region only for privacy)
  getGeneralLocation(location) {
    if (!location) return null;
    
    return {
      country: location.country || null,
      region: location.region || null,
      timezone: location.timezone || null
      // Exclude city, IP, and precise coordinates for privacy
    };
  }

  // Sanitize referrer information
  sanitizeReferrer(referrer) {
    if (!referrer) return null;
    
    try {
      const url = new URL(referrer);
      return {
        domain: url.hostname,
        path: url.pathname === '/' ? '/' : '/...' // Generalize path for privacy
      };
    } catch (error) {
      return null;
    }
  }

  // Update user session
  updateUserSession(sessionId, event) {
    if (!this.userSessions.has(sessionId)) {
      this.userSessions.set(sessionId, {
        id: sessionId,
        startTime: event.timestamp,
        lastActivity: event.timestamp,
        events: [],
        pageViews: 0,
        actions: 0,
        conversions: 0
      });
    }

    const session = this.userSessions.get(sessionId);
    session.lastActivity = event.timestamp;
    session.events.push(event.id);

    // Update counters
    switch (event.type) {
      case this.eventTypes.PAGE_VIEW:
        session.pageViews++;
        break;
      case this.eventTypes.USER_ACTION:
        session.actions++;
        break;
      case this.eventTypes.CONVERSION:
        session.conversions++;
        break;
    }

    // Keep only last 100 events per session
    if (session.events.length > 100) {
      session.events = session.events.slice(-100);
    }
  }

  // Get analytics summary
  getAnalyticsSummary(timeRange = '24h') {
    const now = new Date();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startTime = new Date(now.getTime() - timeRangeMs);

    const filteredEvents = this.events.filter(event => 
      new Date(event.timestamp) >= startTime
    );

    const summary = {
      totalEvents: filteredEvents.length,
      uniqueSessions: new Set(filteredEvents.map(e => e.sessionId)).size,
      eventTypes: this.groupEventsByType(filteredEvents),
      topPages: this.getTopPages(filteredEvents),
      userAgents: this.getUserAgentStats(filteredEvents),
      performanceMetrics: this.getPerformanceMetrics(filteredEvents),
      conversions: this.getConversionMetrics(filteredEvents),
      timeRange: timeRange,
      generatedAt: new Date().toISOString()
    };

    return summary;
  }

  // Group events by type
  groupEventsByType(events) {
    const grouped = {};
    events.forEach(event => {
      grouped[event.type] = (grouped[event.type] || 0) + 1;
    });
    return grouped;
  }

  // Get top pages
  getTopPages(events) {
    const pageViews = events.filter(e => e.type === this.eventTypes.PAGE_VIEW);
    const pageCounts = {};
    
    pageViews.forEach(event => {
      const url = event.data.url;
      pageCounts[url] = (pageCounts[url] || 0) + 1;
    });

    return Object.entries(pageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([url, count]) => ({ url, count }));
  }

  // Get user agent statistics
  getUserAgentStats(events) {
    const userAgents = events
      .filter(e => e.metadata.userAgent)
      .map(e => e.metadata.userAgent);

    const browsers = {};
    const os = {};
    const devices = {};

    userAgents.forEach(ua => {
      browsers[ua.browser] = (browsers[ua.browser] || 0) + 1;
      os[ua.os] = (os[ua.os] || 0) + 1;
      devices[ua.device] = (devices[ua.device] || 0) + 1;
    });

    return { browsers, os, devices };
  }

  // Get performance metrics
  getPerformanceMetrics(events) {
    const perfEvents = events.filter(e => e.type === this.eventTypes.PERFORMANCE);
    
    if (perfEvents.length === 0) {
      return null;
    }

    const metrics = {
      loadTime: [],
      firstContentfulPaint: [],
      largestContentfulPaint: [],
      cumulativeLayoutShift: [],
      firstInputDelay: []
    };

    perfEvents.forEach(event => {
      Object.keys(metrics).forEach(metric => {
        if (event.data[metric] !== undefined) {
          metrics[metric].push(event.data[metric]);
        }
      });
    });

    const summary = {};
    Object.keys(metrics).forEach(metric => {
      const values = metrics[metric];
      if (values.length > 0) {
        summary[metric] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          median: this.calculateMedian(values)
        };
      }
    });

    return summary;
  }

  // Get conversion metrics
  getConversionMetrics(events) {
    const conversionEvents = events.filter(e => e.type === this.eventTypes.CONVERSION);
    
    const conversions = {};
    conversionEvents.forEach(event => {
      const type = event.data.type;
      if (!conversions[type]) {
        conversions[type] = { count: 0, totalValue: 0 };
      }
      conversions[type].count++;
      conversions[type].totalValue += event.data.value || 0;
    });

    return conversions;
  }

  // Calculate median
  calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  }

  // Parse time range string
  parseTimeRange(timeRange) {
    const units = {
      'h': 3600000,
      'd': 86400000,
      'w': 604800000
    };
    
    const match = timeRange.match(/^(\d+)([hdw])$/);
    if (!match) return 86400000; // Default to 24h
    
    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Run every hour
  }

  // Clean up old data based on retention policy
  cleanupOldData() {
    const now = new Date();
    const retentionMs = this.privacySettings.dataRetentionDays * 86400000;
    const cutoffTime = new Date(now.getTime() - retentionMs);

    // Remove old events
    this.events = this.events.filter(event => 
      new Date(event.timestamp) > cutoffTime
    );

    // Remove old sessions
    for (const [sessionId, session] of this.userSessions) {
      if (new Date(session.lastActivity) < cutoffTime) {
        this.userSessions.delete(sessionId);
      }
    }

    // Anonymize old data
    const anonymizeTime = new Date(now.getTime() - (this.privacySettings.anonymizeAfterDays * 86400000));
    this.events.forEach(event => {
      if (new Date(event.timestamp) < anonymizeTime) {
        event.userId = null;
        event.sessionId = this.hashUserId(event.sessionId);
      }
    });
  }

  // Update privacy settings
  updatePrivacySettings(settings) {
    this.privacySettings = { ...this.privacySettings, ...settings };
    
    // If tracking is disabled, stop collecting new data
    if (!this.privacySettings.enableTracking) {
      this.events = [];
      this.userSessions.clear();
    }
  }

  // Export user data (GDPR compliance)
  exportUserData(userId) {
    const hashedUserId = this.hashUserId(userId);
    
    const userEvents = this.events.filter(event => 
      event.userId === hashedUserId
    );

    const userSessions = Array.from(this.userSessions.values()).filter(session =>
      userEvents.some(event => event.sessionId === session.id)
    );

    return {
      userId: hashedUserId,
      events: userEvents,
      sessions: userSessions,
      exportedAt: new Date().toISOString()
    };
  }

  // Delete user data (GDPR compliance)
  deleteUserData(userId) {
    const hashedUserId = this.hashUserId(userId);
    
    // Remove user events
    this.events = this.events.filter(event => 
      event.userId !== hashedUserId
    );

    // Remove user sessions
    for (const [sessionId, session] of this.userSessions) {
      const hasUserEvents = this.events.some(event => 
        event.sessionId === sessionId
      );
      if (!hasUserEvents) {
        this.userSessions.delete(sessionId);
      }
    }

    return {
      deleted: true,
      userId: hashedUserId,
      deletedAt: new Date().toISOString()
    };
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

// Middleware to track requests
const analyticsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    analyticsService.trackPageView(req.url, req.user?.id, req.sessionID, {
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referrer'),
      loadTime: responseTime
    });
  });
  
  next();
};

module.exports = {
  analyticsService,
  analyticsMiddleware
};