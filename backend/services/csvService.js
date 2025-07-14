  const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const iconv = require('iconv-lite');

class CSVService {
  constructor() {
    // Supported CSV formats for different chat platforms
    this.supportedFormats = {
      whatsapp: {
        name: 'WhatsApp Export',
        requiredColumns: ['date', 'time', 'sender', 'message'],
        dateFormats: ['DD/MM/YY, HH:mm', 'MM/DD/YY, HH:mm', 'YYYY-MM-DD HH:mm:ss'],
        description: 'WhatsApp chat export format'
      },
      telegram: {
        name: 'Telegram Export',
        requiredColumns: ['date', 'from', 'text'],
        dateFormats: ['YYYY-MM-DD HH:mm:ss', 'DD.MM.YYYY HH:mm:ss'],
        description: 'Telegram chat export format'
      },
      imessage: {
        name: 'iMessage Export',
        requiredColumns: ['timestamp', 'sender', 'message'],
        dateFormats: ['YYYY-MM-DD HH:mm:ss', 'MM/DD/YYYY HH:mm:ss'],
        description: 'iMessage export format'
      },
      generic: {
        name: 'Generic Chat Export',
        requiredColumns: ['date', 'timestamp', 'sender', 'message'],
        optionalColumns: ['translated_message'],
        dateFormats: ['MM/DD/YY', 'DD/MM/YY', 'YYYY-MM-DD'],
        timeFormats: ['HH:mm a', 'HH:mm', 'h:mm a'],
        description: 'Generic chat export with separate date and time columns'
      }
    };

    this.validationErrors = [];
    this.warnings = [];
  }

  /**
   * Validate CSV file format and structure with enhanced validation
   * @param {string} filePath - Path to the CSV file
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateCSVFile(filePath, options = {}) {
    const { 
      maxFileSize = 50 * 1024 * 1024, 
      encoding = 'auto',
      strictValidation = false,
      allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain']
    } = options;
    
    this.validationErrors = [];
    this.warnings = [];

    try {
      // Check file existence and basic properties
      if (!fs.existsSync(filePath)) {
        this.validationErrors.push({
          type: 'FILE_NOT_FOUND',
          message: 'File does not exist',
          severity: 'error'
        });
        return this.buildValidationResult();
      }

      const stats = fs.statSync(filePath);
      
      // File size validation - but continue to check for headers
      if (stats.size === 0) {
        this.validationErrors.push({
          type: 'MISSING_HEADERS',
          message: 'CSV file must contain headers',
          severity: 'error'
        });
        return this.buildValidationResult();
      }

      if (stats.size > maxFileSize) {
        this.validationErrors.push({
          type: 'FILE_SIZE',
          message: `File size (${this.formatFileSize(stats.size)}) exceeds maximum allowed size (${this.formatFileSize(maxFileSize)})`,
          severity: 'error',
          details: { actualSize: stats.size, maxSize: maxFileSize }
        });
      }

      // File extension validation
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.csv') {
        this.validationErrors.push({
          type: 'FILE_TYPE',
          message: `Invalid file type: ${ext}. Only .csv files are supported`,
          severity: 'error'
        });
      }

      // If critical validation fails, return early
      if (this.validationErrors.length > 0) {
        return this.buildValidationResult();
      }

      // Detect encoding if auto (fallback to utf8 for compatibility)
      const detectedEncoding = encoding === 'auto' ? 'utf8' : encoding;
      
      // Parse and validate CSV structure
      const preview = await this.parseCSVPreview(filePath, { 
        encoding: detectedEncoding, 
        maxRows: 100,
        strictValidation 
      });
      
      const formatDetection = this.detectCSVFormat(preview.headers, preview.rows);
      
      // Additional validation checks
      await this.performAdvancedValidation(preview, formatDetection, strictValidation);

      return {
        isValid: this.validationErrors.length === 0,
        errors: this.validationErrors,
        warnings: this.warnings,
        preview,
        detectedFormat: formatDetection,
        stats: {
          fileSize: stats.size,
          estimatedRows: preview.estimatedTotalRows,
          encoding: detectedEncoding,
          detectedEncoding: encoding === 'auto' ? detectedEncoding : null
        }
      };

    } catch (error) {
      this.validationErrors.push({
        type: 'VALIDATION_ERROR',
        message: `Validation failed: ${error.message}`,
        severity: 'error',
        details: { stack: error.stack }
      });

      return this.buildValidationResult();
    }
  }

  /**
   * Build validation result object
   * @returns {Object} Validation result
   */
  buildValidationResult() {
    return {
      isValid: false,
      errors: this.validationErrors,
      warnings: this.warnings
    };
  }

  /**
   * Detect file encoding
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} Detected encoding
   */
  async detectEncoding(filePath) {
    return new Promise((resolve) => {
      const buffer = fs.readFileSync(filePath);
      const sample = buffer.slice(0, Math.min(1024, buffer.length));
      
      // Try to detect encoding
      const encodings = ['utf8', 'utf16le', 'latin1', 'ascii'];
      let bestEncoding = 'utf8';
      let bestScore = 0;

      for (const encoding of encodings) {
        try {
          const decoded = iconv.decode(sample, encoding);
          // Simple heuristic: count valid characters
          const validChars = decoded.split('').filter(char => {
            const code = char.charCodeAt(0);
            return code >= 32 && code <= 126 || code >= 160; // Printable ASCII + extended
          }).length;
          
          const score = validChars / decoded.length;
          if (score > bestScore) {
            bestScore = score;
            bestEncoding = encoding;
          }
        } catch (error) {
          // Skip this encoding
        }
      }

      resolve(bestEncoding);
    });
  }

  /**
   * Perform advanced validation checks
   * @param {Object} preview - CSV preview data
   * @param {Object} formatDetection - Format detection result
   * @param {boolean} strictValidation - Whether to use strict validation
   */
  async performAdvancedValidation(preview, formatDetection, strictValidation) {
    // Check for minimum data requirements
    if (preview.rows.length === 0) {
      this.warnings.push({
        type: 'NO_DATA_ROWS',
        message: 'CSV file contains headers but no data rows',
        severity: 'warning'
      });
    }

    // Check format confidence
    if (formatDetection.confidence < 50) {
      this.warnings.push({
        type: 'LOW_FORMAT_CONFIDENCE',
        message: `Format detection confidence is low (${formatDetection.confidence}%). Consider manually specifying the format.`,
        severity: 'warning',
        details: { 
          detectedFormat: formatDetection.format,
          confidence: formatDetection.confidence,
          alternatives: formatDetection.alternativeFormats
        }
      });
    }

    // Check for potential data quality issues
    const dataQualityIssues = this.analyzeDataQuality(preview.rows);
    if (dataQualityIssues.length > 0) {
      dataQualityIssues.forEach(issue => {
        if (strictValidation && issue.severity === 'error') {
          this.validationErrors.push(issue);
        } else {
          this.warnings.push(issue);
        }
      });
    }

    // Check for encoding issues
    const encodingIssues = this.detectEncodingIssues(preview.rows);
    if (encodingIssues.length > 0) {
      encodingIssues.forEach(issue => this.warnings.push(issue));
    }
  }

  /**
   * Analyze data quality in CSV rows
   * @param {Array} rows - CSV rows
   * @returns {Array} Array of quality issues
   */
  analyzeDataQuality(rows) {
    const issues = [];
    const sampleSize = Math.min(rows.length, 50);
    
    let emptyRowCount = 0;
    let inconsistentColumnCount = 0;
    const columnCounts = {};

    for (let i = 0; i < sampleSize; i++) {
      const row = rows[i];
      const values = Object.values(row);
      const nonEmptyValues = values.filter(v => v && v.toString().trim() !== '');
      
      // Track column counts
      const colCount = values.length;
      columnCounts[colCount] = (columnCounts[colCount] || 0) + 1;
      
      // Check for empty rows
      if (nonEmptyValues.length === 0) {
        emptyRowCount++;
      }
      
      // Check for mostly empty rows
      if (nonEmptyValues.length < values.length * 0.3) {
        // More than 70% empty values
        issues.push({
          type: 'SPARSE_ROW',
          message: `Row ${i + 1} has many empty values (${values.length - nonEmptyValues.length}/${values.length} empty)`,
          severity: 'warning',
          line: i + 1
        });
      }
    }

    // Check for inconsistent column counts
    const uniqueColumnCounts = Object.keys(columnCounts).length;
    if (uniqueColumnCounts > 1) {
      issues.push({
        type: 'INCONSISTENT_COLUMNS',
        message: `Inconsistent number of columns detected across rows`,
        severity: 'warning',
        details: { columnCounts }
      });
    }

    // Check for too many empty rows
    if (emptyRowCount > sampleSize * 0.2) {
      issues.push({
        type: 'MANY_EMPTY_ROWS',
        message: `${emptyRowCount} out of ${sampleSize} sample rows are empty`,
        severity: 'warning'
      });
    }

    return issues;
  }

  /**
   * Detect potential encoding issues
   * @param {Array} rows - CSV rows
   * @returns {Array} Array of encoding issues
   */
  detectEncodingIssues(rows) {
    const issues = [];
    const sampleSize = Math.min(rows.length, 20);
    
    let suspiciousCharCount = 0;
    const suspiciousPatterns = [
      /�/g, // Replacement character
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // Control characters
      /[^\x00-\x7F]/g // Non-ASCII characters (might be encoding issues)
    ];

    for (let i = 0; i < sampleSize; i++) {
      const row = rows[i];
      const text = Object.values(row).join(' ');
      
      suspiciousPatterns.forEach((pattern, index) => {
        const matches = text.match(pattern);
        if (matches) {
          suspiciousCharCount += matches.length;
          
          if (index === 0) { // Replacement character
            issues.push({
              type: 'ENCODING_REPLACEMENT_CHARS',
              message: `Row ${i + 1} contains replacement characters (�), indicating encoding issues`,
              severity: 'warning',
              line: i + 1
            });
          }
        }
      });
    }

    if (suspiciousCharCount > sampleSize * 2) {
      issues.push({
        type: 'POTENTIAL_ENCODING_ISSUES',
        message: `High number of suspicious characters detected. Consider checking file encoding.`,
        severity: 'warning',
        details: { suspiciousCharCount, sampleSize }
      });
    }

    return issues;
  }

  /**
   * Parse CSV file preview for validation and format detection with enhanced features
   * @param {string} filePath - Path to the CSV file
   * @param {Object} options - Parse options
   * @returns {Promise<Object>} Preview data
   */
  async parseCSVPreview(filePath, options = {}) {
    const { 
      encoding = 'utf8', 
      maxRows = 100,
      strictValidation = false,
      delimiter = 'auto',
      quote = '"'
    } = options;
    
    return new Promise((resolve, reject) => {
      const rows = [];
      let headers = [];
      let rowCount = 0;
      let totalBytes = 0;
      let headersReceived = false;
      let parseErrors = [];
      const fileStats = fs.statSync(filePath);

      // Check if file is empty
      if (fileStats.size === 0) {
        this.validationErrors.push({
          type: 'EMPTY_FILE',
          message: 'CSV file is empty',
          severity: 'error'
        });
        return resolve({
          headers: [],
          rows: [],
          totalPreviewRows: 0,
          estimatedTotalRows: 0,
          fileSize: 0,
          parseErrors: []
        });
      }

      // Auto-detect delimiter if needed
      const detectedDelimiter = delimiter === 'auto' ? this.detectDelimiter(filePath) : delimiter;

      // Create read stream with proper encoding handling
      let readStream;
      if (encoding === 'utf8' || encoding === 'ascii') {
        readStream = fs.createReadStream(filePath, { encoding });
      } else {
        // Use iconv for other encodings
        readStream = fs.createReadStream(filePath)
          .pipe(iconv.decodeStream(encoding));
      }

      const csvParser = csv({
        separator: detectedDelimiter,
        quote: quote,
        skipEmptyLines: true,
        skipLinesWithError: !strictValidation
      });

      readStream
        .pipe(csvParser)
        .on('headers', (headerList) => {
          headers = headerList.map(h => h.trim());
          headersReceived = true;
          this.validateHeaders(headers);
        })
        .on('data', (row) => {
          rowCount++;
          const rowSize = JSON.stringify(row).length;
          totalBytes += rowSize;

          if (rows.length < maxRows) {
            // Clean and validate row data
            const cleanedRow = this.cleanRowData(row);
            rows.push(cleanedRow);
            this.validateRow(cleanedRow, rowCount);
          }

          // Stop reading after sufficient data for estimation
          if (rowCount >= maxRows * 10) {
            csvParser.destroy();
          }
        })
        .on('error', (error) => {
          parseErrors.push({
            type: 'PARSE_ERROR',
            message: error.message,
            line: rowCount + 1,
            severity: 'error'
          });
          
          if (strictValidation) {
            return reject(error);
          }
        })
        .on('end', () => {
          // If no headers were received, it might be an empty or invalid file
          if (!headersReceived && headers.length === 0) {
            this.validateHeaders(headers);
          }

          const estimatedTotalRows = totalBytes > 0 && rowCount > 0 
            ? Math.ceil((fileStats.size / totalBytes) * rowCount) 
            : rowCount;
          
          // Calculate data quality metrics
          const qualityMetrics = this.calculateQualityMetrics(rows, headers);
          
          resolve({
            headers,
            rows: rows.slice(0, maxRows),
            totalPreviewRows: rows.length,
            estimatedTotalRows,
            fileSize: fileStats.size,
            parseErrors,
            delimiter: detectedDelimiter,
            qualityMetrics,
            encoding: encoding
          });
        });
    });
  }

  /**
   * Auto-detect CSV delimiter
   * @param {string} filePath - Path to CSV file
   * @returns {string} Detected delimiter
   */
  detectDelimiter(filePath) {
    try {
      const sample = fs.readFileSync(filePath, 'utf8').slice(0, 1024);
      const delimiters = [',', ';', '\t', '|'];
      let bestDelimiter = ',';
      let maxCount = 0;

      delimiters.forEach(delimiter => {
        const count = (sample.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        if (count > maxCount) {
          maxCount = count;
          bestDelimiter = delimiter;
        }
      });

      return bestDelimiter;
    } catch (error) {
      return ','; // Default fallback
    }
  }

  /**
   * Clean row data by trimming and handling special characters
   * @param {Object} row - Raw row data
   * @returns {Object} Cleaned row data
   */
  cleanRowData(row) {
    const cleaned = {};
    Object.keys(row).forEach(key => {
      const value = row[key];
      if (typeof value === 'string') {
        // Trim whitespace and handle common encoding issues
        cleaned[key] = value.trim()
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\u0000/g, ''); // Remove null characters
      } else {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }

  /**
   * Calculate data quality metrics
   * @param {Array} rows - CSV rows
   * @param {Array} headers - CSV headers
   * @returns {Object} Quality metrics
   */
  calculateQualityMetrics(rows, headers) {
    if (rows.length === 0) {
      return {
        completeness: 0,
        consistency: 0,
        validity: 0,
        emptyRowsRatio: 0,
        averageFieldsPerRow: 0
      };
    }

    let totalFields = 0;
    let emptyFields = 0;
    let emptyRows = 0;
    let inconsistentRows = 0;
    const expectedFieldCount = headers.length;

    rows.forEach(row => {
      const values = Object.values(row);
      const nonEmptyValues = values.filter(v => v && v.toString().trim() !== '');
      
      totalFields += values.length;
      emptyFields += values.length - nonEmptyValues.length;
      
      if (nonEmptyValues.length === 0) {
        emptyRows++;
      }
      
      if (values.length !== expectedFieldCount) {
        inconsistentRows++;
      }
    });

    const completeness = totalFields > 0 ? ((totalFields - emptyFields) / totalFields) * 100 : 0;
    const consistency = rows.length > 0 ? ((rows.length - inconsistentRows) / rows.length) * 100 : 0;
    const emptyRowsRatio = rows.length > 0 ? (emptyRows / rows.length) * 100 : 0;
    const averageFieldsPerRow = rows.length > 0 ? totalFields / rows.length : 0;

    return {
      completeness: Math.round(completeness * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      validity: Math.round(((completeness + consistency) / 2) * 100) / 100,
      emptyRowsRatio: Math.round(emptyRowsRatio * 100) / 100,
      averageFieldsPerRow: Math.round(averageFieldsPerRow * 100) / 100,
      totalRows: rows.length,
      totalFields,
      emptyFields,
      emptyRows,
      inconsistentRows
    };
  }

  /**
   * Detect CSV format based on headers and sample data
   * @param {Array} headers - CSV headers
   * @param {Array} rows - Sample rows
   * @returns {Object} Format detection result
   */
  detectCSVFormat(headers, rows) {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const formatScores = {};

    // Score each format based on header matching
    Object.entries(this.supportedFormats).forEach(([formatKey, format]) => {
      let score = 0;
      const requiredColumns = format.requiredColumns || [];
      const optionalColumns = format.optionalColumns || [];

      // Check required columns
      requiredColumns.forEach(col => {
        if (normalizedHeaders.some(h => h.includes(col.toLowerCase()))) {
          score += 10;
        } else {
          score -= 5; // Penalty for missing required column
        }
      });

      // Check optional columns
      optionalColumns.forEach(col => {
        if (normalizedHeaders.some(h => h.includes(col.toLowerCase()))) {
          score += 2;
        }
      });

      formatScores[formatKey] = score;
    });

    // Find best matching format
    const bestFormat = Object.entries(formatScores)
      .sort(([,a], [,b]) => b - a)[0];

    const detectedFormat = bestFormat[0];
    const confidence = Math.max(0, Math.min(100, (bestFormat[1] / 20) * 100));

    // Validate date formats in sample data
    const dateValidation = this.validateDateFormats(rows, detectedFormat);

    return {
      format: detectedFormat,
      confidence,
      formatInfo: this.supportedFormats[detectedFormat],
      dateValidation,
      alternativeFormats: Object.entries(formatScores)
        .filter(([key]) => key !== detectedFormat)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([key, score]) => ({
          format: key,
          confidence: Math.max(0, Math.min(100, (score / 20) * 100)),
          formatInfo: this.supportedFormats[key]
        }))
    };
  }

  /**
   * Validate CSV headers with enhanced checks
   * @param {Array} headers - CSV headers
   */
  validateHeaders(headers) {
    if (!headers || headers.length === 0) {
      this.validationErrors.push({
        type: 'MISSING_HEADERS',
        message: 'CSV file must contain headers',
        severity: 'error'
      });
      return;
    }

    // Check for duplicate headers
    const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
    if (duplicates.length > 0) {
      this.validationErrors.push({
        type: 'DUPLICATE_HEADERS',
        message: `Duplicate headers found: ${duplicates.join(', ')}`,
        severity: 'error'
      });
    }

    // Check for empty headers
    const emptyHeaders = headers.filter(h => !h || h.trim() === '');
    if (emptyHeaders.length > 0) {
      this.warnings.push({
        type: 'EMPTY_HEADERS',
        message: `Found ${emptyHeaders.length} empty header(s)`,
        severity: 'warning'
      });
    }

    // Check for suspicious header patterns
    const suspiciousHeaders = headers.filter(h => 
      h && (h.includes('�') || h.match(/[^\x00-\x7F]/g))
    );
    if (suspiciousHeaders.length > 0) {
      this.warnings.push({
        type: 'SUSPICIOUS_HEADERS',
        message: `Headers may have encoding issues: ${suspiciousHeaders.join(', ')}`,
        severity: 'warning'
      });
    }
  }

  /**
   * Validate individual CSV row
   * @param {Object} row - CSV row data
   * @param {number} rowNumber - Row number for error reporting
   */
  validateRow(row, rowNumber) {
    const values = Object.values(row);
    const emptyValues = values.filter(v => !v || v.trim() === '');
    
    // Check for completely empty rows
    if (emptyValues.length === values.length) {
      this.warnings.push({
        type: 'EMPTY_ROW',
        message: `Row ${rowNumber} is completely empty`,
        severity: 'warning',
        line: rowNumber
      });
    }

    // Check for rows with too many empty values
    if (emptyValues.length > values.length * 0.7) {
      this.warnings.push({
        type: 'SPARSE_ROW',
        message: `Row ${rowNumber} has many empty values (${emptyValues.length}/${values.length})`,
        severity: 'warning',
        line: rowNumber
      });
    }
  }

  /**
   * Validate date formats in sample data
   * @param {Array} rows - Sample rows
   * @param {string} format - Detected format
   * @returns {Object} Date validation result
   */
  validateDateFormats(rows, format) {
    const formatInfo = this.supportedFormats[format];
    if (!formatInfo || !formatInfo.dateFormats) {
      return { isValid: true, validDates: 0, invalidDates: 0 };
    }

    let validDates = 0;
    let invalidDates = 0;
    const sampleSize = Math.min(rows.length, 20);

    for (let i = 0; i < sampleSize; i++) {
      const row = rows[i];
      let dateFound = false;

      // Check different date column names
      ['date', 'timestamp', 'time', 'datetime'].forEach(dateCol => {
        if (row[dateCol] && !dateFound) {
          const dateStr = row[dateCol];
          if (this.isValidDate(dateStr, formatInfo.dateFormats)) {
            validDates++;
            dateFound = true;
          }
        }
      });

      if (!dateFound && Object.keys(row).length > 0) {
        invalidDates++;
      }
    }

    const validationRatio = validDates / (validDates + invalidDates);
    
    if (validationRatio < 0.8) {
      this.warnings.push({
        type: 'DATE_FORMAT_ISSUES',
        message: `${Math.round((1 - validationRatio) * 100)}% of sample dates could not be parsed correctly`,
        severity: 'warning'
      });
    }

    return {
      isValid: validationRatio >= 0.5,
      validDates,
      invalidDates,
      validationRatio
    };
  }

  /**
   * Check if a date string is valid according to supported formats
   * @param {string} dateStr - Date string to validate
   * @param {Array} formats - Supported date formats
   * @returns {boolean} Whether the date is valid
   */
  isValidDate(dateStr, formats) {
    if (!dateStr || typeof dateStr !== 'string') return false;

    // Try parsing with different formats
    for (const format of formats) {
      try {
        const date = this.parseDate(dateStr, format);
        if (date && !isNaN(date.getTime())) {
          return true;
        }
      } catch (error) {
        // Continue to next format
      }
    }

    // Try native Date parsing as fallback
    const nativeDate = new Date(dateStr);
    return !isNaN(nativeDate.getTime());
  }

  /**
   * Parse date string according to specific format
   * @param {string} dateStr - Date string
   * @param {string} format - Date format
   * @returns {Date} Parsed date
   */
  parseDate(dateStr, format) {
    // Simple date parsing - in production, consider using a library like moment.js or date-fns
    const cleanStr = dateStr.trim();
    
    // Handle common formats
    if (format.includes('DD/MM/YY')) {
      const match = cleanStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (match) {
        let [, day, month, year] = match;
        if (year.length === 2) year = `20${year}`;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
    
    if (format.includes('MM/DD/YY')) {
      const match = cleanStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (match) {
        let [, month, day, year] = match;
        if (year.length === 2) year = `20${year}`;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    // Fallback to native parsing
    return new Date(cleanStr);
  }

  /**
   * Process CSV file with enhanced progress tracking and error handling
   * @param {string} filePath - Path to CSV file
   * @param {Object} options - Processing options
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<Object>} Processing result
   */
  async processCSVFile(filePath, options = {}, progressCallback = null) {
    const { 
      format = 'generic',
      batchSize = 1000,
      encoding = 'auto',
      skipValidation = false,
      strictDateParsing = false,
      maxErrors = 100
    } = options;

    // Pre-validation unless skipped
    let validation = null;
    if (!skipValidation) {
      validation = await this.validateCSVFile(filePath, { 
        encoding, 
        strictValidation: strictDateParsing 
      });
      if (!validation.isValid) {
        throw new Error(`CSV validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    const detectedEncoding = encoding === 'auto' ? 
      (validation?.stats?.encoding || await this.detectEncoding(filePath)) : 
      encoding;

    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      const warnings = [];
      let processedRows = 0;
      let successfulRows = 0;
      let batch = [];
      let totalEstimatedRows = 0;
      const formatInfo = this.supportedFormats[format];
      const startTime = Date.now();

      // Create read stream with proper encoding
      let readStream;
      if (detectedEncoding === 'utf8' || detectedEncoding === 'ascii') {
        readStream = fs.createReadStream(filePath, { encoding: detectedEncoding });
      } else {
        readStream = fs.createReadStream(filePath)
          .pipe(iconv.decodeStream(detectedEncoding));
      }

      // Get file size for progress calculation
      const fileStats = fs.statSync(filePath);
      let bytesProcessed = 0;

      const csvParser = csv({
        skipEmptyLines: true,
        skipLinesWithError: false
      });

      readStream
        .pipe(csvParser)
        .on('headers', (headers) => {
          // Estimate total rows based on file size and header size
          const headerSize = headers.join(',').length + 1;
          totalEstimatedRows = Math.ceil(fileStats.size / (headerSize * 2)); // Rough estimate
        })
        .on('data', (row) => {
          processedRows++;
          bytesProcessed += JSON.stringify(row).length;

          try {
            const processedRow = this.processRow(row, format, formatInfo, {
              strictDateParsing,
              rowNumber: processedRows
            });
            
            if (processedRow) {
              batch.push(processedRow);
              results.push(processedRow);
              successfulRows++;
            }
            
            // Process batch when it reaches batchSize
            if (batch.length >= batchSize) {
              if (progressCallback) {
                const percentage = totalEstimatedRows > 0 ? 
                  Math.min(95, (processedRows / totalEstimatedRows) * 100) : 
                  Math.min(95, (bytesProcessed / fileStats.size) * 100);
                
                progressCallback({
                  processed: processedRows,
                  successful: successfulRows,
                  errors: errors.length,
                  total: totalEstimatedRows,
                  percentage: Math.round(percentage),
                  currentBatch: batch.length,
                  processingRate: processedRows / ((Date.now() - startTime) / 1000),
                  estimatedTimeRemaining: this.calculateETA(startTime, processedRows, totalEstimatedRows)
                });
              }
              batch = [];
            }

            // Stop processing if too many errors
            if (errors.length >= maxErrors) {
              csvParser.destroy();
              warnings.push({
                type: 'MAX_ERRORS_REACHED',
                message: `Processing stopped after ${maxErrors} errors`,
                severity: 'warning'
              });
            }
            
          } catch (error) {
            errors.push({
              row: processedRows,
              error: error.message,
              data: this.sanitizeRowForError(row),
              type: 'PROCESSING_ERROR'
            });
          }
        })
        .on('end', () => {
          // Process remaining batch
          if (batch.length > 0 && progressCallback) {
            progressCallback({
              processed: processedRows,
              successful: successfulRows,
              errors: errors.length,
              total: processedRows,
              percentage: 100,
              currentBatch: batch.length,
              processingRate: processedRows / ((Date.now() - startTime) / 1000),
              estimatedTimeRemaining: 0
            });
          }
          
          const processingTime = Date.now() - startTime;
          
          resolve({
            success: true,
            data: results,
            errors,
            warnings,
            stats: {
              totalRows: processedRows,
              successfulRows,
              errorCount: errors.length,
              warningCount: warnings.length,
              successRate: processedRows > 0 ? (successfulRows / processedRows) * 100 : 0,
              processingTimeMs: processingTime,
              processingRate: processedRows / (processingTime / 1000),
              encoding: detectedEncoding,
              format: format
            }
          });
        })
        .on('error', (error) => {
          reject(new Error(`CSV processing failed: ${error.message}`));
        });
    });
  }

  /**
   * Calculate estimated time remaining
   * @param {number} startTime - Processing start time
   * @param {number} processed - Rows processed
   * @param {number} total - Total estimated rows
   * @returns {number} ETA in seconds
   */
  calculateETA(startTime, processed, total) {
    if (processed === 0 || total === 0) return 0;
    
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = total - processed;
    
    return Math.round(remaining / rate);
  }

  /**
   * Sanitize row data for error reporting
   * @param {Object} row - Row data
   * @returns {Object} Sanitized row data
   */
  sanitizeRowForError(row) {
    const sanitized = {};
    Object.keys(row).forEach(key => {
      const value = row[key];
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    });
    return sanitized;
  }

  /**
   * Process CSV data with format-specific parsing
   * @param {string} filePath - Path to CSV file
   * @param {string} format - CSV format
   * @param {Object} options - Processing options
   */
  processCSVData(filePath, format, options) {
    const { batchSize, encoding, onProgress, onError, onComplete } = options;
    const formatInfo = this.supportedFormats[format];
    
    let batch = [];
    let processedCount = 0;
    
    fs.createReadStream(filePath, { encoding })
      .pipe(csv())
      .on('data', (row) => {
        try {
          const processedRow = this.processRow(row, format, formatInfo);
          if (processedRow) {
            batch.push(processedRow);
          }
          
          processedCount++;
          
          // Process batch when it reaches batchSize
          if (batch.length >= batchSize) {
            onProgress(processedCount, [...batch]);
            batch = [];
          }
        } catch (error) {
          onError({
            row: processedCount + 1,
            error: error.message,
            data: row
          });
          processedCount++; // Still increment count for failed rows
        }
      })
      .on('end', () => {
        // Process remaining batch
        if (batch.length > 0) {
          onProgress(processedCount, batch);
        }
        onComplete();
      })
      .on('error', (error) => {
        onError({
          error: error.message,
          type: 'STREAM_ERROR'
        });
        onComplete(); // Complete even on error to prevent hanging
      });
  }

  /**
   * Process individual row based on format with enhanced options
   * @param {Object} row - Raw CSV row
   * @param {string} format - CSV format
   * @param {Object} formatInfo - Format information
   * @param {Object} options - Processing options
   * @returns {Object} Processed row
   */
  processRow(row, format, formatInfo, options = {}) {
    const { strictDateParsing = false, rowNumber = 0 } = options;
    
    try {
      switch (format) {
        case 'whatsapp':
          return this.processWhatsAppRow(row, { strictDateParsing, rowNumber });
        case 'telegram':
          return this.processTelegramRow(row, { strictDateParsing, rowNumber });
        case 'imessage':
          return this.processIMessageRow(row, { strictDateParsing, rowNumber });
        case 'generic':
        default:
          return this.processGenericRow(row, { strictDateParsing, rowNumber });
      }
    } catch (error) {
      throw new Error(`Row ${rowNumber}: ${error.message}`);
    }
  }

  /**
   * Process WhatsApp format row with enhanced date parsing
   * @param {Object} row - Raw row data
   * @param {Object} options - Processing options
   * @returns {Object} Processed row
   */
  processWhatsAppRow(row, options = {}) {
    const { strictDateParsing = false, rowNumber = 0 } = options;
    const { date, time, sender, message } = row;
    
    if (!date || !time || !sender || !message) {
      throw new Error('Missing required fields for WhatsApp format (date, time, sender, message)');
    }

    // Enhanced date parsing with multiple format support
    let timestamp;
    try {
      // Try different WhatsApp date formats
      const dateFormats = [
        `${date} ${time}`,
        `${date}, ${time}`,
        date.includes(',') ? date : `${date}, ${time}`
      ];

      timestamp = this.parseMultipleDateFormats(dateFormats, strictDateParsing);
      
      if (!timestamp || isNaN(timestamp.getTime())) {
        throw new Error(`Invalid date/time format: "${date} ${time}"`);
      }
    } catch (error) {
      if (strictDateParsing) {
        throw new Error(`Date parsing failed: ${error.message}`);
      }
      // Fallback to current date with warning
      timestamp = new Date();
    }
    
    return {
      timestamp,
      senderName: sender.trim(),
      text: message.trim(),
      originalText: message.trim(),
      wasTranslated: false,
      source: 'whatsapp',
      metadata: {
        originalDate: date,
        originalTime: time,
        rowNumber
      }
    };
  }

  /**
   * Parse multiple date formats and return the first successful parse
   * @param {Array} dateFormats - Array of date format strings to try
   * @param {boolean} strictParsing - Whether to use strict parsing
   * @returns {Date} Parsed date
   */
  parseMultipleDateFormats(dateFormats, strictParsing = false) {
    for (const dateStr of dateFormats) {
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch (error) {
        if (strictParsing) {
          throw error;
        }
        // Continue to next format
      }
    }
    
    if (strictParsing) {
      throw new Error(`Unable to parse any of the provided date formats: ${dateFormats.join(', ')}`);
    }
    
    return new Date(); // Fallback
  }

  /**
   * Process Telegram format row with enhanced date parsing
   * @param {Object} row - Raw row data
   * @param {Object} options - Processing options
   * @returns {Object} Processed row
   */
  processTelegramRow(row, options = {}) {
    const { strictDateParsing = false, rowNumber = 0 } = options;
    const { date, from, text } = row;
    
    if (!date || !from || !text) {
      throw new Error('Missing required fields for Telegram format (date, from, text)');
    }

    let timestamp;
    try {
      timestamp = new Date(date);
      if (isNaN(timestamp.getTime())) {
        throw new Error(`Invalid date format: "${date}"`);
      }
    } catch (error) {
      if (strictDateParsing) {
        throw new Error(`Date parsing failed: ${error.message}`);
      }
      timestamp = new Date();
    }
    
    return {
      timestamp,
      senderName: from.trim(),
      text: text.trim(),
      originalText: text.trim(),
      wasTranslated: false,
      source: 'telegram',
      metadata: {
        originalDate: date,
        rowNumber
      }
    };
  }

  /**
   * Process iMessage format row with enhanced date parsing
   * @param {Object} row - Raw row data
   * @param {Object} options - Processing options
   * @returns {Object} Processed row
   */
  processIMessageRow(row, options = {}) {
    const { strictDateParsing = false, rowNumber = 0 } = options;
    const { timestamp, sender, message } = row;
    
    if (!timestamp || !sender || !message) {
      throw new Error('Missing required fields for iMessage format (timestamp, sender, message)');
    }

    let messageDate;
    try {
      messageDate = new Date(timestamp);
      if (isNaN(messageDate.getTime())) {
        throw new Error(`Invalid timestamp format: "${timestamp}"`);
      }
    } catch (error) {
      if (strictDateParsing) {
        throw new Error(`Date parsing failed: ${error.message}`);
      }
      messageDate = new Date();
    }
    
    return {
      timestamp: messageDate,
      senderName: sender.trim(),
      text: message.trim(),
      originalText: message.trim(),
      wasTranslated: false,
      source: 'imessage',
      metadata: {
        originalTimestamp: timestamp,
        rowNumber
      }
    };
  }

  /**
   * Process generic format row (existing format)
   * @param {Object} row - Raw row data
   * @param {Object} options - Processing options
   * @returns {Object} Processed row
   */
  processGenericRow(row, options = {}) {
    const { date, timestamp, sender, message, translated_message } = row;
    
    if (!date || !timestamp || !sender || (!message && !translated_message)) {
      throw new Error('Missing required fields for generic format');
    }

    try {
      // Parse date and time (existing logic)
      const dateParts = date.split('/');
      const timeParts = timestamp.split(' ');
      
      if (dateParts.length !== 3) {
        throw new Error('Invalid date format');
      }
      
      const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
      
      let hours = parseInt(timeParts[0].split(':')[0]);
      const minutes = parseInt(timeParts[0].split(':')[1]);
      
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Invalid time format');
      }
      
      if (timeParts[1] && timeParts[1].toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (timeParts[1] && timeParts[1].toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
      
      const messageDate = new Date(
        parseInt(year),
        parseInt(dateParts[0]) - 1,
        parseInt(dateParts[1]),
        hours,
        minutes
      );
      
      if (isNaN(messageDate.getTime())) {
        throw new Error('Invalid date/time combination');
      }
      
      const messageText = translated_message && translated_message.trim() !== '' 
        ? translated_message 
        : message;
      
      return {
        timestamp: messageDate,
        senderName: sender.trim(),
        text: messageText.trim(),
        originalText: message ? message.trim() : '',
        wasTranslated: translated_message && translated_message.trim() !== '' && translated_message !== message,
        source: 'generic'
      };
    } catch (error) {
      throw new Error(`Failed to process generic row: ${error.message}`);
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
   * Get supported formats information
   * @returns {Object} Supported formats
   */
  getSupportedFormats() {
    return this.supportedFormats;
  }

  /**
   * Generate CSV template for a specific format
   * @param {string} format - Format name
   * @returns {string} CSV template content
   */
  generateCSVTemplate(format) {
    const formatInfo = this.supportedFormats[format];
    if (!formatInfo) {
      throw new Error(`Unsupported format: ${format}`);
    }

    const headers = [...formatInfo.requiredColumns];
    if (formatInfo.optionalColumns) {
      headers.push(...formatInfo.optionalColumns);
    }

    // Generate sample data based on format
    const sampleRows = this.generateSampleData(format, 3);
    
    let csvContent = headers.join(',') + '\n';
    sampleRows.forEach(row => {
      csvContent += headers.map(header => row[header] || '').join(',') + '\n';
    });

    return csvContent;
  }

  /**
   * Generate sample data for CSV template
   * @param {string} format - Format name
   * @param {number} rows - Number of sample rows
   * @returns {Array} Sample data rows
   */
  generateSampleData(format, rows = 3) {
    const sampleData = [];
    const now = new Date();

    for (let i = 0; i < rows; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      switch (format) {
        case 'whatsapp':
          sampleData.push({
            date: date.toLocaleDateString('en-GB'),
            time: date.toLocaleTimeString('en-US', { hour12: true }),
            sender: i % 2 === 0 ? 'Alice' : 'Bob',
            message: `Sample message ${i + 1}`
          });
          break;
          
        case 'telegram':
          sampleData.push({
            date: date.toISOString(),
            from: i % 2 === 0 ? 'Alice' : 'Bob',
            text: `Sample message ${i + 1}`
          });
          break;
          
        case 'imessage':
          sampleData.push({
            timestamp: date.toISOString(),
            sender: i % 2 === 0 ? 'Alice' : 'Bob',
            message: `Sample message ${i + 1}`
          });
          break;
          
        case 'generic':
        default:
          sampleData.push({
            date: date.toLocaleDateString('en-US'),
            timestamp: date.toLocaleTimeString('en-US', { hour12: true }),
            sender: i % 2 === 0 ? 'Alice' : 'Bob',
            message: `Sample message ${i + 1}`,
            translated_message: ''
          });
          break;
      }
    }

    return sampleData;
  }
}

module.exports = new CSVService();