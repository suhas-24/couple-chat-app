// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface Chat {
  _id: string;
  participants: User[];
  chatName: string;
  isActive: boolean;
  lastMessageAt: string;
  metadata: {
    anniversaryDate?: string;
    relationshipStartDate?: string;
    theme: 'classic' | 'modern' | 'playful' | 'romantic';
  };
  createdAt: string;
}

export interface Message {
  _id: string;
  chat: string;
  sender: User;
  content: {
    text: string;
    type: 'text' | 'emoji' | 'image' | 'voice' | 'love-note';
  };
  metadata: {
    isEdited: boolean;
    editedAt?: string;
    reactions: Array<{
      user: string;
      emoji: string;
      reactedAt: string;
    }>;
    sentiment?: 'positive' | 'neutral' | 'negative' | 'romantic';
  };
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  isDeleted: boolean;
  createdAt: string;
}

export interface ChatStats {
  totalMessages: number;
  messagesBySender: Array<{
    sender: { id: string; name: string };
    count: number;
    firstMessage: string;
    lastMessage: string;
  }>;
  messageTypes: Array<{ _id: string; count: number }>;
  dailyMessages: Array<{ _id: string; count: number }>;
  avgMessagesPerDay: number;
  hourlyActivity: Array<{ _id: number; count: number }>;
  sentimentStats: Array<{ _id: string; count: number }>;
}

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Something went wrong');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  signup: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  googleLogin: async (credential: string): Promise<AuthResponse> => {
    return apiCall('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const response = await apiCall<{ success: boolean; user: User }>(
        `/auth/user-by-email/${encodeURIComponent(email)}`
      );
      return response.success ? response.user : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }
};

// Chat API
export const chatAPI = {
  createOrGetChat: async (partnerIdOrEmail: string, chatName?: string): Promise<{ success: boolean; chat: Chat }> => {
    // Determine if it's an email or ID
    const isEmail = partnerIdOrEmail.includes('@');
    const payload = isEmail 
      ? { partnerEmail: partnerIdOrEmail, chatName }
      : { partnerId: partnerIdOrEmail, chatName };
    
    return apiCall('/chat/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getUserChats: async (): Promise<{ success: boolean; chats: Chat[] }> => {
    return apiCall('/chat/user-chats');
  },

  getMessages: async (
    chatId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ success: boolean; messages: Message[]; page: number; hasMore: boolean }> => {
    return apiCall(`/chat/${chatId}/messages?page=${page}&limit=${limit}`);
  },

  sendMessage: async (
    chatId: string,
    text: string,
    type: string = 'text'
  ): Promise<{ success: boolean; message: Message }> => {
    return apiCall('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ chatId, text, type })
    });
  },

  addReaction: async (
    messageId: string,
    emoji: string
  ): Promise<{ success: boolean; message: Message }> => {
    return apiCall(`/chat/message/${messageId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  },

  uploadCSV: async (
    chatId: string,
    file: File
  ): Promise<{ success: boolean; stats: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/chat/upload-csv`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload CSV');
    }

    return response.json();
  },

  updateChatMetadata: async (
    chatId: string,
    metadata: Partial<Chat['metadata']> & { chatName?: string }
  ): Promise<{ success: boolean; chat: Chat }> => {
    return apiCall(`/chat/${chatId}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(metadata)
    });
  }
};

// Analytics API
export const analyticsAPI = {
  getChatStats: async (chatId: string): Promise<{ success: boolean; stats: ChatStats }> => {
    return apiCall(`/analytics/${chatId}/stats`);
  },

  getWordCloud: async (
    chatId: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    wordCloud: {
      topWords: Array<{ word: string; count: number }>;
      totalUniqueWords: number;
      topWordsBySender: Record<string, Array<{ word: string; count: number }>>;
    };
  }> => {
    return apiCall(`/analytics/${chatId}/wordcloud?limit=${limit}`);
  },

  getTimeline: async (
    chatId: string,
    params: {
      startDate?: string;
      endDate?: string;
      groupBy?: 'hour' | 'day' | 'week' | 'month';
    } = {}
  ): Promise<{
    success: boolean;
    timeline: {
      data: Array<{
        _id: string;
        totalMessages: number;
        messagesBySender: Array<{
          sender: string;
          count: number;
          avgLength: number;
        }>;
      }>;
      specialMoments: Array<{ _id: string; count: number }>;
      groupBy: string;
      dateRange: { start: string; end: string };
    };
  }> => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/analytics/${chatId}/timeline?${queryParams}`);
  },

  getMilestones: async (
    chatId: string
  ): Promise<{
    success: boolean;
    milestones: Array<{
      type: string;
      date: string;
      description: string;
      count?: number;
      streakDays?: number;
    }>;
    metadata: Chat['metadata'];
  }> => {
    return apiCall(`/analytics/${chatId}/milestones`);
  },

  getEmojiStats: async (
    chatId: string
  ): Promise<{
    success: boolean;
    emojiStats: {
      topEmojis: Array<{ emoji: string; count: number }>;
      topReactions: Array<{ emoji: string; count: number }>;
      totalUniqueEmojis: number;
      emojiBySender: Record<string, Record<string, number>>;
    };
  }> => {
    return apiCall(`/analytics/${chatId}/emoji-stats`);
  }
};

// AI API
export const aiAPI = {
  getRelationshipInsights: async (
    chatId: string
  ): Promise<{
    success: boolean;
    insights: {
      healthScore: number;
      communicationPatterns: string[];
      positiveObservations: string[];
      areasForGrowth: string[];
      suggestions: string[];
    };
    stats: any;
  }> => {
    return apiCall(`/ai/${chatId}/relationship-insights`);
  },

  getConversationStarters: async (
    chatId: string
  ): Promise<{
    success: boolean;
    conversationStarters: string[];
    basedOn: {
      recentTopics: string[];
      metadata: Chat['metadata'];
    };
  }> => {
    return apiCall(`/ai/${chatId}/conversation-starters`);
  },

  getEmojiInsights: async (
    chatId: string
  ): Promise<{
    success: boolean;
    emojiInsights: {
      analysis: string;
      insights: string[];
    };
    topEmojis: Array<{ emoji: string; count: number }>;
  }> => {
    return apiCall(`/ai/${chatId}/emoji-insights`);
  },

  getDateIdeas: async (
    chatId: string,
    location: string = 'local'
  ): Promise<{
    success: boolean;
    dateIdeas: Array<{
      title: string;
      description: string;
      conversationTopics: string[];
    }>;
    basedOn: {
      detectedInterests: string[];
      location: string;
    };
  }> => {
    return apiCall(`/ai/${chatId}/date-ideas?location=${location}`);
  },

  getMemorySummary: async (
    chatId: string,
    timeframe: 'last week' | 'last month' | 'last year' = 'last month'
  ): Promise<{
    success: boolean;
    memorySummary: {
      summary: string;
      highlights: string[];
    };
    timeframe: string;
    messageCount: number;
  }> => {
    return apiCall(`/ai/${chatId}/memory-summary?timeframe=${timeframe}`);
  }
};

// Export all APIs
export const api = {
  auth: authAPI,
  chat: chatAPI,
  analytics: analyticsAPI,
  ai: aiAPI
};
