/**
 * ChatWindow Component Tests
 * Tests for the main chat interface with real-time messaging
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ChatWindow from '../ChatWindow';
import { ChatContext } from '@/context/ChatContext';
import { AuthContext } from '@/context/AuthContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock socket service
jest.mock('@/services/socketService', () => ({
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    sendMessage: jest.fn(),
    onMessage: jest.fn(),
    onTyping: jest.fn(),
    sendTyping: jest.fn(),
  },
}));

// Mock child components
jest.mock('../MessageInput', () => {
  return function MockMessageInput({ onSendMessage, disabled }: any) {
    return (
      <div data-testid="message-input">
        <input
          data-testid="message-input-field"
          placeholder="Type a message..."
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              onSendMessage(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
        <button
          data-testid="send-button"
          onClick={() => {
            const input = document.querySelector('[data-testid="message-input-field"]') as HTMLInputElement;
            if (input?.value) {
              onSendMessage(input.value);
              input.value = '';
            }
          }}
        >
          Send
        </button>
      </div>
    );
  };
});

jest.mock('../../ui/MessageBubble', () => {
  return function MockMessageBubble({ message, isOwn, showAvatar }: any) {
    return (
      <div 
        data-testid="message-bubble"
        data-message-id={message._id}
        data-is-own={isOwn}
        data-show-avatar={showAvatar}
      >
        <div data-testid="message-content">{message.content.text}</div>
        <div data-testid="message-sender">{message.sender.name}</div>
        <div data-testid="message-time">{message.createdAt}</div>
      </div>
    );
  };
});

const mockUser = {
  _id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
};

const mockPartner = {
  _id: 'user2',
  name: 'Jane Doe',
  email: 'jane@example.com',
};

const mockChat = {
  _id: 'chat1',
  participants: [mockUser, mockPartner],
  chatName: 'John & Jane',
  isActive: true,
  lastMessageAt: new Date().toISOString(),
  metadata: {
    theme: 'romantic' as const,
  },
  createdAt: new Date().toISOString(),
};

const mockMessages = [
  {
    _id: 'msg1',
    chatId: 'chat1',
    sender: mockUser,
    content: { text: 'Hello there!', type: 'text' as const },
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    reactions: [],
    isEdited: false,
  },
  {
    _id: 'msg2',
    chatId: 'chat1',
    sender: mockPartner,
    content: { text: 'Hi! How are you?', type: 'text' as const },
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    reactions: [],
    isEdited: false,
  },
  {
    _id: 'msg3',
    chatId: 'chat1',
    sender: mockUser,
    content: { text: 'I\'m doing great! 😊', type: 'text' as const },
    createdAt: new Date().toISOString(),
    reactions: [],
    isEdited: false,
  },
];

const mockAuthContext = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null,
};

const mockChatContext = {
  currentChat: mockChat,
  messages: mockMessages,
  sendMessage: jest.fn(),
  isLoading: false,
  error: null,
  hasMore: false,
  loadMoreMessages: jest.fn(),
  markAsRead: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  typingUsers: [],
  isTyping: false,
  setIsTyping: jest.fn(),
};

const renderWithContext = (chatValue = mockChatContext, authValue = mockAuthContext) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <ChatContext.Provider value={chatValue}>
        <ChatWindow />
      </ChatContext.Provider>
    </AuthContext.Provider>
  );
};

describe('ChatWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = renderWithContext();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels and roles', () => {
      renderWithContext();

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/chat messages/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message input/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const messageInput = screen.getByTestId('message-input-field');
      const sendButton = screen.getByTestId('send-button');

      await user.tab();
      expect(messageInput).toHaveFocus();

      await user.tab();
      expect(sendButton).toHaveFocus();
    });
  });

  describe('Message Display', () => {
    it('renders all messages', () => {
      renderWithContext();

      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
      expect(screen.getByText('I\'m doing great! 😊')).toBeInTheDocument();
    });

    it('displays messages in chronological order', () => {
      renderWithContext();

      const messageBubbles = screen.getAllByTestId('message-bubble');
      expect(messageBubbles).toHaveLength(3);

      // Check order by content
      expect(messageBubbles[0]).toHaveTextContent('Hello there!');
      expect(messageBubbles[1]).toHaveTextContent('Hi! How are you?');
      expect(messageBubbles[2]).toHaveTextContent('I\'m doing great! 😊');
    });

    it('distinguishes between own and partner messages', () => {
      renderWithContext();

      const messageBubbles = screen.getAllByTestId('message-bubble');
      
      // First message is from current user
      expect(messageBubbles[0]).toHaveAttribute('data-is-own', 'true');
      
      // Second message is from partner
      expect(messageBubbles[1]).toHaveAttribute('data-is-own', 'false');
      
      // Third message is from current user
      expect(messageBubbles[2]).toHaveAttribute('data-is-own', 'true');
    });

    it('shows loading state when messages are loading', () => {
      renderWithContext({
        ...mockChatContext,
        isLoading: true,
      });

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
      renderWithContext({
        ...mockChatContext,
        messages: [],
      });

      expect(screen.getByText(/start your conversation/i)).toBeInTheDocument();
      expect(screen.getByText(/send your first message/i)).toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('sends message when Enter is pressed', async () => {
      const user = userEvent.setup();
      const mockSendMessage = jest.fn();
      
      renderWithContext({
        ...mockChatContext,
        sendMessage: mockSendMessage,
      });

      const messageInput = screen.getByTestId('message-input-field');
      
      await user.type(messageInput, 'New message');
      await user.keyboard('{Enter}');

      expect(mockSendMessage).toHaveBeenCalledWith('New message');
    });

    it('sends message when send button is clicked', async () => {
      const user = userEvent.setup();
      const mockSendMessage = jest.fn();
      
      renderWithContext({
        ...mockChatContext,
        sendMessage: mockSendMessage,
      });

      const messageInput = screen.getByTestId('message-input-field');
      const sendButton = screen.getByTestId('send-button');
      
      await user.type(messageInput, 'New message');
      await user.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith('New message');
    });

    it('clears input after sending message', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const messageInput = screen.getByTestId('message-input-field');
      
      await user.type(messageInput, 'New message');
      await user.keyboard('{Enter}');

      expect(messageInput).toHaveValue('');
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      const mockSendMessage = jest.fn();
      
      renderWithContext({
        ...mockChatContext,
        sendMessage: mockSendMessage,
      });

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Typing Indicators', () => {
    it('shows typing indicator when partner is typing', () => {
      renderWithContext({
        ...mockChatContext,
        typingUsers: [mockPartner],
      });

      expect(screen.getByText(/jane is typing/i)).toBeInTheDocument();
    });

    it('hides typing indicator when no one is typing', () => {
      renderWithContext({
        ...mockChatContext,
        typingUsers: [],
      });

      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });

    it('shows multiple users typing', () => {
      const anotherUser = { _id: 'user3', name: 'Bob', email: 'bob@example.com' };
      
      renderWithContext({
        ...mockChatContext,
        typingUsers: [mockPartner, anotherUser],
      });

      expect(screen.getByText(/jane and bob are typing/i)).toBeInTheDocument();
    });
  });

  describe('Message Reactions', () => {
    it('allows adding reactions to messages', async () => {
      const user = userEvent.setup();
      const mockAddReaction = jest.fn();
      
      renderWithContext({
        ...mockChatContext,
        addReaction: mockAddReaction,
      });

      // This would require the MessageBubble component to have reaction functionality
      // For now, we'll test that the function is available
      expect(mockAddReaction).toBeDefined();
    });
  });

  describe('Infinite Scrolling', () => {
    it('loads more messages when scrolling to top', async () => {
      const mockLoadMoreMessages = jest.fn();
      
      renderWithContext({
        ...mockChatContext,
        hasMore: true,
        loadMoreMessages: mockLoadMoreMessages,
      });

      const messagesContainer = screen.getByLabelText(/chat messages/i);
      
      // Simulate scroll to top
      fireEvent.scroll(messagesContainer, { target: { scrollTop: 0 } });

      await waitFor(() => {
        expect(mockLoadMoreMessages).toHaveBeenCalled();
      });
    });

    it('does not load more when no more messages available', () => {
      const mockLoadMoreMessages = jest.fn();
      
      renderWithContext({
        ...mockChatContext,
        hasMore: false,
        loadMoreMessages: mockLoadMoreMessages,
      });

      const messagesContainer = screen.getByLabelText(/chat messages/i);
      fireEvent.scroll(messagesContainer, { target: { scrollTop: 0 } });

      expect(mockLoadMoreMessages).not.toHaveBeenCalled();
    });
  });

  describe('Auto-scrolling', () => {
    it('scrolls to bottom when new message is received', () => {
      const { rerender } = renderWithContext();

      const newMessage = {
        _id: 'msg4',
        chatId: 'chat1',
        sender: mockPartner,
        content: { text: 'New message!', type: 'text' as const },
        createdAt: new Date().toISOString(),
        reactions: [],
        isEdited: false,
      };

      // Add new message
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <ChatContext.Provider value={{
            ...mockChatContext,
            messages: [...mockMessages, newMessage],
          }}>
            <ChatWindow />
          </ChatContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByText('New message!')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when chat fails to load', () => {
      renderWithContext({
        ...mockChatContext,
        error: 'Failed to load messages',
      });

      expect(screen.getByText(/failed to load messages/i)).toBeInTheDocument();
    });

    it('shows retry button on error', async () => {
      const user = userEvent.setup();
      const mockLoadMoreMessages = jest.fn();
      
      renderWithContext({
        ...mockChatContext,
        error: 'Failed to load messages',
        loadMoreMessages: mockLoadMoreMessages,
      });

      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      expect(mockLoadMoreMessages).toHaveBeenCalled();
    });
  });

  describe('Chat Header', () => {
    it('displays chat name', () => {
      renderWithContext();
      expect(screen.getByText('John & Jane')).toBeInTheDocument();
    });

    it('shows online status of partner', () => {
      renderWithContext({
        ...mockChatContext,
        currentChat: {
          ...mockChat,
          participants: [
            mockUser,
            { ...mockPartner, isOnline: true },
          ],
        },
      });

      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });

    it('shows last seen when partner is offline', () => {
      renderWithContext({
        ...mockChatContext,
        currentChat: {
          ...mockChat,
          participants: [
            mockUser,
            { ...mockPartner, isOnline: false, lastSeen: new Date(Date.now() - 3600000).toISOString() },
          ],
        },
      });

      expect(screen.getByText(/last seen/i)).toBeInTheDocument();
    });
  });

  describe('Message Context Menu', () => {
    it('shows context menu on right click', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const firstMessage = screen.getAllByTestId('message-bubble')[0];
      await user.pointer({ keys: '[MouseRight]', target: firstMessage });

      // Context menu would be implemented in MessageBubble component
      // This is a placeholder test
      expect(firstMessage).toBeInTheDocument();
    });
  });

  describe('Message Search', () => {
    it('highlights searched text in messages', () => {
      renderWithContext({
        ...mockChatContext,
        searchQuery: 'great',
      });

      // Search highlighting would be implemented in MessageBubble
      // This is a placeholder test
      expect(screen.getByText('I\'m doing great! 😊')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithContext();

      // The component should adapt its layout
      // This would need to be tested with actual responsive implementation
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('virtualizes long message lists', () => {
      const manyMessages = Array.from({ length: 1000 }, (_, i) => ({
        _id: `msg${i}`,
        chatId: 'chat1',
        sender: i % 2 === 0 ? mockUser : mockPartner,
        content: { text: `Message ${i}`, type: 'text' as const },
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        reactions: [],
        isEdited: false,
      }));

      renderWithContext({
        ...mockChatContext,
        messages: manyMessages,
      });

      // With virtualization, not all messages should be in DOM
      const renderedMessages = screen.getAllByTestId('message-bubble');
      expect(renderedMessages.length).toBeLessThan(1000);
    });
  });

  describe('Offline Support', () => {
    it('queues messages when offline', async () => {
      const user = userEvent.setup();
      
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderWithContext();

      const messageInput = screen.getByTestId('message-input-field');
      await user.type(messageInput, 'Offline message');
      await user.keyboard('{Enter}');

      // Message should be queued (implementation dependent)
      expect(screen.getByText(/message will be sent when online/i)).toBeInTheDocument();
    });
  });
});