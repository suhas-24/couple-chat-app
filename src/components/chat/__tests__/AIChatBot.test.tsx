/**
 * AI Chat Bot Component Tests
 * Tests for the enhanced AI chat assistant interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatContext } from '@/context/ChatContext';
import { api } from '@/services/api';
import AIChatBot from '../AIChatBot';

// Mock the API
jest.mock('@/services/api', () => ({
  api: {
    ai: {
      askAboutChatHistory: jest.fn(),
      getWordFrequency: jest.fn(),
      getMessagesByDate: jest.fn(),
    }
  }
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock chat context
const mockChatContext = {
  currentChat: {
    _id: 'test-chat-id',
    participants: [],
    chatName: 'Test Chat',
    isActive: true,
    lastMessageAt: new Date().toISOString(),
    metadata: {
      theme: 'romantic' as const,
      relationshipStartDate: '2023-01-01',
      anniversaryDate: '2024-01-01'
    },
    createdAt: new Date().toISOString()
  },
  messages: [],
  sendMessage: jest.fn(),
  isLoading: false,
  error: null,
  hasMore: false,
  loadMoreMessages: jest.fn(),
  markAsRead: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn()
};

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <ChatContext.Provider value={mockChatContext}>
      {component}
    </ChatContext.Provider>
  );
};

describe('AIChatBot Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('renders floating button', () => {
      renderWithContext(<AIChatBot />);
      
      const button = screen.getByLabelText('AI Chat Assistant');
      expect(button).toBeInTheDocument();
    });

    test('opens and closes chat panel', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      const button = screen.getByLabelText('AI Chat Assistant');
      
      // Open chat
      await user.click(button);
      expect(screen.getByText('Relationship AI')).toBeInTheDocument();
      
      // Close chat
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Relationship AI')).not.toBeInTheDocument();
      });
    });

    test('displays welcome message when opened', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      const button = screen.getByLabelText('AI Chat Assistant');
      await user.click(button);
      
      expect(screen.getByText(/Hi there! 💕 I'm your relationship AI assistant/)).toBeInTheDocument();
    });
  });

  describe('Privacy Settings', () => {
    test('shows and hides settings panel', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      // Open chat
      const button = screen.getByLabelText('AI Chat Assistant');
      await user.click(button);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Settings');
      await user.click(settingsButton);
      
      expect(screen.getByText('Privacy & Settings')).toBeInTheDocument();
      expect(screen.getByText('Allow data analysis')).toBeInTheDocument();
      expect(screen.getByText('Cache AI responses')).toBeInTheDocument();
      expect(screen.getByText('Share insights for improvement')).toBeInTheDocument();
    });

    test('toggles privacy settings', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      // Open chat and settings
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      await user.click(screen.getByLabelText('Settings'));
      
      // Find checkboxes
      const dataAnalysisCheckbox = screen.getByRole('checkbox', { name: /Allow data analysis/i });
      const cacheCheckbox = screen.getByRole('checkbox', { name: /Cache AI responses/i });
      const shareCheckbox = screen.getByRole('checkbox', { name: /Share insights for improvement/i });
      
      // Initial states
      expect(dataAnalysisCheckbox).toBeChecked();
      expect(cacheCheckbox).toBeChecked();
      expect(shareCheckbox).not.toBeChecked();
      
      // Toggle settings
      await user.click(dataAnalysisCheckbox);
      await user.click(shareCheckbox);
      
      expect(dataAnalysisCheckbox).not.toBeChecked();
      expect(shareCheckbox).toBeChecked();
    });
  });

  describe('Message Handling', () => {
    test('sends general AI question', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        success: true,
        answer: 'This is an AI response about your chat history.'
      };
      
      (api.ai.askAboutChatHistory as jest.Mock).mockResolvedValue(mockResponse);
      
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Type and send message
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'Tell me about our relationship');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      // Wait for API call and response
      await waitFor(() => {
        expect(api.ai.askAboutChatHistory).toHaveBeenCalledWith('test-chat-id', 'Tell me about our relationship');
      });
      
      await waitFor(() => {
        expect(screen.getByText('This is an AI response about your chat history.')).toBeInTheDocument();
      });
    });

    test('handles word frequency questions', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        success: true,
        word: 'love',
        totalCount: 25,
        countByParticipant: {
          'User 1': 15,
          'User 2': 10
        }
      };
      
      (api.ai.getWordFrequency as jest.Mock).mockResolvedValue(mockResponse);
      
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Ask word frequency question
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'How many times have we said "love"?');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      // Wait for API call and response
      await waitFor(() => {
        expect(api.ai.getWordFrequency).toHaveBeenCalledWith('test-chat-id', 'love');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/I found that "love" has been mentioned 25 times/)).toBeInTheDocument();
        expect(screen.getByText('Word Frequency: "love"')).toBeInTheDocument();
      });
    });

    test('handles date-specific questions', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        success: true,
        date: 'Mon Feb 14 2024',
        messageCount: 12,
        messages: [
          { sender: 'User 1', content: 'Happy Valentine\'s Day!', time: '10:00 AM' },
          { sender: 'User 2', content: 'I love you so much!', time: '10:05 AM' }
        ],
        summary: 'You both exchanged loving Valentine\'s Day messages.'
      };
      
      (api.ai.getMessagesByDate as jest.Mock).mockResolvedValue(mockResponse);
      
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Ask date question
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'What did we talk about on Valentine\'s Day?');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      // Wait for API call and response
      await waitFor(() => {
        expect(api.ai.getMessagesByDate).toHaveBeenCalledWith('test-chat-id', '2024-02-14');
      });
      
      await waitFor(() => {
        expect(screen.getByText('You both exchanged loving Valentine\'s Day messages.')).toBeInTheDocument();
        expect(screen.getByText('12 messages exchanged')).toBeInTheDocument();
      });
    });

    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      (api.ai.askAboutChatHistory as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Send message that will fail
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'Test question');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/I'm having trouble answering that right now/)).toBeInTheDocument();
      });
    });
  });

  describe('Suggestion Chips', () => {
    test('clicking suggestion chips fills input', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Click suggestion chip
      const yesterdayChip = screen.getByText("Yesterday's chat");
      await user.click(yesterdayChip);
      
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      expect(input).toHaveValue("What did we talk about yesterday?");
    });

    test('all suggestion chips work', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      
      // Test love count chip
      await user.click(screen.getByText("Love count"));
      expect(input).toHaveValue("How many times have we said I love you?");
      
      // Clear and test first chat chip
      await user.clear(input);
      await user.click(screen.getByText("First chat"));
      expect(input).toHaveValue("What was our first conversation about?");
    });
  });

  describe('Conversation Management', () => {
    test('clears conversation when refresh button clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Verify welcome message exists
      expect(screen.getByText(/Hi there! 💕 I'm your relationship AI assistant/)).toBeInTheDocument();
      
      // Click refresh button
      const refreshButton = screen.getByLabelText('Clear conversation');
      await user.click(refreshButton);
      
      // Welcome message should be gone (conversation cleared)
      await waitFor(() => {
        expect(screen.queryByText(/Hi there! 💕 I'm your relationship AI assistant/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Interactions', () => {
    test('sends message on Enter key', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        success: true,
        answer: 'AI response'
      };
      
      (api.ai.askAboutChatHistory as jest.Mock).mockResolvedValue(mockResponse);
      
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Type message and press Enter
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'Test message{enter}');
      
      // Verify API was called
      await waitFor(() => {
        expect(api.ai.askAboutChatHistory).toHaveBeenCalledWith('test-chat-id', 'Test message');
      });
    });

    test('does not send message on Shift+Enter', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Type message and press Shift+Enter
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'Test message{shift>}{enter}{/shift}');
      
      // Verify API was not called
      expect(api.ai.askAboutChatHistory).not.toHaveBeenCalled();
      
      // Input should still contain the message
      expect(input).toHaveValue('Test message');
    });
  });

  describe('Loading States', () => {
    test('shows loading indicator while processing', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      (api.ai.askAboutChatHistory as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, answer: 'Response' }), 100))
      );
      
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Send message
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'Test question');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      // Should show loading indicator
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
      
      // Wait for response
      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    test('disables input and button while loading', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      (api.ai.askAboutChatHistory as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, answer: 'Response' }), 100))
      );
      
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Send message
      const input = screen.getByPlaceholderText('Ask me about your chat history...');
      await user.type(input, 'Test question');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      // Input should be disabled
      expect(input).toBeDisabled();
      
      // Wait for response
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      }, { timeout: 200 });
    });
  });

  describe('Edge Cases', () => {
    test('handles empty input gracefully', async () => {
      const user = userEvent.setup();
      renderWithContext(<AIChatBot />);
      
      // Open chat
      await user.click(screen.getByLabelText('AI Chat Assistant'));
      
      // Try to send empty message
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
      
      // API should not be called
      expect(api.ai.askAboutChatHistory).not.toHaveBeenCalled();
    });

    test('handles missing chat context', () => {
      const contextWithoutChat = {
        ...mockChatContext,
        currentChat: null
      };
      
      render(
        <ChatContext.Provider value={contextWithoutChat}>
          <AIChatBot />
        </ChatContext.Provider>
      );
      
      // Should still render the button
      expect(screen.getByLabelText('AI Chat Assistant')).toBeInTheDocument();
    });
  });
});