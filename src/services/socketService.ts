import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

interface Message {
  _id: string;
  content: {
    text: string;
    type: string;
  };
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: string;
}

interface UserStatus {
  userId: string;
  userName: string;
  status: 'online' | 'offline' | 'typing';
  timestamp: string;
}

class SocketService {
  private socket: Socket | null = null;
  private currentChatId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Event callbacks
  private messageCallback?: (message: Message) => void;
  private typingCallback?: (users: TypingUser[]) => void;
  private statusCallback?: (status: UserStatus) => void;
  private connectionCallback?: (connected: boolean) => void;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const token = Cookies.get('auth-token');
    
    if (!token) {
      console.error('No auth token found, cannot connect to socket');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.reconnectAttempts = 0;
      this.connectionCallback?.(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      this.connectionCallback?.(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.connectionCallback?.(false);
      }
    });

    // Message events
    this.socket.on('new_message', (message: Message) => {
      this.messageCallback?.(message);
    });

    // Typing events
    this.socket.on('typing_start', (data: TypingUser) => {
      this.typingCallback?.([data]);
    });

    this.socket.on('typing_stop', (data: TypingUser) => {
      this.typingCallback?.([]);
    });

    // Status events
    this.socket.on('user_joined', (data: UserStatus) => {
      this.statusCallback?.({ ...data, status: 'online' });
    });

    this.socket.on('user_left', (data: UserStatus) => {
      this.statusCallback?.({ ...data, status: 'offline' });
    });

    this.socket.on('user_offline', (data: UserStatus) => {
      this.statusCallback?.({ ...data, status: 'offline' });
    });

    this.socket.on('status_update', (data: UserStatus) => {
      this.statusCallback?.(data);
    });

    // Reaction events
    this.socket.on('reaction_added', (data) => {
      // Handle reaction updates
      console.log('Reaction added:', data);
    });

    // Read receipt events
    this.socket.on('message_read', (data) => {
      // Handle read receipts
      console.log('Message read:', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Connection management
  connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    } else {
      this.initializeSocket();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Chat room management
  joinChat(chatId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    this.currentChatId = chatId;
    this.socket.emit('join_chat', chatId);
  }

  leaveChat(chatId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('leave_chat', chatId);
    
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
  }

  // Message handling
  sendMessage(chatId: string, message: any) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('send_message', { chatId, message });
  }

  // Typing indicators
  startTyping(chatId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_start', { chatId });
  }

  stopTyping(chatId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_stop', { chatId });
  }

  // Reactions
  addReaction(chatId: string, messageId: string, emoji: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('add_reaction', { chatId, messageId, emoji });
  }

  // Read receipts
  markAsRead(chatId: string, messageId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('mark_read', { chatId, messageId });
  }

  // Status updates
  updateStatus(status: 'online' | 'offline' | 'away') {
    if (!this.socket?.connected) return;
    this.socket.emit('status_update', status);
  }

  // Event listeners
  onMessage(callback: (message: Message) => void) {
    this.messageCallback = callback;
  }

  onTyping(callback: (users: TypingUser[]) => void) {
    this.typingCallback = callback;
  }

  onStatusChange(callback: (status: UserStatus) => void) {
    this.statusCallback = callback;
  }

  onConnection(callback: (connected: boolean) => void) {
    this.connectionCallback = callback;
  }

  // Cleanup
  removeAllListeners() {
    this.messageCallback = undefined;
    this.typingCallback = undefined;
    this.statusCallback = undefined;
    this.connectionCallback = undefined;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;