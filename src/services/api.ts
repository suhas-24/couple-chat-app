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
  user: User;
}

export interface Chat {
  _id: string;
  participants: User[];
  chatName: string;
  isActive: boolean;
  lastMessageAt: string;
  unreadCount?: number;
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

// Helper function to get auth headers (no longer needed for cookie auth)
const getAuthHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
  };
};

// Enhanced API call function with retry logic and error handling
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  retryConfig: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = retryConfig;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include', // Include cookies
        headers: {
          ...getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        const error = new Error(errorData.error || 'Something went wrong');
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        
        // Don't retry client errors (4xx), only server errors (5xx) and network errors
        if (response.status < 500) {
          throw error;
        }
        
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's not a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // This is likely a network error, retry
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }

  throw lastError!;
}

// Enhanced API call with offline queue support
async function apiCallWithQueue<T>(
  endpoint: string,
  options: RequestInit = {},
  queueData?: { type: string; data: any }
): Promise<T> {
  try {
    return await apiCall<T>(endpoint, options);
  } catch (error) {
    // If offline and queue data provided, add to offline queue
    if (!navigator.onLine && queueData) {
      // This would integrate with the offline queue hook
      console.log('Adding to offline queue:', queueData);
      throw new Error('Request queued for when you\'re back online');
    }
    throw error;
  }
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
    // No need to clear localStorage anymore since we're using cookies
    // The server will clear the httpOnly cookie
  },

  getCurrentUser: async (): Promise<AuthResponse | null> => {
    try {
      const response = await apiCall<AuthResponse>('/auth/me');
      return response;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
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

  uploadCsv: async (formData: FormData): Promise<{ success: boolean; stats: any }> => {
    const response = await fetch(`${API_BASE_URL}/chat/upload-csv`, {
      method: 'POST',
      credentials: 'include', // Include cookies for authentication
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
  getChatStats: async (
    chatId: string, 
    params: {
      startDate?: string;
      endDate?: string;
      includeWordAnalysis?: string;
      includeActivityPatterns?: string;
      includeMilestones?: string;
    } = {}
  ): Promise<{ 
    success: boolean; 
    data: any;
    cached?: boolean;
  }> => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/analytics/${chatId}/stats?${queryParams}`);
  },

  getWordCloud: async (
    chatId: string,
    params: {
      limit?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    success: boolean;
    data: {
      topWords: Array<{ word: string; count: number }>;
      totalUniqueWords: number;
      topWordsBySender: Record<string, Array<{ word: string; count: number }>>;
      emojiUsage: Record<string, number>;
      topPhrases: Array<{ phrase: string; count: number }>;
      languageDistribution: Record<string, number>;
      sentiment: Record<string, number>;
    };
    cached?: boolean;
  }> => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/analytics/${chatId}/wordcloud?${queryParams}`);
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
    data: {
      data: Array<{ date: string; messageCount: number }>;
      hourlyActivity: number[];
      dailyActivity: Record<string, number>;
      monthlyActivity: Record<string, number>;
      mostActiveHour: number;
      mostActiveDay: string;
      groupBy: string;
      dateRange: { start: string; end: string };
    };
    cached?: boolean;
  }> => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/analytics/${chatId}/timeline?${queryParams}`);
  },

  getMilestones: async (
    chatId: string
  ): Promise<{
    success: boolean;
    data: {
      milestones: Array<{
        type: string;
        date: string;
        description: string;
        significance: 'low' | 'medium' | 'high';
        messageCount?: number;
        participants?: string[];
      }>;
      metadata: Chat['metadata'];
      totalMessages: number;
      dateRange: { start: string; end: string };
    };
    cached?: boolean;
  }> => {
    return apiCall(`/analytics/${chatId}/milestones`);
  },

  invalidateCache: async (chatId: string): Promise<{ success: boolean; message: string }> => {
    return apiCall(`/analytics/${chatId}/invalidate-cache`, {
      method: 'POST'
    });
  },

  getCacheStats: async (): Promise<{
    success: boolean;
    cacheStats: {
      totalEntries: number;
      validEntries: number;
      expiredEntries: number;
      memoryUsage: number;
    };
  }> => {
    return apiCall('/analytics/cache-stats');
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
  },

  /* ------------------------------------------------------------------
   * 🗣️  Conversational AI Assistant Endpoints
   * ------------------------------------------------------------------ */

  /**
   * Ask the AI a free-form question about the chat history
   * (e.g. “What did we do on this day?”).
   */
  askAboutChatHistory: async (
    chatId: string,
    question: string
  ): Promise<{
    success: boolean;
    answer: string;
    metadata?: any;
  }> => {
    try {
      const response = await apiCall(`/ai/chat/${chatId}/ask`, {
        method: 'POST',
        body: JSON.stringify({ question })
      });
      return response;
    } catch (error: any) {
      console.error('AI API Error:', error);
      return {
        success: false,
        answer: "I'm having trouble connecting to the AI service right now. Please try again in a moment! 🌴",
        metadata: { error: error.message }
      };
    }
  },

  /**
   * Get the frequency of a given word/phrase inside the chat history.
   */
  getWordFrequency: async (
    chatId: string,
    word: string
  ): Promise<{
    success: boolean;
    word: string;
    totalCount: number;
    countByParticipant: Record<string, number>;
    messagesAnalyzed: number;
  }> => {
    return apiCall(
      `/ai/chat/${chatId}/word-frequency?word=${encodeURIComponent(word)}`
    );
  },

  /**
   * Retrieve all messages (and an AI summary) for a specific calendar date.
   * Date must be supplied in YYYY-MM-DD format.
   */
  getMessagesByDate: async (
    chatId: string,
    dateISO: string
  ): Promise<{
    success: boolean;
    date: string;
    messageCount: number;
    messages: Array<{
      sender: string;
      content: string;
      time: string;
    }>;
    summary: string;
  }> => {
    return apiCall(
      `/ai/chat/${chatId}/messages-by-date?date=${encodeURIComponent(dateISO)}`
    );
  }
};

// Export all APIs
export const api = {
  auth: authAPI,
  chat: chatAPI,
  analytics: analyticsAPI,
  ai: aiAPI
};
