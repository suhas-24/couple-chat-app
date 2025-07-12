const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
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

    res.status(201).json({
      success: true,
      message
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

// Upload and parse CSV chat history
exports.uploadCsvChat = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { chatId } = req.body;
    const userId = req.userId;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ error: 'Not authorized to upload to this chat' });
    }

    const messages = [];
    const stats = {
      totalMessages: 0,
      dateRange: { start: null, end: null },
      senderCounts: {}
    };

    // Parse CSV file
    const results = await new Promise((resolve, reject) => {
      const parsedMessages = [];
      
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Assuming CSV format: timestamp, sender, message
          // Adjust based on actual CSV format
          if (row.timestamp && row.sender && row.message) {
            const messageDate = new Date(row.timestamp);
            
            parsedMessages.push({
              timestamp: messageDate,
              senderName: row.sender,
              text: row.message
            });

            // Update stats
            stats.totalMessages++;
            stats.senderCounts[row.sender] = (stats.senderCounts[row.sender] || 0) + 1;
            
            if (!stats.dateRange.start || messageDate < stats.dateRange.start) {
              stats.dateRange.start = messageDate;
            }
            if (!stats.dateRange.end || messageDate > stats.dateRange.end) {
              stats.dateRange.end = messageDate;
            }
          }
        })
        .on('end', () => resolve(parsedMessages))
        .on('error', reject);
    });

    // Map sender names to user IDs
    const participants = await User.find({ _id: { $in: chat.participants } });
    const senderMap = {};
    
    // Simple mapping - you might want to make this more sophisticated
    participants.forEach(user => {
      Object.keys(stats.senderCounts).forEach(senderName => {
        if (user.name.toLowerCase().includes(senderName.toLowerCase()) || 
            senderName.toLowerCase().includes(user.name.toLowerCase())) {
          senderMap[senderName] = user._id;
        }
      });
    });

    // Create messages in database
    const bulkOps = results.map(msg => ({
      insertOne: {
        document: {
          chat: chatId,
          sender: senderMap[msg.senderName] || userId, // Default to uploader if can't match
          content: {
            text: msg.text,
            type: 'text'
          },
          metadata: {
            importedFrom: {
              source: 'csv',
              originalTimestamp: msg.timestamp
            }
          },
          createdAt: msg.timestamp,
          readBy: chat.participants.map(p => ({ user: p }))
        }
      }
    }));

    if (bulkOps.length > 0) {
      await Message.bulkWrite(bulkOps);
    }

    // Update chat with import info
    await Chat.findByIdAndUpdate(chatId, {
      $push: {
        csvImports: {
          fileName: req.file.originalname,
          importedAt: new Date(),
          messageCount: stats.totalMessages,
          dateRange: stats.dateRange
        }
      }
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      stats: {
        messagesImported: stats.totalMessages,
        dateRange: stats.dateRange,
        senderBreakdown: stats.senderCounts
      }
    });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to process CSV file' });
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

    // Remove existing reaction from this user
    message.metadata.reactions = message.metadata.reactions.filter(
      r => r.user.toString() !== userId
    );

    // Add new reaction
    message.metadata.reactions.push({
      user: userId,
      emoji
    });

    await message.save();

    res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
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
