import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, Chat, Message } from '@/services/api';
import { useAuth } from './AuthContext';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  unreadCount: number;
  setCurrentChat: (chat: Chat | null) => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string, page?: number) => Promise<void>;
  sendMessage: (text: string, type?: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  uploadCSV: (file: File) => Promise<void>;
  updateChatMetadata: (metadata: Partial<Chat['metadata']> & { chatName?: string }) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Load user's chats
  const loadChats = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.chat.getUserChats();
      if (response.success) {
        setChats(response.chats);
        // Calculate unread count
        const unread = response.chats.reduce((count, chat) => {
          return count + (chat.unreadCount || 0);
        }, 0);
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for a chat
  const loadMessages = useCallback(async (chatId: string, page: number = 1) => {
    try {
      setLoading(true);
      const response = await api.chat.getMessages(chatId, page);
      
      if (response.success) {
        if (page === 1) {
          setMessages(response.messages);
        } else {
          // Append older messages for pagination
          setMessages(prev => [...response.messages, ...prev]);
        }
        setHasMore(response.hasMore);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (text: string, type: string = 'text') => {
    if (!currentChat) return;
    
    try {
      const response = await api.chat.sendMessage(currentChat._id, text, type);
      
      if (response.success) {
        setMessages(prev => [...prev, response.message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [currentChat]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await api.chat.addReaction(messageId, emoji);
      
      if (response.success) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId ? response.message : msg
          )
        );
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, []);

  // Upload CSV
  const uploadCSV = useCallback(async (file: File) => {
    if (!currentChat) return;
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', currentChat._id);
      const response = await api.chat.uploadCsv(formData);
      
      if (response.success) {
        // Reload messages to show imported ones
        await loadMessages(currentChat._id);
        return response.stats;
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentChat, loadMessages]);

  // Update chat metadata
  const updateChatMetadata = useCallback(async (
    metadata: Partial<Chat['metadata']> & { chatName?: string }
  ) => {
    if (!currentChat) return;
    
    try {
      const response = await api.chat.updateChatMetadata(currentChat._id, metadata);
      
      if (response.success) {
        setCurrentChat(response.chat);
        setChats(prev => 
          prev.map(chat => 
            chat._id === currentChat._id ? response.chat : chat
          )
        );
      }
    } catch (error) {
      console.error('Error updating chat metadata:', error);
      throw error;
    }
  }, [currentChat]);

  // Load chats on mount
  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, loadChats]);

  const value = {
    chats,
    currentChat,
    messages,
    loading,
    hasMore,
    unreadCount,
    setCurrentChat,
    loadChats,
    loadMessages,
    sendMessage,
    addReaction,
    uploadCSV,
    updateChatMetadata
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
