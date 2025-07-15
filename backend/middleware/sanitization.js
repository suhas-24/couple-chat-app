const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');
const xss = require('xss');

/**
 * Comprehensive input sanitization middleware
 * Protects against XSS, SQL injection, and other malicious inputs
 */
class SanitizationMiddleware {
  constructor() {
    // XSS filter configuration
    this.xssOptions = {
      whiteList: {
        // Allow basic formatting for chat messages
        b: [],
        i: [],
        em: [],
        strong: [],
        br: [],
        p: [],
        span: ['style'],
        div: ['style']
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
      allowCommentTag: false,
      css: {
        whiteList: {
          'color': true,
          'font-weight': true,
          'font-style': true,
          'text-decoration': true
        }
      }
    };

    // Fields that should be completely stripped of HTML
    this.strictFields = [
      'email',
      'password',
      'name',
      'username',
      'phone',
      'location',
      'bio'
    ];

    // Fields that allow limited HTML (like chat messages)
    this.htmlFields = [
      'text',
      'content',
      'message',
      'description'
    ];

    // Fields that should be treated as plain text
    this.textFields = [
      'question',
      'query',
      'search',
      'title',
      'chatName'
    ];
  }

  /**
   * Main sanitization middleware
   */
  sanitizeInput() {
    return (req, res, next) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query);
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
          req.params = this.sanitizeObject(req.params);
        }

        next();
      } catch (error) {
        console.error('Sanitization error:', error);
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          code: 'SANITIZATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Sanitize an object recursively
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        sanitized[key] = value;
        continue;
      }

      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this.sanitizeObject(item) : this.sanitizeValue(key, item)
        );
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = this.sanitizeValue(key, value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize a single value based on field type
   * @param {string} key - Field name
   * @param {*} value - Value to sanitize
   * @returns {*} Sanitized value
   */
  sanitizeValue(key, value) {
    if (typeof value !== 'string') {
      return value;
    }

    // Normalize whitespace
    value = value.trim();

    // Check for empty strings
    if (value === '') {
      return value;
    }

    // Apply different sanitization based on field type
    if (this.strictFields.includes(key)) {
      return this.sanitizeStrictField(value);
    } else if (this.htmlFields.includes(key)) {
      return this.sanitizeHtmlField(value);
    } else if (this.textFields.includes(key)) {
      return this.sanitizeTextField(value);
    } else {
      // Default sanitization for unknown fields
      return this.sanitizeTextField(value);
    }
  }

  /**
   * Strict sanitization - removes all HTML and special characters
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value
   */
  sanitizeStrictField(value) {
    // Remove all HTML tags
    value = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    
    // Escape special characters
    value = validator.escape(value);
    
    // Remove potential SQL injection patterns
    value = this.removeSqlInjectionPatterns(value);
    
    // Remove script-like patterns
    value = this.removeScriptPatterns(value);
    
    return value;
  }

  /**
   * HTML field sanitization - allows limited safe HTML
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value
   */
  sanitizeHtmlField(value) {
    // Use XSS filter with limited whitelist
    value = xss(value, this.xssOptions);
    
    // Additional cleanup for potential bypasses
    value = this.removeScriptPatterns(value);
    value = this.removeSqlInjectionPatterns(value);
    
    return value;
  }

  /**
   * Text field sanitization - treats as plain text
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value
   */
  sanitizeTextField(value) {
    // Remove HTML tags but don't escape (for readability)
    value = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    
    // Remove script patterns
    value = this.removeScriptPatterns(value);
    
    // Remove SQL injection patterns
    value = this.removeSqlInjectionPatterns(value);
    
    return value;
  }

  /**
   * Remove potential SQL injection patterns
   * @param {string} value - Value to clean
   * @returns {string} Cleaned value
   */
  removeSqlInjectionPatterns(value) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\bxp_\w+)/gi,
      /(\bsp_\w+)/gi
    ];

    sqlPatterns.forEach(pattern => {
      value = value.replace(pattern, '');
    });

    return value;
  }

  /**
   * Remove script-like patterns that could bypass XSS filters
   * @param {string} value - Value to clean
   * @returns {string} Cleaned value
   */
  removeScriptPatterns(value) {
    const scriptPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /data:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick=
      /expression\s*\(/gi,
      /url\s*\(/gi,
      /import\s*\(/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /Function\s*\(/gi,
      /alert\s*\(/gi,
      /confirm\s*\(/gi,
      /prompt\s*\(/gi
    ];

    scriptPatterns.forEach(pattern => {
      value = value.replace(pattern, '');
    });

    return value;
  }

  /**
   * Validate and sanitize email addresses
   * @param {string} email - Email to validate
   * @returns {string|null} Sanitized email or null if invalid
   */
  sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return null;
    }

    email = email.trim().toLowerCase();

    if (!validator.isEmail(email)) {
      return null;
    }

    return validator.normalizeEmail(email, {
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    });
  }

  /**
   * Sanitize URL inputs
   * @param {string} url - URL to sanitize
   * @returns {string|null} Sanitized URL or null if invalid
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    url = url.trim();

    // Check if it's a valid URL
    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true,
      allow_underscores: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    })) {
      return null;
    }

    return url;
  }

  /**
   * Sanitize file names
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return 'untitled';
    }

    // Remove path traversal attempts
    filename = filename.replace(/\.\./g, '');
    filename = filename.replace(/[\/\\]/g, '');

    // Remove special characters except dots, hyphens, and underscores
    filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');

    // Limit length
    if (filename.length > 255) {
      const ext = filename.substring(filename.lastIndexOf('.'));
      const name = filename.substring(0, filename.lastIndexOf('.'));
      filename = name.substring(0, 255 - ext.length) + ext;
    }

    return filename || 'untitled';
  }

  /**
   * Sanitize MongoDB ObjectId
   * @param {string} id - ID to sanitize
   * @returns {string|null} Sanitized ID or null if invalid
   */
  sanitizeObjectId(id) {
    if (!id || typeof id !== 'string') {
      return null;
    }

    id = id.trim();

    if (!validator.isMongoId(id)) {
      return null;
    }

    return id;
  }

  /**
   * Rate limiting for sensitive operations
   * @param {string} operation - Operation type
   * @param {number} maxAttempts - Maximum attempts
   * @param {number} windowMs - Time window in milliseconds
   */
  createRateLimiter(operation, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const attempts = new Map();

    return (req, res, next) => {
      const key = `${operation}:${req.ip}:${req.user?.id || 'anonymous'}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old attempts
      const userAttempts = attempts.get(key) || [];
      const recentAttempts = userAttempts.filter(time => time > windowStart);

      if (recentAttempts.length >= maxAttempts) {
        return res.status(429).json({
          success: false,
          error: 'Too many attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000),
          timestamp: new Date().toISOString()
        });
      }

      // Record this attempt
      recentAttempts.push(now);
      attempts.set(key, recentAttempts);

      next();
    };
  }

  /**
   * Content Security Policy headers
   */
  setSecurityHeaders() {
    return (req, res, next) => {
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://apis.google.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.gemini.google.com; " +
        "frame-src 'none'; " +
        "object-src 'none'; " +
        "base-uri 'self';"
      );

      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      next();
    };
  }
}

// Export singleton instance
module.exports = new SanitizationMiddleware();