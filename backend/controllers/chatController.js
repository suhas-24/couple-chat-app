const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
// Context-aware AI service
const { processIncomingMessage } = require('../services/contextAwareAI');
const csvService = require('../services/csvService');
const batchProcessor = require('../services/batchProcessor');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Create or get existing chat between two users
exports.createOrGetChat = async (req, res) => {
  try {
    const { partnerId, partnerEmail, chatName } = req.body;
    const userId = req.userId; // From auth middleware

    if (!partnerId && !partnerEmail) {
      return res.status(400).json({ error: 'Partner ID or email is required' });
    }

    let partner;
    
    // Find partner by ID or email
    if (partnerId) {
      partner = await User.findById(partnerId);
    } else if (partnerEmail) {
      partner = await User.findOne({ email: partnerEmail.toLowerCase() });
    }

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check if chat already exists between these users
    let chat = await Chat.findOne({
      participants: { $all: [userId, partner._id] },
      isActive: true
    }).populate('participants', 'name email avatar');

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [userId, partner._id],
        chatName: chatName || `Chat with ${partner.name}`
      });

      await chat.save();
      
      // Populate participants
      await chat.populate('participants', 'name email avatar');
    }

    res.status(200).json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    res.status(500).json({ error: 'Failed to create or get chat' });
  }
};

// Get all chats for a user
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.userId;

    const chats = await Chat.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'name email avatar')
    .sort('-lastMessageAt')
    .limit(10);

    res.status(200).json({
      success: true,
      chats
    });
  } catch (error) {
    console.error('Error getting user chats:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, text, type = 'text' } = req.body;
    const userId = req.userId;

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to send messages in this chat' });
    }

    // Create message
    const message = new Message({
      chat: chatId,
      sender: userId,
      content: {
        text,
        type
      },
      readBy: [{ user: userId }]
    });

    await message.save();
    
    // Populate sender info
    await message.populate('sender', 'name avatar');

    /* ------------------------------------------------------------------
     * 🤖  Context-Aware AI processing
     * ------------------------------------------------------------------ */
    let aiMessage = null;
    try {
      const aiAnalysis = await processIncomingMessage(text, chatId, userId);

      if (aiAnalysis?.isAIQuery && aiAnalysis.aiResponse) {
        aiMessage = new Message({
          chat: chatId,
          // Re-use sender as a system-style marker; flag with metadata
          sender: userId,
          content: {
            text: aiAnalysis.aiResponse,
            type: 'text'
          },
          metadata: { isAIResponse: true },
          // Immediately mark as read for sender
          readBy: [{ user: userId }]
        });

        await aiMessage.save();
        await aiMessage.populate('sender', 'name avatar');
      }
    } catch (aiErr) {
      // Log but don’t interrupt normal flow
      console.error('AI processing error:', aiErr);
    }

    res.status(201).json({
      success: true,
      message,
      ...(aiMessage && { aiMessage })
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get messages for a chat
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.userId;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to view this chat' });
    }

    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    })
    .populate('sender', 'name avatar')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Mark messages as read
    const unreadMessages = messages.filter(msg => 
      msg.sender._id.toString() !== userId && 
      !msg.readBy.some(read => read.user.toString() === userId)
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map(m => m._id) },
          'readBy.user': { $ne: userId }
        },
        {
          $push: { readBy: { user: userId } }
        }
      );
    }

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      page: parseInt(page),
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Upload and parse CSV chat history with enhanced processing and rollback support
exports.uploadCsvChat = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { chatId, format = 'generic', enableRollback = true } = req.body;
    const userId = req.userId;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to upload to this chat' });
    }

    // Process CSV file with enhanced service
    const processingOptions = {
      format,
      batchSize: 1000,
      encoding: req.body.encoding || 'utf8'
    };

    // Process CSV with progress tracking
    const csvResult = await csvService.processCSVFile(
      req.file.path,
      processingOptions,
      (progress) => {
        // Progress callback - could be used for real-time updates via WebSocket
        console.log(`CSV Processing: ${progress.percentage}% (${progress.processed}/${progress.total})`);
      }
    );

    if (!csvResult.success) {
      // Clean up uploaded file
      if (req.cleanupUploadedFile) {
        await req.cleanupUploadedFile();
      } else {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: 'CSV processing failed',
        details: csvResult.errors
      });
    }

    // Map sender names to user IDs
    const participants = await User.find({ _id: { $in: chat.participants } });
    const senderMap = {};
    
    // Enhanced sender mapping
    participants.forEach(user => {
      const userName = user.name.toLowerCase();
      csvResult.data.forEach(msg => {
        const senderName = msg.senderName.toLowerCase();
        if (userName.includes(senderName) || senderName.includes(userName)) {
          senderMap[msg.senderName] = user._id;
        }
      });
    });

    // Calculate date range and sender breakdown
    const dateRange = { start: null, end: null };
    const senderCounts = {};
    
    csvResult.data.forEach(msg => {
      // Update date range
      if (!dateRange.start || msg.timestamp < dateRange.start) {
        dateRange.start = msg.timestamp;
      }
      if (!dateRange.end || msg.timestamp > dateRange.end) {
        dateRange.end = msg.timestamp;
      }
      
      // Update sender counts
      senderCounts[msg.senderName] = (senderCounts[msg.senderName] || 0) + 1;
    });

    // Prepare messages for batch processing
    const messagesToImport = csvResult.data.map(msg => ({
      sender: senderMap[msg.senderName] || userId,
      text: msg.text,
      timestamp: msg.timestamp,
      originalText: msg.originalText,
      wasTranslated: msg.wasTranslated,
      source: msg.source,
      readBy: chat.participants.map(p => ({ user: p }))
    }));

    // Use batch processor with rollback support
    const batchResult = await batchProcessor.processBatch(
      messagesToImport,
      chatId,
      {
        batchSize: 1000,
        enableRollback: enableRollback === 'true' || enableRollback === true,
        progressCallback: (progress) => {
          console.log(`Batch Processing: ${progress.percentage}% (${progress.processed}/${progress.total})`);
        },
        metadata: {
          fileName: req.file.originalname,
          format: format,
          dateRange: dateRange,
          importId: new Date().getTime().toString() // Simple import ID
        }
      }
    );

    // Clean up uploaded file
    if (req.cleanupUploadedFile) {
      await req.cleanupUploadedFile();
    } else {
      fs.unlinkSync(req.file.path);
    }

    if (!batchResult.success) {
      return res.status(500).json({
        error: 'Batch processing failed',
        details: batchResult.error,
        rollbackInfo: batchResult.rollbackInfo
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        messagesImported: batchResult.importedMessages,
        messagesSkipped: batchResult.skippedMessages,
        totalProcessed: batchResult.processedMessages,
        dateRange: dateRange,
        senderBreakdown: senderCounts,
        format: format,
        errors: batchResult.errors,
        successRate: csvResult.stats.successRate,
        batchInfo: {
          totalBatches: batchResult.batches.length,
          successfulBatches: batchResult.batches.filter(b => b.errors.length === 0).length,
          failedBatches: batchResult.batches.filter(b => b.errors.length > 0).length
        },
        rollbackInfo: batchResult.rollbackInfo
      }
    });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    
    // Clean up file on error
    if (req.cleanupUploadedFile) {
      await req.cleanupUploadedFile();
    } else if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process CSV file',
      details: error.message 
    });
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId).populate('chat');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is participant in chat
    if (!message.chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to react to this message' });
    }

    await message.addReaction(userId, emoji);

    // Emit socket event for real-time update
    const socketManager = req.app.get('socketManager');
    if (socketManager) {
      socketManager.sendToRoom(message.chat._id, 'reaction_added', {
        messageId: message._id,
        emoji,
        userId,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const message = await Message.findById(messageId).populate('chat');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is participant in chat
    if (!message.chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to access this message' });
    }

    try {
      await message.editMessage(text.trim(), userId);
      await message.populate('sender', 'name avatar');

      // Emit socket event for real-time update
      const socketManager = req.app.get('socketManager');
      if (socketManager) {
        socketManager.sendToRoom(message.chat._id, 'message_edited', {
          messageId: message._id,
          newText: message.content.text,
          editedAt: message.metadata.editedAt,
          editedBy: userId
        });
      }

      res.status(200).json({
        success: true,
        message
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const message = await Message.findById(messageId).populate('chat');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is participant in chat
    if (!message.chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to access this message' });
    }

    try {
      await message.deleteMessage(userId);

      // Emit socket event for real-time update
      const socketManager = req.app.get('socketManager');
      if (socketManager) {
        socketManager.sendToRoom(message.chat._id, 'message_deleted', {
          messageId: message._id,
          deletedBy: userId
        });
      }

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Mark message as read
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const message = await Message.findById(messageId).populate('chat');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is participant in chat
    if (!message.chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to access this message' });
    }

    await message.markAsRead(userId);

    // Emit socket event for real-time update
    const socketManager = req.app.get('socketManager');
    if (socketManager) {
      socketManager.sendToRoom(message.chat._id, 'message_read', {
        messageId: message._id,
        readBy: userId,
        readAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Remove reaction from message
exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const message = await Message.findById(messageId).populate('chat');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is participant in chat
    if (!message.chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to react to this message' });
    }

    await message.removeReaction(userId);

    // Emit socket event for real-time update
    const socketManager = req.app.get('socketManager');
    if (socketManager) {
      socketManager.sendToRoom(message.chat._id, 'reaction_removed', {
        messageId: message._id,
        removedBy: userId
      });
    }

    res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
};

// Search messages in a chat
exports.searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q: searchTerm, page = 1, limit = 20 } = req.query;
    const userId = req.userId;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to search this chat' });
    }

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const messages = await Message.searchMessages(chatId, searchTerm.trim(), options);

    // Get total count for pagination
    const totalCount = await Message.countDocuments({
      chat: chatId,
      isDeleted: false,
      $text: { $search: searchTerm.trim() }
    });

    res.status(200).json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      },
      searchTerm: searchTerm.trim()
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

// Validate CSV file
exports.validateCsvFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.userId;
    const options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      encoding: req.body.encoding || 'utf8'
    };

    const validation = await csvService.validateCSVFile(req.file.path, options);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Error validating CSV file:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to validate CSV file' });
  }
};

// Preview CSV file content
exports.previewCsvFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.userId;
    const options = {
      encoding: req.body.encoding || 'utf8',
      maxRows: parseInt(req.body.maxRows) || 20
    };

    const validation = await csvService.validateCSVFile(req.file.path, options);
    
    if (!validation.isValid) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: 'CSV validation failed',
        validation
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      preview: validation.preview,
      detectedFormat: validation.detectedFormat,
      stats: validation.stats,
      warnings: validation.warnings
    });
  } catch (error) {
    console.error('Error previewing CSV file:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to preview CSV file' });
  }
};

// Download CSV template
exports.downloadCsvTemplate = async (req, res) => {
  try {
    const { format } = req.params;
    
    if (!format) {
      return res.status(400).json({ error: 'Format parameter is required' });
    }

    const supportedFormats = csvService.getSupportedFormats();
    if (!supportedFormats[format]) {
      return res.status(400).json({ 
        error: `Unsupported format: ${format}`,
        supportedFormats: Object.keys(supportedFormats)
      });
    }

    const template = csvService.generateCSVTemplate(format);
    const formatInfo = supportedFormats[format];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${format}_template.csv"`);
    res.setHeader('X-Format-Info', JSON.stringify(formatInfo));
    
    res.status(200).send(template);
  } catch (error) {
    console.error('Error generating CSV template:', error);
    res.status(500).json({ error: 'Failed to generate CSV template' });
  }
};

// Get supported CSV formats
exports.getSupportedFormats = async (req, res) => {
  try {
    const formats = csvService.getSupportedFormats();
    
    res.status(200).json({
      success: true,
      formats
    });
  } catch (error) {
    console.error('Error getting supported formats:', error);
    res.status(500).json({ error: 'Failed to get supported formats' });
  }
};

// Update chat metadata
exports.updateChatMetadata = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatName, anniversaryDate, relationshipStartDate, theme } = req.body;
    const userId = req.userId;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to update this chat' });
    }

    // Update allowed fields
    if (chatName) chat.chatName = chatName;
    if (anniversaryDate) chat.metadata.anniversaryDate = anniversaryDate;
    if (relationshipStartDate) chat.metadata.relationshipStartDate = relationshipStartDate;
    if (theme) chat.metadata.theme = theme;

    await chat.save();

    res.status(200).json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
};

// Rollback a CSV import
exports.rollbackCsvImport = async (req, res) => {
  try {
    const { chatId, importId } = req.params;
    const userId = req.userId;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to access this chat' });
    }

    // Check if import exists
    const importExists = chat.csvImports && chat.csvImports.some(imp => 
      imp.importId && imp.importId.toString() === importId
    );

    if (!importExists) {
      return res.status(404).json({ error: 'Import not found' });
    }

    // Perform rollback
    const rollbackResult = await batchProcessor.rollbackImport(chatId, importId);

    res.status(200).json({
      success: true,
      rollback: rollbackResult
    });

  } catch (error) {
    console.error('Error rolling back import:', error);
    res.status(500).json({ 
      error: 'Failed to rollback import',
      details: error.message 
    });
  }
};

// Get import statistics for a chat
exports.getImportStats = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to access this chat' });
    }

    const stats = await batchProcessor.getImportStats(chatId);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting import stats:', error);
    res.status(500).json({ 
      error: 'Failed to get import statistics',
      details: error.message 
    });
  }
};
