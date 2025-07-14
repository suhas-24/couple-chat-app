const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const csvService = require('../services/csvService');

describe('Enhanced CSV Upload and Import System', () => {
  let authToken;
  let userId;
  let partnerId;
  let chatId;
  let testCsvPath;

  beforeAll(async () => {
    // Create test users
    const user = new User({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      isEmailVerified: true
    });
    await user.save();
    userId = user._id;

    const partner = new User({
      name: 'Test Partner',
      email: 'partner@example.com',
      password: 'password123',
      isEmailVerified: true
    });
    await partner.save();
    partnerId = partner._id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'password123'
      });

    authToken = loginResponse.headers['set-cookie']
      .find(cookie => cookie.startsWith('auth-token='))
      .split(';')[0];

    // Create a chat
    const chat = new Chat({
      participants: [userId, partnerId],
      chatName: 'Test Chat'
    });
    await chat.save();
    chatId = chat._id;

    // Create test CSV file
    testCsvPath = path.join(__dirname, 'test-chat.csv');
    const csvContent = `date,timestamp,sender,message,translated_message
07/14/25,9:30 am,Test User,Hello world!,
07/14/25,9:31 am,Test Partner,Hi there!,
07/14/25,9:32 am,Test User,How are you?,
07/14/25,9:33 am,Test Partner,I'm good thanks,`;
    fs.writeFileSync(testCsvPath, csvContent);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
    
    // Clean up test files
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath);
    }
  });

  describe('CSV Service Core Functionality', () => {
    test('should get supported formats', () => {
      const formats = csvService.getSupportedFormats();
      
      expect(formats).toHaveProperty('whatsapp');
      expect(formats).toHaveProperty('telegram');
      expect(formats).toHaveProperty('imessage');
      expect(formats).toHaveProperty('generic');
      
      expect(formats.whatsapp).toHaveProperty('name');
      expect(formats.whatsapp).toHaveProperty('requiredColumns');
      expect(formats.whatsapp).toHaveProperty('dateFormats');
    });

    test('should generate CSV template for generic format', () => {
      const template = csvService.generateCSVTemplate('generic');
      
      expect(template).toContain('date,timestamp,sender,message');
      expect(template).toContain('Alice');
      expect(template).toContain('Bob');
      expect(template.split('\n').length).toBeGreaterThan(3); // Header + sample rows
    });

    test('should generate CSV template for WhatsApp format', () => {
      const template = csvService.generateCSVTemplate('whatsapp');
      
      expect(template).toContain('date,time,sender,message');
      expect(template).toContain('Alice');
      expect(template).toContain('Bob');
    });

    test('should throw error for unsupported format', () => {
      expect(() => {
        csvService.generateCSVTemplate('unsupported');
      }).toThrow('Unsupported format: unsupported');
    });

    test('should validate CSV file structure', async () => {
      const validation = await csvService.validateCSVFile(testCsvPath);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.preview).toBeDefined();
      expect(validation.preview.headers).toContain('date');
      expect(validation.preview.headers).toContain('sender');
      expect(validation.preview.rows.length).toBeGreaterThan(0);
      expect(validation.detectedFormat.format).toBe('generic');
    });

    test('should detect date format issues', async () => {
      // Create CSV with invalid dates
      const invalidCsvPath = path.join(__dirname, 'invalid-dates.csv');
      const invalidContent = `date,timestamp,sender,message
invalid-date,9:30 am,Test User,Hello
not-a-date,9:31 am,Test Partner,Hi`;
      
      fs.writeFileSync(invalidCsvPath, invalidContent);
      
      const validation = await csvService.validateCSVFile(invalidCsvPath);
      
      expect(validation.warnings.some(w => w.type === 'DATE_FORMAT_ISSUES')).toBe(true);
      
      fs.unlinkSync(invalidCsvPath);
    });

    test('should handle file size validation', async () => {
      const options = { maxFileSize: 100 }; // Very small limit
      const validation = await csvService.validateCSVFile(testCsvPath, options);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.type === 'FILE_SIZE')).toBe(true);
    });

    test('should process CSV with progress tracking', async () => {
      const progressUpdates = [];
      
      const result = await csvService.processCSVFile(
        testCsvPath,
        { format: 'generic' },
        (progress) => {
          progressUpdates.push(progress);
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.stats.successRate).toBeGreaterThan(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Check data structure
      const firstMessage = result.data[0];
      expect(firstMessage).toHaveProperty('timestamp');
      expect(firstMessage).toHaveProperty('senderName');
      expect(firstMessage).toHaveProperty('text');
      expect(firstMessage).toHaveProperty('source');
    });
  });

  describe('CSV API Endpoints', () => {
    test('should get supported formats via API', async () => {
      const response = await request(app)
        .get('/api/chat/csv/formats')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.formats).toHaveProperty('whatsapp');
      expect(response.body.formats).toHaveProperty('generic');
    });

    test('should download CSV template', async () => {
      const response = await request(app)
        .get('/api/chat/csv/template/generic')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('generic_template.csv');
      expect(response.text).toContain('date,timestamp,sender,message');
    });

    test('should reject unsupported template format', async () => {
      const response = await request(app)
        .get('/api/chat/csv/template/unsupported')
        .set('Cookie', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unsupported format');
      expect(response.body.supportedFormats).toBeDefined();
    });

    test('should validate CSV file via API', async () => {
      const response = await request(app)
        .post('/api/chat/csv/validate')
        .set('Cookie', authToken)
        .attach('file', testCsvPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.validation.isValid).toBe(true);
      expect(response.body.validation.detectedFormat).toBeDefined();
    });

    test('should preview CSV file via API', async () => {
      const response = await request(app)
        .post('/api/chat/csv/preview')
        .set('Cookie', authToken)
        .field('maxRows', '10')
        .attach('file', testCsvPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.preview).toBeDefined();
      expect(response.body.preview.headers).toContain('date');
      expect(response.body.preview.rows.length).toBeGreaterThan(0);
      expect(response.body.detectedFormat.format).toBe('generic');
    });

    test('should reject invalid CSV for preview', async () => {
      // Create invalid CSV
      const invalidCsvPath = path.join(__dirname, 'invalid.csv');
      fs.writeFileSync(invalidCsvPath, 'invalid,csv,content\n');
      
      const response = await request(app)
        .post('/api/chat/csv/preview')
        .set('Cookie', authToken)
        .attach('file', invalidCsvPath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CSV validation failed');
      
      fs.unlinkSync(invalidCsvPath);
    });

    test('should require file for validation', async () => {
      const response = await request(app)
        .post('/api/chat/csv/validate')
        .set('Cookie', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    test('should require authentication for CSV operations', async () => {
      const response = await request(app)
        .get('/api/chat/csv/formats');

      expect(response.status).toBe(401);
    });
  });

  describe('Enhanced CSV Upload', () => {
    test('should upload CSV with enhanced processing', async () => {
      const response = await request(app)
        .post('/api/chat/upload-csv')
        .set('Cookie', authToken)
        .field('chatId', chatId.toString())
        .field('format', 'generic')
        .attach('file', testCsvPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.messagesImported).toBeGreaterThan(0);
      expect(response.body.stats.format).toBe('generic');
      expect(response.body.stats.dateRange).toBeDefined();
      expect(response.body.stats.senderBreakdown).toBeDefined();
      expect(response.body.stats.successRate).toBeGreaterThan(0);

      // Verify messages were created
      const messages = await Message.find({ chat: chatId });
      expect(messages.length).toBeGreaterThan(0);
      
      // Check message metadata
      const firstMessage = messages[0];
      expect(firstMessage.metadata.importedFrom.source).toBe('generic');
      expect(firstMessage.metadata.importedFrom.originalTimestamp).toBeDefined();
    });

    test('should handle WhatsApp format CSV', async () => {
      // Create WhatsApp format CSV
      const whatsappCsvPath = path.join(__dirname, 'whatsapp-test.csv');
      const whatsappContent = `date,time,sender,message
14/07/25,9:30 AM,Test User,Hello from WhatsApp
14/07/25,9:31 AM,Test Partner,Hi there from WhatsApp`;
      
      fs.writeFileSync(whatsappCsvPath, whatsappContent);

      const response = await request(app)
        .post('/api/chat/upload-csv')
        .set('Cookie', authToken)
        .field('chatId', chatId.toString())
        .field('format', 'whatsapp')
        .attach('file', whatsappCsvPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.format).toBe('whatsapp');

      fs.unlinkSync(whatsappCsvPath);
    });

    test('should handle batch processing for large files', async () => {
      // Create larger CSV file
      const largeCsvPath = path.join(__dirname, 'large-test.csv');
      let largeContent = 'date,timestamp,sender,message\n';
      
      // Add 50 messages
      for (let i = 0; i < 50; i++) {
        const date = new Date(2025, 6, 14 + Math.floor(i / 10));
        largeContent += `${date.toLocaleDateString('en-US')},${9 + (i % 12)}:${30 + (i % 30)} am,User${i % 2 + 1},Message ${i + 1}\n`;
      }
      
      fs.writeFileSync(largeCsvPath, largeContent);

      const response = await request(app)
        .post('/api/chat/upload-csv')
        .set('Cookie', authToken)
        .field('chatId', chatId.toString())
        .field('format', 'generic')
        .attach('file', largeCsvPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.messagesImported).toBe(50);
      expect(response.body.stats.totalProcessed).toBe(50);

      fs.unlinkSync(largeCsvPath);
    });

    test('should handle CSV processing errors gracefully', async () => {
      // Create CSV with some invalid data
      const errorCsvPath = path.join(__dirname, 'error-test.csv');
      const errorContent = `date,timestamp,sender,message
07/14/25,9:30 am,Test User,Valid message
invalid-date,invalid-time,,Invalid message
07/14/25,9:32 am,Test User,Another valid message`;
      
      fs.writeFileSync(errorCsvPath, errorContent);

      const response = await request(app)
        .post('/api/chat/upload-csv')
        .set('Cookie', authToken)
        .field('chatId', chatId.toString())
        .field('format', 'generic')
        .attach('file', errorCsvPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.messagesImported).toBeGreaterThan(0);
      // Should have some errors but still process valid messages
      
      fs.unlinkSync(errorCsvPath);
    });

    test('should reject upload to unauthorized chat', async () => {
      // Create another user and chat
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        isEmailVerified: true
      });
      await anotherUser.save();

      const anotherChat = new Chat({
        participants: [anotherUser._id, partnerId],
        chatName: 'Another Chat'
      });
      await anotherChat.save();

      const response = await request(app)
        .post('/api/chat/upload-csv')
        .set('Cookie', authToken)
        .field('chatId', anotherChat._id.toString())
        .field('format', 'generic')
        .attach('file', testCsvPath);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized to upload to this chat');

      await User.findByIdAndDelete(anotherUser._id);
      await Chat.findByIdAndDelete(anotherChat._id);
    });

    test('should require file for upload', async () => {
      const response = await request(app)
        .post('/api/chat/upload-csv')
        .set('Cookie', authToken)
        .field('chatId', chatId.toString());

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    test('should update chat with import information', async () => {
      const response = await request(app)
        .post('/api/chat/upload-csv')
        .set('Cookie', authToken)
        .field('chatId', chatId.toString())
        .field('format', 'generic')
        .attach('file', testCsvPath);

      expect(response.status).toBe(200);

      // Check that chat was updated with import info
      const updatedChat = await Chat.findById(chatId);
      expect(updatedChat.csvImports).toBeDefined();
      expect(updatedChat.csvImports.length).toBeGreaterThan(0);
      
      const lastImport = updatedChat.csvImports[updatedChat.csvImports.length - 1];
      expect(lastImport.fileName).toBe('test-chat.csv');
      expect(lastImport.format).toBe('generic');
      expect(lastImport.messageCount).toBeGreaterThan(0);
      expect(lastImport.processingStats).toBeDefined();
    });
  });

  describe('CSV Format Detection', () => {
    test('should detect WhatsApp format', async () => {
      const whatsappCsvPath = path.join(__dirname, 'whatsapp-detect.csv');
      const whatsappContent = `date,time,sender,message
14/07/25,9:30 AM,Alice,Hello
14/07/25,9:31 AM,Bob,Hi there`;
      
      fs.writeFileSync(whatsappCsvPath, whatsappContent);

      const validation = await csvService.validateCSVFile(whatsappCsvPath);
      
      expect(validation.detectedFormat.format).toBe('whatsapp');
      expect(validation.detectedFormat.confidence).toBeGreaterThan(50);

      fs.unlinkSync(whatsappCsvPath);
    });

    test('should detect Telegram format', async () => {
      const telegramCsvPath = path.join(__dirname, 'telegram-detect.csv');
      const telegramContent = `date,from,text
2025-07-14 09:30:00,Alice,Hello from Telegram
2025-07-14 09:31:00,Bob,Hi there from Telegram`;
      
      fs.writeFileSync(telegramCsvPath, telegramContent);

      const validation = await csvService.validateCSVFile(telegramCsvPath);
      
      expect(validation.detectedFormat.format).toBe('telegram');
      expect(validation.detectedFormat.confidence).toBeGreaterThan(50);

      fs.unlinkSync(telegramCsvPath);
    });

    test('should provide alternative format suggestions', async () => {
      const validation = await csvService.validateCSVFile(testCsvPath);
      
      expect(validation.detectedFormat.alternativeFormats).toBeDefined();
      expect(validation.detectedFormat.alternativeFormats.length).toBeGreaterThan(0);
      
      const alternative = validation.detectedFormat.alternativeFormats[0];
      expect(alternative).toHaveProperty('format');
      expect(alternative).toHaveProperty('confidence');
      expect(alternative).toHaveProperty('formatInfo');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty CSV file', async () => {
      const emptyCsvPath = path.join(__dirname, 'empty.csv');
      fs.writeFileSync(emptyCsvPath, '');

      const validation = await csvService.validateCSVFile(emptyCsvPath);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.type === 'MISSING_HEADERS')).toBe(true);

      fs.unlinkSync(emptyCsvPath);
    });

    test('should handle CSV with only headers', async () => {
      const headerOnlyCsvPath = path.join(__dirname, 'headers-only.csv');
      fs.writeFileSync(headerOnlyCsvPath, 'date,timestamp,sender,message\n');

      const validation = await csvService.validateCSVFile(headerOnlyCsvPath);
      
      expect(validation.isValid).toBe(true);
      expect(validation.preview.rows.length).toBe(0);

      fs.unlinkSync(headerOnlyCsvPath);
    });

    test('should handle CSV with duplicate headers', async () => {
      const duplicateHeadersCsvPath = path.join(__dirname, 'duplicate-headers.csv');
      const duplicateContent = `date,date,sender,message
07/14/25,9:30 am,Test User,Hello`;
      
      fs.writeFileSync(duplicateHeadersCsvPath, duplicateContent);

      const validation = await csvService.validateCSVFile(duplicateHeadersCsvPath);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.type === 'DUPLICATE_HEADERS')).toBe(true);

      fs.unlinkSync(duplicateHeadersCsvPath);
    });

    test('should handle non-CSV file extension', async () => {
      const txtFilePath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(txtFilePath, 'This is not a CSV file');

      const validation = await csvService.validateCSVFile(txtFilePath);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.type === 'FILE_TYPE')).toBe(true);

      fs.unlinkSync(txtFilePath);
    });

    test('should handle file encoding issues', async () => {
      const response = await request(app)
        .post('/api/chat/csv/preview')
        .set('Cookie', authToken)
        .field('encoding', 'latin1')
        .attach('file', testCsvPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});