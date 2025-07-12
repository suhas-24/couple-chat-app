const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
// Conversational-AI assistant routes (ask AI about chat history, word counts, etc.)
const aiChatRoutes = require('./aiChat');
const auth = require('../middleware/auth');

// ---------------------------------------------------------------------------
// All AI routes require authentication.  Register middleware BEFORE routes.
// ---------------------------------------------------------------------------
router.use(auth);

// AI endpoints
router.get('/:chatId/relationship-insights', aiController.getRelationshipInsights);
router.get('/:chatId/conversation-starters', aiController.getConversationStarters);
router.get('/:chatId/emoji-insights', aiController.getEmojiInsights);
router.get('/:chatId/date-ideas', aiController.getDateIdeas);
router.get('/:chatId/memory-summary', aiController.generateMemorySummary);

// ──────────────────────────────────────────────────────────
//  Conversational AI Chat Assistant
//  These routes live in routes/aiChat.js and provide endpoints like:
//    POST /api/ai/chat/:chatId/ask
//    GET  /api/ai/chat/:chatId/word-frequency
//    GET  /api/ai/chat/:chatId/messages-by-date
// ──────────────────────────────────────────────────────────
router.use('/chat', aiChatRoutes);

module.exports = router;
