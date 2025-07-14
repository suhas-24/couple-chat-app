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
  deliveryStatus?: 'sent' | 'delivered' | 'delivered_from_queue' | 'read';
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

interface DeliveryConfirmation {
  messageId: string;
  confirmedBy: string;
  confirmedByName: string;
  timestamp: string;
}

interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private currentChatId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = { connected: false, reconnecting: false };
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private pendingMessages = new Map<string, any>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Event callbacks
  private messageCallback?: (message: Message) => void;
  private typingCallback?: (users: TypingUser[]) => void;
  private statusCallback?: (status: UserStatus) => void;
  private connectionCallback?: (state: ConnectionState) => void;
  private deliveryCallback?: (confirmation: DeliveryConfirmation) => void;
  private errorCallback?: (error: string) => void;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const token = Cookies.get('auth-token');
    
    if (!token) {
      console.error('No auth token found, cannot connect to socket');
      this.updateConnectionState({ connected: false, reconnecting: false, error: 'No auth token' });
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: false, // We'll handle reconnection manually
      timeout: 20000,
      forceNew: true
    });

    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
      this.updateConnectionState({ connected: true, reconnecting: false });
      
      // Clear reconnect timer if it exists
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Rejoin current chat if we were in one
      if (this.currentChatId) {
        this.socket?.emit('join_chat', this.currentChatId);
      }

      // Resend any pending messages
      this.resendPendingMessages();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      this.updateConnectionState({ connected: false, reconnecting: false });
      
      // Start reconnection process unless it was intentional
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      const errorMessage = error.message || 'Connection failed';
      this.updateConnectionState({ 
        connected: false, 
        reconnecting: this.reconnectAttempts < this.maxReconnectAttempts,
        error: errorMessage 
      });
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        console.error('Max reconnection attempts reached');
        this.errorCallback?.('Failed to connect after multiple attempts');
      }
    });

    // Message events
    this.socket.on('new_message', (message: Message) => {
      // Send delivery confirmation
      if (message._id && message.sender._id) {
        this.socket?.emit('message_delivered', {
          messageId: message._id,
          senderId: message.sender._id
        });
      }
      
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

    // Delivery confirmation events
    this.socket.on('message_delivery_confirmed', (data: DeliveryConfirmation) => {
      this.deliveryCallback?.(data);
    });

    // Message operation events
    this.socket.on('message_edited', (data) => {
      console.log('Message edited:', data);
      // Handle message edit in UI
    });

    this.socket.on('message_deleted', (data) => {
      console.log('Message deleted:', data);
      // Handle message deletion in UI
    });

    // Reaction events
    this.socket.on('reaction_added', (data) => {
      console.log('Reaction added:', data);
      // Handle reaction addition in UI
    });

    this.socket.on('reaction_removed', (data) => {
      console.log('Reaction removed:', data);
      // Handle reaction removal in UI
    });

    // Read receipt events
    this.socket.on('message_read', (data) => {
      console.log('Message read:', data);
      // Handle read receipt in UI
    });

    // Heartbeat response
    this.socket.on('pong', () => {
      // Connection is alive
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.errorCallback?.(error.message || 'Socket error occurred');
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

  // Message operations
  editMessage(chatId: string, messageId: string, newText: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('edit_message', { chatId, messageId, newText });
  }

  deleteMessage(chatId: string, messageId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('delete_message', { chatId, messageId });
  }

  // Reactions
  addReaction(chatId: string, messageId: string, emoji: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('add_reaction', { chatId, messageId, emoji });
  }

  removeReaction(chatId: string, messageId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('remove_reaction', { chatId, messageId });
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

  // Private helper methods
  private updateConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.connectionCallback?.(state);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionState({ 
        connected: false, 
        reconnecting: false, 
        error: 'Max reconnection attempts reached' 
      });
      return;
    }

    this.updateConnectionState({ connected: false, reconnecting: true });

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts + 1})`);
      this.initializeSocket();
    }, delay);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', (response: string) => {
          if (response !== 'pong') {
            console.warn('Heartbeat failed, connection may be unstable');
          }
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private resendPendingMessages() {
    if (this.pendingMessages.size === 0) return;

    console.log(`Resending ${this.pendingMessages.size} pending messages`);
    
    this.pendingMessages.forEach((messageData, messageId) => {
      if (this.socket?.connected) {
        this.socket.emit('send_message', messageData, (response: any) => {
          if (response?.success) {
            this.pendingMessages.delete(messageId);
          }
        });
      }
    });
  }

  // Enhanced message handling with retry logic
  sendMessageWithRetry(chatId: string, message: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        // Queue message for later if not connected
        const messageId = message._id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.pendingMessages.set(messageId, { chatId, message });
        console.log('Message queued for sending when connection is restored');
        resolve(false);
        return;
      }

      this.socket.emit('send_message', { chatId, message }, (response: any) => {
        if (response?.success) {
          resolve(true);
        } else {
          // Queue for retry
          const messageId = message._id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          this.pendingMessages.set(messageId, { chatId, message });
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }

  // Enhanced typing indicators with debouncing
  startTypingWithDebounce(chatId: string) {
    if (!this.socket?.connected) return;

    // Clear existing timeout
    const timeoutKey = `typing_${chatId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
    }

    // Send typing start
    this.socket.emit('typing_start', { chatId });

    // Auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      this.stopTyping(chatId);
      this.typingTimeouts.delete(timeoutKey);
    }, 3000);

    this.typingTimeouts.set(timeoutKey, timeout);
  }

  // Get connection state
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Force reconnect
  forceReconnect() {
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.disconnect();
    }
    this.initializeSocket();
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

  onConnection(callback: (state: ConnectionState) => void) {
    this.connectionCallback = callback;
  }

  onDeliveryConfirmation(callback: (confirmation: DeliveryConfirmation) => void) {
    this.deliveryCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.errorCallback = callback;
  }

  // Cleanup
  removeAllListeners() {
    this.messageCallback = undefined;
    this.typingCallback = undefined;
    this.statusCallback = undefined;
    this.connectionCallback = undefined;
    this.deliveryCallback = undefined;
    this.errorCallback = undefined;
  }

  // Cleanup resources
  destroy() {
    this.removeAllListeners();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();

    this.pendingMessages.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;