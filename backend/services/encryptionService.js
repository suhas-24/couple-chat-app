const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class EncryptionService {
  constructor() {
    // Validate encryption key on initialization
    this.validateEncryptionKey();
    
    // Encryption configuration
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 12; // 96 bits for GCM
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Get encryption key from environment
    this.encryptionKey = this.deriveKey(process.env.ENCRYPTION_KEY);
  }

  /**
   * Validate that encryption key is properly configured
   */
  validateEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key || key === 'default-key-please-change') {
      throw new Error('ENCRYPTION_KEY environment variable must be set to a secure random value');
    }
    
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
  }

  /**
   * Derive encryption key from environment variable
   * @param {string} key - Base key from environment
   * @returns {Buffer} Derived key
   */
  deriveKey(key) {
    // Use PBKDF2 to derive a consistent key from the environment variable
    const salt = crypto.createHash('sha256').update('couple-chat-salt').digest();
    return crypto.pbkdf2Sync(key, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt text using AES-256-GCM
   * @param {string} text - Text to encrypt
   * @returns {string} Encrypted text with IV and auth tag
   */
  encrypt(text) {
    if (!text || typeof text !== 'string') return text;
    
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher with GCM mode
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag (GCM provides this)
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      
      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt text using AES-256-GCM
   * @param {string} encryptedText - Encrypted text with IV and auth tag
   * @returns {string} Decrypted text
   */
  decrypt(encryptedText) {
    if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
    
    try {
      // Split the encrypted data
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Create decipher with GCM mode
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the text
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data using SHA-256 with salt
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt (generates random if not provided)
   * @returns {Object} Hash and salt
   */
  hashSensitiveData(data, salt = null) {
    if (!data) return null;
    
    try {
      const actualSalt = salt || crypto.randomBytes(this.saltLength).toString('hex');
      const hash = crypto.createHash('sha256').update(data + actualSalt).digest('hex');
      
      return {
        hash,
        salt: actualSalt
      };
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Verify hashed data
   * @param {string} data - Original data
   * @param {string} hash - Hash to verify against
   * @param {string} salt - Salt used for hashing
   * @returns {boolean} Whether data matches hash
   */
  verifyHash(data, hash, salt) {
    try {
      const computed = this.hashSensitiveData(data, salt);
      return computed.hash === hash;
    } catch (error) {
      console.error('Hash verification error:', error);
      return false;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Password to hash
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    if (!password) throw new Error('Password is required');
    
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Whether password matches
   */
  async verifyPassword(password, hash) {
    if (!password || !hash) return false;
    
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key with specific format
   * @returns {string} API key
   */
  generateApiKey() {
    const prefix = 'cc_'; // couple-chat prefix
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}${timestamp}_${random}`;
  }

  /**
   * Encrypt file content
   * @param {Buffer} fileBuffer - File content as buffer
   * @returns {Buffer} Encrypted file content
   */
  encryptFile(fileBuffer) {
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new Error('File content must be a Buffer');
    }
    
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error) {
      console.error('File encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file content
   * @param {Buffer} encryptedBuffer - Encrypted file content
   * @returns {Buffer} Decrypted file content
   */
  decryptFile(encryptedBuffer) {
    if (!Buffer.isBuffer(encryptedBuffer)) {
      throw new Error('Encrypted content must be a Buffer');
    }
    
    try {
      const iv = encryptedBuffer.slice(0, this.ivLength);
      const authTag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted;
    } catch (error) {
      console.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Create HMAC signature for API requests
   * @param {string} data - Data to sign
   * @param {string} secret - Secret key
   * @returns {string} HMAC signature
   */
  createHmacSignature(data, secret = null) {
    const key = secret || this.encryptionKey;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   * @param {string} data - Original data
   * @param {string} signature - Signature to verify
   * @param {string} secret - Secret key
   * @returns {boolean} Whether signature is valid
   */
  verifyHmacSignature(data, signature, secret = null) {
    try {
      const expectedSignature = this.createHmacSignature(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('HMAC verification error:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EncryptionService();