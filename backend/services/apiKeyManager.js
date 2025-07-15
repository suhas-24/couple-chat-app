const crypto = require('crypto');
const encryptionService = require('./encryptionService');

/**
 * Secure API Key Management Service
 * Handles creation, validation, and rotation of API keys
 */
class ApiKeyManager {
  constructor() {
    this.keyPrefix = 'cc_'; // couple-chat prefix
    this.keyLength = 32;
    this.secretLength = 64;
    
    // In-memory store for active keys (in production, use Redis or database)
    this.activeKeys = new Map();
    this.revokedKeys = new Set();
    
    // Rate limiting for API key operations
    this.keyOperationLimits = new Map();
    
    this.initializeSystemKeys();
  }

  /**
   * Initialize system-level API keys from environment
   */
  initializeSystemKeys() {
    // Validate required environment variables
    const requiredKeys = [
      'GEMINI_API_KEY',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    const missingKeys = requiredKeys.filter(key => !process.env[key]);
    
    if (missingKeys.length > 0) {
      console.warn(`Warning: Missing required environment variables: ${missingKeys.join(', ')}`);
    }

    // Validate Gemini API key format
    if (process.env.GEMINI_API_KEY && !this.isValidGeminiApiKey(process.env.GEMINI_API_KEY)) {
      console.warn('Warning: GEMINI_API_KEY appears to be invalid');
    }

    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.warn('Warning: JWT_SECRET should be at least 32 characters long');
    }
  }

  /**
   * Generate a new API key
   * @param {Object} options - Key generation options
   * @returns {Object} Generated API key information
   */
  generateApiKey(options = {}) {
    const {
      userId = null,
      scope = 'general',
      expiresIn = null, // null means no expiration
      description = '',
      permissions = []
    } = options;

    try {
      // Generate unique key ID
      const keyId = this.generateKeyId();
      
      // Generate secret
      const secret = this.generateSecret();
      
      // Create key metadata
      const keyData = {
        keyId,
        secret: encryptionService.hashSensitiveData(secret).hash,
        salt: encryptionService.hashSensitiveData(secret).salt,
        userId,
        scope,
        description,
        permissions,
        createdAt: new Date(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : null,
        lastUsed: null,
        usageCount: 0,
        isActive: true
      };

      // Store in active keys
      this.activeKeys.set(keyId, keyData);

      // Return public key (without secret hash)
      return {
        apiKey: `${this.keyPrefix}${keyId}`,
        secret: secret, // Only returned once during generation
        keyId,
        scope,
        permissions,
        expiresAt: keyData.expiresAt,
        createdAt: keyData.createdAt
      };
    } catch (error) {
      console.error('API key generation error:', error);
      throw new Error('Failed to generate API key');
    }
  }

  /**
   * Validate an API key
   * @param {string} apiKey - API key to validate
   * @param {string} secret - API secret
   * @param {Object} options - Validation options
   * @returns {Object|null} Key data if valid, null if invalid
   */
  validateApiKey(apiKey, secret, options = {}) {
    const { requiredScope = null, requiredPermissions = [] } = options;

    try {
      // Extract key ID from API key
      if (!apiKey.startsWith(this.keyPrefix)) {
        return null;
      }

      const keyId = apiKey.substring(this.keyPrefix.length);
      const keyData = this.activeKeys.get(keyId);

      if (!keyData || !keyData.isActive) {
        return null;
      }

      // Check if key is revoked
      if (this.revokedKeys.has(keyId)) {
        return null;
      }

      // Check expiration
      if (keyData.expiresAt && keyData.expiresAt < new Date()) {
        this.revokeApiKey(keyId);
        return null;
      }

      // Verify secret
      if (!encryptionService.verifyHash(secret, keyData.secret, keyData.salt)) {
        return null;
      }

      // Check scope
      if (requiredScope && keyData.scope !== requiredScope) {
        return null;
      }

      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(
          permission => keyData.permissions.includes(permission)
        );
        if (!hasAllPermissions) {
          return null;
        }
      }

      // Update usage statistics
      keyData.lastUsed = new Date();
      keyData.usageCount++;

      return {
        keyId: keyData.keyId,
        userId: keyData.userId,
        scope: keyData.scope,
        permissions: keyData.permissions,
        createdAt: keyData.createdAt,
        lastUsed: keyData.lastUsed,
        usageCount: keyData.usageCount
      };
    } catch (error) {
      console.error('API key validation error:', error);
      return null;
    }
  }

  /**
   * Revoke an API key
   * @param {string} keyId - Key ID to revoke
   * @returns {boolean} Success status
   */
  revokeApiKey(keyId) {
    try {
      const keyData = this.activeKeys.get(keyId);
      
      if (keyData) {
        keyData.isActive = false;
        keyData.revokedAt = new Date();
        this.revokedKeys.add(keyId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('API key revocation error:', error);
      return false;
    }
  }

  /**
   * Rotate an API key (generate new secret)
   * @param {string} keyId - Key ID to rotate
   * @returns {Object|null} New secret if successful
   */
  rotateApiKey(keyId) {
    try {
      const keyData = this.activeKeys.get(keyId);
      
      if (!keyData || !keyData.isActive) {
        return null;
      }

      // Generate new secret
      const newSecret = this.generateSecret();
      const hashData = encryptionService.hashSensitiveData(newSecret);
      
      // Update key data
      keyData.secret = hashData.hash;
      keyData.salt = hashData.salt;
      keyData.rotatedAt = new Date();

      return {
        secret: newSecret,
        rotatedAt: keyData.rotatedAt
      };
    } catch (error) {
      console.error('API key rotation error:', error);
      return null;
    }
  }

  /**
   * List API keys for a user
   * @param {string} userId - User ID
   * @returns {Array} List of API keys (without secrets)
   */
  listUserApiKeys(userId) {
    const userKeys = [];
    
    for (const [keyId, keyData] of this.activeKeys.entries()) {
      if (keyData.userId === userId && keyData.isActive) {
        userKeys.push({
          keyId,
          apiKey: `${this.keyPrefix}${keyId}`,
          scope: keyData.scope,
          description: keyData.description,
          permissions: keyData.permissions,
          createdAt: keyData.createdAt,
          expiresAt: keyData.expiresAt,
          lastUsed: keyData.lastUsed,
          usageCount: keyData.usageCount
        });
      }
    }
    
    return userKeys;
  }

  /**
   * Generate unique key ID
   * @returns {string} Key ID
   */
  generateKeyId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(this.keyLength / 2).toString('hex');
    return `${timestamp}_${random}`;
  }

  /**
   * Generate secure secret
   * @returns {string} Secret
   */
  generateSecret() {
    return crypto.randomBytes(this.secretLength).toString('hex');
  }

  /**
   * Validate Gemini API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} Whether key format is valid
   */
  isValidGeminiApiKey(apiKey) {
    // Basic format validation for Google API keys
    return typeof apiKey === 'string' && 
           apiKey.length >= 30 && 
           /^[A-Za-z0-9_-]+$/.test(apiKey);
  }

  /**
   * Create middleware for API key authentication
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createAuthMiddleware(options = {}) {
    const {
      requiredScope = null,
      requiredPermissions = [],
      optional = false
    } = options;

    return (req, res, next) => {
      try {
        // Extract API key from headers
        const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
        
        if (!authHeader) {
          if (optional) {
            return next();
          }
          return res.status(401).json({
            success: false,
            error: 'API key required',
            code: 'MISSING_API_KEY',
            timestamp: new Date().toISOString()
          });
        }

        let apiKey, secret;
        
        // Handle different auth header formats
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const parts = token.split(':');
          if (parts.length === 2) {
            [apiKey, secret] = parts;
          } else {
            apiKey = token;
            secret = req.headers['x-api-secret'];
          }
        } else {
          apiKey = authHeader;
          secret = req.headers['x-api-secret'];
        }

        if (!secret) {
          return res.status(401).json({
            success: false,
            error: 'API secret required',
            code: 'MISSING_API_SECRET',
            timestamp: new Date().toISOString()
          });
        }

        // Validate API key
        const keyData = this.validateApiKey(apiKey, secret, {
          requiredScope,
          requiredPermissions
        });

        if (!keyData) {
          return res.status(401).json({
            success: false,
            error: 'Invalid API key or secret',
            code: 'INVALID_API_KEY',
            timestamp: new Date().toISOString()
          });
        }

        // Add key data to request
        req.apiKey = keyData;
        
        next();
      } catch (error) {
        console.error('API key middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Authentication error',
          code: 'AUTH_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys() {
    const now = new Date();
    const expiredKeys = [];

    for (const [keyId, keyData] of this.activeKeys.entries()) {
      if (keyData.expiresAt && keyData.expiresAt < now) {
        expiredKeys.push(keyId);
      }
    }

    expiredKeys.forEach(keyId => {
      this.revokeApiKey(keyId);
    });

    return expiredKeys.length;
  }

  /**
   * Get API key usage statistics
   * @param {string} keyId - Key ID
   * @returns {Object|null} Usage statistics
   */
  getKeyUsageStats(keyId) {
    const keyData = this.activeKeys.get(keyId);
    
    if (!keyData) {
      return null;
    }

    return {
      keyId,
      usageCount: keyData.usageCount,
      lastUsed: keyData.lastUsed,
      createdAt: keyData.createdAt,
      isActive: keyData.isActive,
      scope: keyData.scope
    };
  }
}

// Export singleton instance
module.exports = new ApiKeyManager();