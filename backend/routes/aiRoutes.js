const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// AI endpoints
router.get('/:chatId/relationship-insights', aiController.getRelationshipInsights);
router.get('/:chatId/conversation-starters', aiController.getConversationStarters);
router.get('/:chatId/emoji-insights', aiController.getEmojiInsights);
router.get('/:chatId/date-ideas', aiController.getDateIdeas);
router.get('/:chatId/memory-summary', aiController.generateMemorySummary);

module.exports = router;
