const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      allowEIO3: true
    });

    this.connectedUsers = new Map(); // userId -> socket
    this.userRooms = new Map(); // userId -> Set of room IDs
    this.roomUsers = new Map(); // roomId -> Set of user IDs
    this.typingUsers = new Map(); // chatId -> Set of typing user IDs
    this.typingTimeouts = new Map(); // userId -> timeout ID
    this.messageQueue = new Map(); // userId -> Array of queued messages
    this.deliveryConfirmations = new Map(); // messageId -> delivery status

    this.setupSocketAuth();
    this.setupEventHandlers();
    this.setupConnectionMonitoring();
  }

  setupSocketAuth() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket auth error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket);
      
      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      
      // Deliver queued messages for this user
      this.deliverQueuedMessages(socket.userId);
      
      // Handle joining chat rooms
      socket.on('join_chat', (chatId) => {
        this.joinChatRoom(socket, chatId);
      });

      // Handle leaving chat rooms
      socket.on('leave_chat', (chatId) => {
        this.leaveChatRoom(socket, chatId);
      });

      // Handle sending messages
      socket.on('send_message', (data, callback) => {
        this.handleMessage(socket, data, callback);
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle message reactions
      socket.on('add_reaction', (data) => {
        this.handleReaction(socket, data);
      });

      socket.on('remove_reaction', (data) => {
        this.handleRemoveReaction(socket, data);
      });

      // Handle message editing and deletion
      socket.on('edit_message', (data) => {
        this.handleEditMessage(socket, data);
      });

      socket.on('delete_message', (data) => {
        this.handleDeleteMessage(socket, data);
      });

      // Handle message read status
      socket.on('mark_read', (data) => {
        this.handleMarkRead(socket, data);
      });

      // Handle delivery confirmations
      socket.on('message_delivered', (data) => {
        this.handleMessageDelivered(socket, data);
      });

      // Handle user status updates
      socket.on('status_update', (status) => {
        this.handleStatusUpdate(socket, status);
      });

      // Handle connection health checks
      socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
          callback('pong');
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.user.name}:`, error);
      });
    });
  }

  joinChatRoom(socket, chatId) {
    try {
      socket.join(`chat_${chatId}`);
      
      // Track user rooms
      if (!this.userRooms.has(socket.userId)) {
        this.userRooms.set(socket.userId, new Set());
      }
      this.userRooms.get(socket.userId).add(chatId);

      // Track room users
      if (!this.roomUsers.has(chatId)) {
        this.roomUsers.set(chatId, new Set());
      }
      this.roomUsers.get(chatId).add(socket.userId);

      // Notify other users in the room
      socket.to(`chat_${chatId}`).emit('user_joined', {
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${socket.user.name} joined chat ${chatId}`);
    } catch (error) {
      console.error('Error joining chat room:', error);
      socket.emit('error', { message: 'Failed to join chat room' });
    }
  }

  leaveChatRoom(socket, chatId) {
    try {
      socket.leave(`chat_${chatId}`);
      
      // Update tracking
      if (this.userRooms.has(socket.userId)) {
        this.userRooms.get(socket.userId).delete(chatId);
      }
      
      if (this.roomUsers.has(chatId)) {
        this.roomUsers.get(chatId).delete(socket.userId);
      }

      // Notify other users in the room
      socket.to(`chat_${chatId}`).emit('user_left', {
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${socket.user.name} left chat ${chatId}`);
    } catch (error) {
      console.error('Error leaving chat room:', error);
    }
  }

  handleMessage(socket, data, callback) {
    try {
      const { chatId, message } = data;
      const messageId = message._id || this.generateMessageId();
      
      const messageData = {
        ...message,
        _id: messageId,
        sender: {
          _id: socket.userId,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        timestamp: new Date().toISOString(),
        deliveryStatus: 'sent'
      };

      // Get users in the chat room
      const roomUsers = this.getUsersInRoom(chatId);
      const offlineUsers = [];
      const onlineUsers = [];

      // Categorize users as online or offline
      roomUsers.forEach(userId => {
        if (userId !== socket.userId) { // Don't include sender
          if (this.isUserOnline(userId)) {
            onlineUsers.push(userId);
          } else {
            offlineUsers.push(userId);
          }
        }
      });

      // Send to online users immediately
      onlineUsers.forEach(userId => {
        const success = this.sendToUser(userId, 'new_message', messageData);
        if (success) {
          // Track delivery confirmation
          this.deliveryConfirmations.set(`${messageId}_${userId}`, {
            messageId,
            userId,
            status: 'delivered',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Queue message for offline users
      offlineUsers.forEach(userId => {
        this.queueMessage(userId, messageData);
      });

      // Send confirmation to sender
      if (typeof callback === 'function') {
        callback({
          success: true,
          messageId,
          deliveredTo: onlineUsers.length,
          queuedFor: offlineUsers.length
        });
      }

      console.log(`Message sent by ${socket.user.name} in chat ${chatId} - Delivered: ${onlineUsers.length}, Queued: ${offlineUsers.length}`);
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
      
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  }



  handleReaction(socket, data) {
    try {
      const { chatId, messageId, emoji } = data;
      
      socket.to(`chat_${chatId}`).emit('reaction_added', {
        messageId,
        emoji,
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  }

  handleMarkRead(socket, data) {
    try {
      const { chatId, messageId } = data;
      
      socket.to(`chat_${chatId}`).emit('message_read', {
        messageId,
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling mark read:', error);
    }
  }

  handleStatusUpdate(socket, status) {
    try {
      // Broadcast status update to all user's chat rooms
      if (this.userRooms.has(socket.userId)) {
        const userRooms = this.userRooms.get(socket.userId);
        userRooms.forEach(chatId => {
          socket.to(`chat_${chatId}`).emit('status_update', {
            userId: socket.userId,
            userName: socket.user.name,
            status,
            timestamp: new Date().toISOString()
          });
        });
      }
    } catch (error) {
      console.error('Error handling status update:', error);
    }
  }

  handleDisconnect(socket, reason) {
    try {
      console.log(`User ${socket.user.name} disconnected - Reason: ${reason}`);
      
      // Clear typing timeouts for this user
      if (this.typingTimeouts.has(socket.userId)) {
        clearTimeout(this.typingTimeouts.get(socket.userId));
        this.typingTimeouts.delete(socket.userId);
      }

      // Remove user from typing indicators
      this.typingUsers.forEach((typingSet, chatId) => {
        if (typingSet.has(socket.userId)) {
          typingSet.delete(socket.userId);
          // Notify others that user stopped typing
          socket.to(`chat_${chatId}`).emit('typing_stop', {
            userId: socket.userId,
            userName: socket.user.name,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Remove user from tracking
      this.connectedUsers.delete(socket.userId);
      
      // Notify all chat rooms about user leaving
      if (this.userRooms.has(socket.userId)) {
        const userRooms = this.userRooms.get(socket.userId);
        userRooms.forEach(chatId => {
          socket.to(`chat_${chatId}`).emit('user_offline', {
            userId: socket.userId,
            userName: socket.user.name,
            timestamp: new Date().toISOString()
          });
          
          // Remove from room tracking
          if (this.roomUsers.has(chatId)) {
            this.roomUsers.get(chatId).delete(socket.userId);
          }
        });
        
        // Clear user rooms
        this.userRooms.delete(socket.userId);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  // Helper methods
  getUsersInRoom(chatId) {
    return this.roomUsers.get(chatId) || new Set();
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  sendToUser(userId, event, data) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  sendToRoom(chatId, event, data) {
    this.io.to(`chat_${chatId}`).emit(event, data);
  }

  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getRoomStats(chatId) {
    const users = this.getUsersInRoom(chatId);
    return {
      totalUsers: users.size,
      onlineUsers: Array.from(users).filter(userId => this.isUserOnline(userId))
    };
  }

  // Connection monitoring and retry logic
  setupConnectionMonitoring() {
    // Monitor connection health
    setInterval(() => {
      this.connectedUsers.forEach((socket, userId) => {
        if (!socket.connected) {
          console.log(`Detected disconnected socket for user ${userId}, cleaning up`);
          this.connectedUsers.delete(userId);
        }
      });
    }, 30000); // Check every 30 seconds

    // Clean up old delivery confirmations (older than 1 hour)
    setInterval(() => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      this.deliveryConfirmations.forEach((confirmation, key) => {
        if (new Date(confirmation.timestamp).getTime() < oneHourAgo) {
          this.deliveryConfirmations.delete(key);
        }
      });
    }, 300000); // Clean every 5 minutes
  }

  // Message queuing for offline users
  queueMessage(userId, messageData) {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    
    const queue = this.messageQueue.get(userId);
    queue.push({
      ...messageData,
      queuedAt: new Date().toISOString()
    });

    // Limit queue size to prevent memory issues
    if (queue.length > 100) {
      queue.shift(); // Remove oldest message
    }

    console.log(`Message queued for offline user ${userId}`);
  }

  // Deliver queued messages when user comes online
  deliverQueuedMessages(userId) {
    if (this.messageQueue.has(userId)) {
      const queue = this.messageQueue.get(userId);
      const socket = this.connectedUsers.get(userId);
      
      if (socket && queue.length > 0) {
        console.log(`Delivering ${queue.length} queued messages to user ${userId}`);
        
        queue.forEach(messageData => {
          socket.emit('new_message', {
            ...messageData,
            deliveryStatus: 'delivered_from_queue'
          });
        });

        // Clear the queue
        this.messageQueue.delete(userId);
      }
    }
  }

  // Enhanced typing indicators with debouncing
  handleTypingStart(socket, data) {
    try {
      const { chatId } = data;
      
      // Clear existing timeout for this user
      if (this.typingTimeouts.has(socket.userId)) {
        clearTimeout(this.typingTimeouts.get(socket.userId));
      }

      // Add user to typing set
      if (!this.typingUsers.has(chatId)) {
        this.typingUsers.set(chatId, new Set());
      }
      this.typingUsers.get(chatId).add(socket.userId);

      // Broadcast typing start
      socket.to(`chat_${chatId}`).emit('typing_start', {
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });

      // Auto-stop typing after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        this.handleTypingStop(socket, { chatId });
      }, 3000);

      this.typingTimeouts.set(socket.userId, timeout);
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  }

  handleTypingStop(socket, data) {
    try {
      const { chatId } = data;
      
      // Clear timeout
      if (this.typingTimeouts.has(socket.userId)) {
        clearTimeout(this.typingTimeouts.get(socket.userId));
        this.typingTimeouts.delete(socket.userId);
      }

      // Remove user from typing set
      if (this.typingUsers.has(chatId)) {
        this.typingUsers.get(chatId).delete(socket.userId);
      }

      // Broadcast typing stop
      socket.to(`chat_${chatId}`).emit('typing_stop', {
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  }

  // Message delivery confirmation
  handleMessageDelivered(socket, data) {
    try {
      const { messageId, senderId } = data;
      
      // Update delivery confirmation
      const confirmationKey = `${messageId}_${socket.userId}`;
      if (this.deliveryConfirmations.has(confirmationKey)) {
        this.deliveryConfirmations.set(confirmationKey, {
          ...this.deliveryConfirmations.get(confirmationKey),
          status: 'read',
          readAt: new Date().toISOString()
        });
      }

      // Notify sender about delivery confirmation
      if (senderId && this.isUserOnline(senderId)) {
        this.sendToUser(senderId, 'message_delivery_confirmed', {
          messageId,
          confirmedBy: socket.userId,
          confirmedByName: socket.user.name,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error handling message delivered:', error);
    }
  }

  // Generate unique message ID
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get typing users for a chat
  getTypingUsers(chatId) {
    return Array.from(this.typingUsers.get(chatId) || []);
  }

  // Get delivery status for a message
  getDeliveryStatus(messageId) {
    const confirmations = [];
    this.deliveryConfirmations.forEach((confirmation, key) => {
      if (key.startsWith(`${messageId}_`)) {
        confirmations.push(confirmation);
      }
    });
    return confirmations;
  }

  // Force disconnect a user (admin function)
  forceDisconnectUser(userId, reason = 'Admin disconnect') {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.disconnect(reason);
      return true;
    }
    return false;
  }

  // Handle removing reactions
  handleRemoveReaction(socket, data) {
    try {
      const { chatId, messageId } = data;
      
      socket.to(`chat_${chatId}`).emit('reaction_removed', {
        messageId,
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling remove reaction:', error);
    }
  }

  // Handle message editing
  handleEditMessage(socket, data) {
    try {
      const { chatId, messageId, newText } = data;
      
      socket.to(`chat_${chatId}`).emit('message_edited', {
        messageId,
        newText,
        editedBy: socket.userId,
        editedByName: socket.user.name,
        editedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling edit message:', error);
    }
  }

  // Handle message deletion
  handleDeleteMessage(socket, data) {
    try {
      const { chatId, messageId } = data;
      
      socket.to(`chat_${chatId}`).emit('message_deleted', {
        messageId,
        deletedBy: socket.userId,
        deletedByName: socket.user.name,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling delete message:', error);
    }
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      totalRooms: this.roomUsers.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((total, queue) => total + queue.length, 0),
      activeTypingUsers: Array.from(this.typingUsers.values()).reduce((total, set) => total + set.size, 0),
      pendingDeliveryConfirmations: this.deliveryConfirmations.size
    };
  }
}

module.exports = SocketManager;