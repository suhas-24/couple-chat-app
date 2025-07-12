const { Chat, Message } = require('../models');
const { geminiService } = require('../services/geminiService');
const mongoose = require('mongoose');

/**
 * AI Chat Controller - Handles conversational AI requests about chat history
 */
class AIChatController {
  /**
   * Middleware to validate chat access
   */
  async validateChatAccess(req, res, next) {
    try {
      const { chatId } = req.params;
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid chat ID format' 
        });
      }
      
      // Find chat and check if user is a participant
      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        return res.status(404).json({ 
          success: false, 
          error: 'Chat not found' 
        });
      }
      
      // Check if the current user is a participant in this chat
      const isParticipant = chat.participants.some(
        p => p.toString() === req.userId
      );
      
      if (!isParticipant) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have access to this chat' 
        });
      }
      
      // Add chat to request for later use
      req.chat = chat;
      next();
    } catch (error) {
      console.error('Error validating chat access:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Server error validating chat access' 
      });
    }
  }

  /**
   * Ask AI about chat history
   * Handles questions like "what did we do on this day?" or "how many times we said hello"
   */
  async askAI(req, res) {
    try {
      const { chatId } = req.params;
      const { question } = req.body;
      
      if (!question || question.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Question is required'
        });
      }

      // Check if Gemini API key is configured
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({
          success: false,
          error: 'AI service is not configured. Please add your Gemini API key in the backend/.env file.'
        });
      }
      
      // Get chat messages with populated sender information
      const messages = await Message.find({ chat: chatId })
        .populate('sender', 'name email')
        .sort({ createdAt: -1 })
        .limit(500); // Limit to recent messages for performance
      
      if (messages.length === 0) {
        return res.status(200).json({
          success: true,
          answer: "I don't see any messages in this chat yet. Start chatting and I'll be able to answer questions about your conversations!"
        });
      }
      
      // Get chat metadata
      const chatMetadata = req.chat.metadata || {};
      
      // Process the question using Gemini service
      const answer = await geminiService.askAboutChatHistory(
        question, 
        messages, 
        chatMetadata
      );
      
      // Format the response with emoji and styling
      const formattedAnswer = this.formatAIResponse(answer);
      
      res.status(200).json({
        success: true,
        answer: formattedAnswer,
        metadata: {
          messagesAnalyzed: messages.length,
          questionAsked: question,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error in AI chat assistant:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error processing your question'
      });
    }
  }
  
  /**
   * Format AI response with emoji and styling
   */
  formatAIResponse(response) {
    // Add emoji if not present
    const commonEmojis = ['💭', '💕', '💫', '✨', '🌟', '💌', '❤️', '📆', '🗓️'];
    
    if (!response.includes('💕') && !response.includes('❤️') && !response.includes('✨')) {
      // Add random emoji to the start of the response
      const randomEmoji = commonEmojis[Math.floor(Math.random() * commonEmojis.length)];
      return `${randomEmoji} ${response}`;
    }
    
    return response;
  }
  
  /**
   * Get word frequency in chat history
   * Handles questions like "how many times we said hello"
   */
  async getWordFrequency(req, res) {
    try {
      const { chatId } = req.params;
      const { word } = req.query;
      
      if (!word || word.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Word parameter is required'
        });
      }
      
      // Get all messages
      const messages = await Message.find({ chat: chatId })
        .populate('sender', 'name email');
      
      // Count word occurrences by each participant
      const wordCounts = {};
      const searchWord = word.toLowerCase();
      
      messages.forEach(msg => {
        const senderName = msg.sender.name;
        if (!wordCounts[senderName]) {
          wordCounts[senderName] = 0;
        }
        
        // Count occurrences (case insensitive)
        const content = msg.content.text.toLowerCase();
        const regex = new RegExp(`\\b${searchWord}\\b`, 'gi');
        const matches = content.match(regex);
        
        if (matches) {
          wordCounts[senderName] += matches.length;
        }
      });
      
      // Calculate total
      const totalCount = Object.values(wordCounts).reduce((sum, count) => sum + count, 0);
      
      res.status(200).json({
        success: true,
        word: word,
        totalCount,
        countByParticipant: wordCounts,
        messagesAnalyzed: messages.length
      });
    } catch (error) {
      console.error('Error getting word frequency:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error analyzing word frequency'
      });
    }
  }
  
  /**
   * Get messages from a specific date
   * Handles questions like "what did we do on this day?"
   */
  async getMessagesByDate(req, res) {
    try {
      const { chatId } = req.params;
      const { date } = req.query; // Format: YYYY-MM-DD
      
      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date parameter is required (format: YYYY-MM-DD)'
        });
      }
      
      // Parse the date
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      // Set start and end of the day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Find messages from that day
      const messages = await Message.find({
        chat: chatId,
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).populate('sender', 'name email');
      
      if (messages.length === 0) {
        return res.status(200).json({
          success: true,
          date: targetDate.toDateString(),
          messages: [],
          summary: `No messages were exchanged on ${targetDate.toDateString()}.`
        });
      }
      
      // Generate a summary using Gemini
      const summary = await geminiService.generateContent(
        `Summarize these messages from ${targetDate.toDateString()} in a warm, engaging way:
        
        ${messages.map(m => `${m.sender.name}: ${m.content.text}`).join('\n')}
        
        Create a brief, couple-friendly summary that captures the essence of their conversation.`,
        `You are a thoughtful AI assistant for a couple's chat app. Be warm and supportive.`
      );
      
      res.status(200).json({
        success: true,
        date: targetDate.toDateString(),
        messageCount: messages.length,
        messages: messages.map(m => ({
          sender: m.sender.name,
          content: m.content.text,
          time: m.createdAt
        })),
        summary
      });
    } catch (error) {
      console.error('Error getting messages by date:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error retrieving messages for this date'
      });
    }
  }
}

module.exports = new AIChatController();
