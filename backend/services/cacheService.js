/**
 * Cache Service
 * Handles caching for analytics and other frequently accessed data
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.defaultTTL = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.cleanupInterval = null;
    
    // Clean up expired entries every 5 minutes (only in production)
    if (process.env.NODE_ENV !== 'test') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt
    });
    
    this.ttlMap.set(key, expiresAt);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Check if a key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }

  /**
   * Get or set a value with a function
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<any>} Cached or computed value
   */
  async getOrSet(key, fn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await fn();
    this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Generate cache key for analytics
   * @param {string} chatId - Chat ID
   * @param {Object} options - Analytics options
   * @returns {string} Cache key
   */
  generateAnalyticsKey(chatId, options = {}) {
    const {
      startDate = '',
      endDate = '',
      includeWordAnalysis = true,
      includeActivityPatterns = true,
      includeMilestones = true
    } = options;
    
    return `analytics:${chatId}:${startDate}:${endDate}:${includeWordAnalysis}:${includeActivityPatterns}:${includeMilestones}`;
  }

  /**
   * Generate cache key for word frequency
   * @param {string} chatId - Chat ID
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generateWordFrequencyKey(chatId, options = {}) {
    const { startDate = '', endDate = '', limit = 50 } = options;
    return `wordfreq:${chatId}:${startDate}:${endDate}:${limit}`;
  }

  /**
   * Generate cache key for activity patterns
   * @param {string} chatId - Chat ID
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generateActivityKey(chatId, options = {}) {
    const { startDate = '', endDate = '', type = 'all' } = options;
    return `activity:${chatId}:${startDate}:${endDate}:${type}`;
  }

  /**
   * Generate cache key for milestones
   * @param {string} chatId - Chat ID
   * @returns {string} Cache key
   */
  generateMilestonesKey(chatId) {
    return `milestones:${chatId}`;
  }

  /**
   * Invalidate analytics cache for a chat
   * @param {string} chatId - Chat ID
   */
  invalidateAnalyticsCache(chatId) {
    const keysToDelete = [];
    
    // Find all keys related to this chat
    for (const key of this.cache.keys()) {
      if (key.includes(chatId)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete all related keys
    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, expiresAt] of this.ttlMap.entries()) {
      if (now > expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;
    
    for (const [key, expiresAt] of this.ttlMap.entries()) {
      if (now > expiresAt) {
        expiredCount++;
      } else {
        validCount++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON string size of value
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64; // Overhead for timestamps and structure
    }
    
    return totalSize;
  }

  /**
   * Set cache size limit and implement LRU eviction
   * @param {number} maxEntries - Maximum number of entries
   */
  setMaxSize(maxEntries) {
    this.maxEntries = maxEntries;
    
    if (this.cache.size > maxEntries) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entries
   */
  evictLRU() {
    if (!this.maxEntries || this.cache.size <= this.maxEntries) {
      return;
    }
    
    // Convert to array and sort by creation time
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.createdAt - b.createdAt);
    
    // Remove oldest entries
    const toRemove = this.cache.size - this.maxEntries;
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.delete(key);
    }
  }

  /**
   * Destroy the cache service and clean up intervals
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

module.exports = new CacheService();