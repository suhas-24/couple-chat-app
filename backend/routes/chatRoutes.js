const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');
const secureUpload = require('../middleware/secureUpload');

// Create secure upload middleware for CSV files
const csvUpload = secureUpload.createUploadMiddleware({
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 1,
  allowedExtensions: ['.csv'],
  allowedMimeTypes: ['text/csv', 'application/csv', 'text/plain'],
  virusScan: true
});

// All routes require authentication
router.use(auth);

// Chat management
router.post('/create', chatController.createOrGetChat);
router.get('/user-chats', chatController.getUserChats);
router.patch('/:chatId/metadata', chatController.updateChatMetadata);

// Message operations
router.post('/message', chatController.sendMessage);
router.get('/:chatId/messages', chatController.getChatMessages);
router.put('/message/:messageId', chatController.editMessage);
router.delete('/message/:messageId', chatController.deleteMessage);
router.post('/message/:messageId/read', chatController.markMessageAsRead);

// Reaction operations
router.post('/message/:messageId/reaction', chatController.addReaction);
router.delete('/message/:messageId/reaction', chatController.removeReaction);

// Search operations
router.get('/:chatId/search', chatController.searchMessages);

// CSV operations with secure upload
router.post('/csv/validate', csvUpload, chatController.validateCsvFile);
router.post('/csv/preview', csvUpload, chatController.previewCsvFile);
router.get('/csv/template/:format', chatController.downloadCsvTemplate);
router.get('/csv/formats', chatController.getSupportedFormats);
router.post('/upload-csv', csvUpload, chatController.uploadCsvChat);

// Import management operations
router.post('/:chatId/import/:importId/rollback', chatController.rollbackCsvImport);
router.get('/:chatId/import/stats', chatController.getImportStats);

module.exports = router;
