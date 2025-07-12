const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Analytics endpoints
router.get('/:chatId/stats', analyticsController.getChatStats);
router.get('/:chatId/wordcloud', analyticsController.getWordCloud);
router.get('/:chatId/timeline', analyticsController.getMessageTimeline);
router.get('/:chatId/milestones', analyticsController.getRelationshipMilestones);
router.get('/:chatId/emoji-stats', analyticsController.getEmojiStats);

module.exports = router;
