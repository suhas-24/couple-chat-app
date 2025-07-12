const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
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
router.post('/message/:messageId/reaction', chatController.addReaction);

// CSV upload
router.post('/upload-csv', upload.single('file'), chatController.uploadCsvChat);

module.exports = router;
