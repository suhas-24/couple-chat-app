const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');

/**
 * AI Chat Routes
 * Handles conversational AI requests about chat history
 */

/**
 * @route   POST /api/ai/chat/:chatId/ask
 * @desc    Ask AI about chat history (e.g., "what did we do on this day?", "how many times we said hello")
 * @access  Private (only chat participants)
 */
router.post(
  '/:chatId/ask',
  aiChatController.validateChatAccess.bind(aiChatController),
  aiChatController.askAI.bind(aiChatController)
);

/**
 * @route   GET /api/ai/chat/:chatId/word-frequency
 * @desc    Get frequency of a specific word in chat history
 * @access  Private (only chat participants)
 * @query   word - The word to search for
 */
router.get(
  '/:chatId/word-frequency',
  aiChatController.validateChatAccess.bind(aiChatController),
  aiChatController.getWordFrequency.bind(aiChatController)
);

/**
 * @route   GET /api/ai/chat/:chatId/messages-by-date
 * @desc    Get messages from a specific date
 * @access  Private (only chat participants)
 * @query   date - The date to search for (format: YYYY-MM-DD)
 */
router.get(
  '/:chatId/messages-by-date',
  aiChatController.validateChatAccess.bind(aiChatController),
  aiChatController.getMessagesByDate.bind(aiChatController)
);

module.exports = router;
