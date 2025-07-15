const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');
const encryptionService = require('../services/encryptionService');

// Promisify fs functions
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

class SecureUploadMiddleware {
  constructor() {
    this.allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'text/plain'
    ];
    
    this.allowedExtensions = ['.csv'];
    
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.maxFiles = 1;
    
    // Create uploads directory if it doesn't exist
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDirectory() {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  /**
   * Generate secure filename
   * @param {Object} file - Multer file object
   * @returns {string} Secure filename
   */
  generateSecureFilename(file) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '') // Remove special characters
      .substring(0, 50); // Limit length
    
    return `${timestamp}-${randomBytes}-${baseName}${ext}`;
  }

  /**
   * Validate file type and content
   * @param {Object} file - Multer file object
   * @returns {boolean} Whether file is valid
   */
  validateFile(file) {
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Only ${this.allowedExtensions.join(', ')} are allowed.`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid MIME type: ${file.mimetype}. Only ${this.allowedMimeTypes.join(', ')} are allowed.`);
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`);
    }

    return true;
  }

  /**
   * Basic virus scanning (file signature check)
   * @param {string} filePath - Path to uploaded file
   * @returns {Promise<boolean>} Whether file passes virus scan
   */
  async performBasicVirusScan(filePath) {
    try {
      // Read first 1024 bytes to check for suspicious patterns
      const buffer = fs.readFileSync(filePath, { start: 0, end: 1023 });
      
      // Check for common malicious file signatures
      const suspiciousPatterns = [
        Buffer.from('MZ'), // PE executable
        Buffer.from('PK'), // ZIP archive (could contain malicious files)
        Buffer.from('\x7fELF'), // ELF executable
        Buffer.from('\xca\xfe\xba\xbe'), // Java class file
        Buffer.from('<?php'), // PHP script
        Buffer.from('<script'), // JavaScript
        Buffer.from('javascript:'), // JavaScript URL
        Buffer.from('vbscript:'), // VBScript URL
      ];

      for (const pattern of suspiciousPatterns) {
        if (buffer.indexOf(pattern) !== -1) {
          throw new Error('File contains suspicious content and may be malicious');
        }
      }

      // Check for excessive null bytes (could indicate binary content)
      const nullBytes = buffer.filter(byte => byte === 0).length;
      if (nullBytes > buffer.length * 0.1) {
        throw new Error('File contains excessive null bytes and may not be a valid CSV file');
      }

      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File not found for virus scanning');
      }
      throw error;
    }
  }

  /**
   * Encrypt uploaded file at rest
   * @param {string} filePath - Path to file to encrypt
   * @returns {Promise<string>} Path to encrypted file
   */
  async encryptFileAtRest(filePath) {
    try {
      // Read the original file
      const fileBuffer = fs.readFileSync(filePath);
      
      // Encrypt the file content
      const encryptedBuffer = encryptionService.encryptFile(fileBuffer);
      
      // Write encrypted content to new file
      const encryptedFilePath = filePath + '.enc';
      fs.writeFileSync(encryptedFilePath, encryptedBuffer);
      
      // Remove original unencrypted file
      await this.cleanupFile(filePath);
      
      return encryptedFilePath;
    } catch (error) {
      console.error('File encryption error:', error);
      throw new Error('Failed to encrypt uploaded file');
    }
  }

  /**
   * Decrypt file for processing
   * @param {string} encryptedFilePath - Path to encrypted file
   * @returns {Promise<Buffer>} Decrypted file content
   */
  async decryptFileForProcessing(encryptedFilePath) {
    try {
      // Read encrypted file
      const encryptedBuffer = fs.readFileSync(encryptedFilePath);
      
      // Decrypt the content
      const decryptedBuffer = encryptionService.decryptFile(encryptedBuffer);
      
      return decryptedBuffer;
    } catch (error) {
      console.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Clean up uploaded file
   * @param {string} filePath - Path to file to clean up
   */
  async cleanupFile(filePath) {
    try {
      await access(filePath);
      await unlink(filePath);
    } catch (error) {
      // File doesn't exist or already deleted, ignore
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Create multer configuration for secure uploads
   * @param {Object} options - Configuration options
   * @returns {Object} Multer middleware
   */
  createUploadMiddleware(options = {}) {
    const {
      maxFileSize = this.maxFileSize,
      maxFiles = this.maxFiles,
      allowedExtensions = this.allowedExtensions,
      allowedMimeTypes = this.allowedMimeTypes,
      virusScan = true
    } = options;

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        try {
          const secureFilename = this.generateSecureFilename(file);
          cb(null, secureFilename);
        } catch (error) {
          cb(error);
        }
      }
    });

    const fileFilter = async (req, file, cb) => {
      try {
        // Validate file type and size
        this.validateFile(file);
        cb(null, true);
      } catch (error) {
        cb(error, false);
      }
    };

    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxFileSize,
        files: maxFiles,
        fieldSize: 1024 * 1024, // 1MB field size limit
        fields: 10 // Maximum number of non-file fields
      }
    });

    // Return middleware with post-upload processing
    return (req, res, next) => {
      upload.single('file')(req, res, async (err) => {
        if (err) {
          // Clean up any uploaded file on error
          if (req.file) {
            await this.cleanupFile(req.file.path);
          }
          
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                error: 'File too large',
                details: `Maximum file size is ${this.formatFileSize(maxFileSize)}`
              });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return res.status(400).json({
                error: 'Too many files',
                details: `Maximum ${maxFiles} file(s) allowed`
              });
            }
            return res.status(400).json({
              error: 'Upload error',
              details: err.message
            });
          }
          
          return res.status(400).json({
            error: 'File validation failed',
            details: err.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: 'No file uploaded'
          });
        }

        try {
          // Perform virus scan if enabled
          if (virusScan) {
            await this.performBasicVirusScan(req.file.path);
          }

          // Encrypt file at rest for security
          const encryptedFilePath = await this.encryptFileAtRest(req.file.path);
          
          // Update file path to encrypted version
          req.file.encryptedPath = encryptedFilePath;
          req.file.originalPath = req.file.path;
          req.file.path = encryptedFilePath;

          // Add cleanup function to request for later use
          req.cleanupUploadedFile = () => this.cleanupFile(req.file.path);
          
          // Add decryption function for processing
          req.decryptUploadedFile = () => this.decryptFileForProcessing(req.file.path);
          
          next();
        } catch (error) {
          // Clean up file on virus scan failure
          await this.cleanupFile(req.file.path);
          
          return res.status(400).json({
            error: 'File security check failed',
            details: error.message
          });
        }
      });
    };
  }

  /**
   * Middleware for handling upload errors and cleanup
   */
  errorHandler() {
    return (error, req, res, next) => {
      // Clean up uploaded file on any error
      if (req.file) {
        this.cleanupFile(req.file.path).catch(console.error);
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          details: `Maximum file size is ${this.formatFileSize(this.maxFileSize)}`
        });
      }

      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Too many files',
          details: `Maximum ${this.maxFiles} file(s) allowed`
        });
      }

      res.status(500).json({
        error: 'Upload processing failed',
        details: error.message
      });
    };
  }
}

// Export singleton instance
module.exports = new SecureUploadMiddleware();