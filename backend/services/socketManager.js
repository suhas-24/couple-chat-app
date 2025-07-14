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
      transports: ['websocket', 'polling']
    });

    this.connectedUsers = new Map(); // userId -> socket
    this.userRooms = new Map(); // userId -> Set of room IDs
    this.roomUsers = new Map(); // roomId -> Set of user IDs

    this.setupSocketAuth();
    this.setupEventHandlers();
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
      
      // Handle joining chat rooms
      socket.on('join_chat', (chatId) => {
        this.joinChatRoom(socket, chatId);
      });

      // Handle leaving chat rooms
      socket.on('leave_chat', (chatId) => {
        this.leaveChatRoom(socket, chatId);
      });

      // Handle sending messages
      socket.on('send_message', (data) => {
        this.handleMessage(socket, data);
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

      // Handle message read status
      socket.on('mark_read', (data) => {
        this.handleMarkRead(socket, data);
      });

      // Handle user status updates
      socket.on('status_update', (status) => {
        this.handleStatusUpdate(socket, status);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
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

  handleMessage(socket, data) {
    try {
      const { chatId, message } = data;
      
      // Broadcast message to all users in the chat room
      socket.to(`chat_${chatId}`).emit('new_message', {
        ...message,
        sender: {
          _id: socket.userId,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        timestamp: new Date().toISOString()
      });

      console.log(`Message sent by ${socket.user.name} in chat ${chatId}`);
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  handleTypingStart(socket, data) {
    try {
      const { chatId } = data;
      
      socket.to(`chat_${chatId}`).emit('typing_start', {
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  }

  handleTypingStop(socket, data) {
    try {
      const { chatId } = data;
      
      socket.to(`chat_${chatId}`).emit('typing_stop', {
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
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

  handleDisconnect(socket) {
    try {
      console.log(`User ${socket.user.name} disconnected`);
      
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
}

module.exports = SocketManager;