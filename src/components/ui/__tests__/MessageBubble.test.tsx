/**
 * MessageBubble Component Tests
 * Tests for individual message display with reactions and animations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import MessageBubble from '../MessageBubble';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockUser = {
  _id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://example.com/avatar.jpg',
};

const mockPartner = {
  _id: 'user2',
  name: 'Jane Doe',
  email: 'jane@example.com',
  avatar: 'https://example.com/avatar2.jpg',
};

const mockMessage = {
  _id: 'msg1',
  chatId: 'chat1',
  sender: mockUser,
  content: {
    text: 'Hello there! How are you doing today? 😊',
    type: 'text' as const,
  },
  createdAt: new Date().toISOString(),
  reactions: [
    {
      userId: 'user2',
      emoji: '❤️',
      createdAt: new Date().toISOString(),
    },
    {
      userId: 'user1',
      emoji: '😊',
      createdAt: new Date().toISOString(),
    },
  ],
  isEdited: false,
};

const mockImageMessage = {
  ...mockMessage,
  _id: 'msg2',
  content: {
    text: 'Check out this photo!',
    type: 'image' as const,
    metadata: {
      fileName: 'photo.jpg',
      fileSize: 1024000,
      mimeType: 'image/jpeg',
    },
  },
};

const mockEditedMessage = {
  ...mockMessage,
  _id: 'msg3',
  content: {
    text: 'This message was edited',
    type: 'text' as const,
  },
  isEdited: true,
  editHistory: [
    {
      content: 'Original message',
      editedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};

describe('MessageBubble', () => {
  const defaultProps = {
    message: mockMessage,
    isOwn: true,
    showAvatar: true,
    showTimestamp: true,
    onReaction: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    currentUserId: 'user1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<MessageBubble {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels and roles', () => {
      render(<MessageBubble {...defaultProps} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByLabelText(/message from john doe/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation for reactions', async () => {
      const user = userEvent.setup();
      render(<MessageBubble {...defaultProps} />);

      const reactionButton = screen.getByLabelText(/add reaction/i);
      await user.tab();
      
      // Should be able to focus on reaction button
      expect(reactionButton).toHaveFocus();
    });
  });

  describe('Message Display', () => {
    it('renders message content correctly', () => {
      render(<MessageBubble {...defaultProps} />);

      expect(screen.getByText('Hello there! How are you doing today? 😊')).toBeInTheDocument();
    });

    it('displays sender name when not own message', () => {
      render(<MessageBubble {...defaultProps} isOwn={false} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('hides sender name for own messages', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('shows avatar when enabled', () => {
      render(<MessageBubble {...defaultProps} showAvatar={true} />);

      const avatar = screen.getByRole('img', { name: /john doe/i });
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('hides avatar when disabled', () => {
      render(<MessageBubble {...defaultProps} showAvatar={false} />);

      expect(screen.queryByRole('img', { name: /john doe/i })).not.toBeInTheDocument();
    });

    it('displays timestamp when enabled', () => {
      render(<MessageBubble {...defaultProps} showTimestamp={true} />);

      expect(screen.getByText(/just now|ago/)).toBeInTheDocument();
    });

    it('hides timestamp when disabled', () => {
      render(<MessageBubble {...defaultProps} showTimestamp={false} />);

      expect(screen.queryByText(/just now|ago/)).not.toBeInTheDocument();
    });
  });

  describe('Message Types', () => {
    it('renders text messages correctly', () => {
      render(<MessageBubble {...defaultProps} />);

      expect(screen.getByText('Hello there! How are you doing today? 😊')).toBeInTheDocument();
    });

    it('renders image messages with preview', () => {
      render(<MessageBubble {...defaultProps} message={mockImageMessage} />);

      expect(screen.getByText('Check out this photo!')).toBeInTheDocument();
      expect(screen.getByText(/image/i)).toBeInTheDocument();
    });

    it('handles long messages with proper wrapping', () => {
      const longMessage = {
        ...mockMessage,
        content: {
          text: 'This is a very long message that should wrap properly and not break the layout. '.repeat(10),
          type: 'text' as const,
        },
      };

      render(<MessageBubble {...defaultProps} message={longMessage} />);

      const messageElement = screen.getByText(/this is a very long message/i);
      expect(messageElement).toBeInTheDocument();
    });
  });

  describe('Message Reactions', () => {
    it('displays existing reactions', () => {
      render(<MessageBubble {...defaultProps} />);

      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('😊')).toBeInTheDocument();
    });

    it('shows reaction count when multiple users react with same emoji', () => {
      const messageWithMultipleReactions = {
        ...mockMessage,
        reactions: [
          { userId: 'user1', emoji: '❤️', createdAt: new Date().toISOString() },
          { userId: 'user2', emoji: '❤️', createdAt: new Date().toISOString() },
          { userId: 'user3', emoji: '❤️', createdAt: new Date().toISOString() },
        ],
      };

      render(<MessageBubble {...defaultProps} message={messageWithMultipleReactions} />);

      expect(screen.getByText('❤️ 3')).toBeInTheDocument();
    });

    it('allows adding reactions', async () => {
      const user = userEvent.setup();
      const mockOnReaction = jest.fn();

      render(<MessageBubble {...defaultProps} onReaction={mockOnReaction} />);

      const addReactionButton = screen.getByLabelText(/add reaction/i);
      await user.click(addReactionButton);

      // Should show reaction picker (implementation dependent)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('allows removing own reactions', async () => {
      const user = userEvent.setup();
      const mockOnReaction = jest.fn();

      render(<MessageBubble {...defaultProps} onReaction={mockOnReaction} />);

      const ownReaction = screen.getByText('😊');
      await user.click(ownReaction);

      expect(mockOnReaction).toHaveBeenCalledWith(mockMessage._id, '😊', 'remove');
    });

    it('shows reaction tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<MessageBubble {...defaultProps} />);

      const reaction = screen.getByText('❤️');
      await user.hover(reaction);

      await waitFor(() => {
        expect(screen.getByText(/jane doe reacted with/i)).toBeInTheDocument();
      });
    });
  });

  describe('Message Actions', () => {
    it('shows context menu on right click', async () => {
      const user = userEvent.setup();
      render(<MessageBubble {...defaultProps} />);

      const messageElement = screen.getByRole('article');
      await user.pointer({ keys: '[MouseRight]', target: messageElement });

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
      expect(screen.getByText(/copy/i)).toBeInTheDocument();
    });

    it('allows editing own messages', async () => {
      const user = userEvent.setup();
      const mockOnEdit = jest.fn();

      render(<MessageBubble {...defaultProps} onEdit={mockOnEdit} />);

      const messageElement = screen.getByRole('article');
      await user.pointer({ keys: '[MouseRight]', target: messageElement });

      const editButton = screen.getByText(/edit/i);
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockMessage._id);
    });

    it('allows deleting own messages', async () => {
      const user = userEvent.setup();
      const mockOnDelete = jest.fn();

      render(<MessageBubble {...defaultProps} onDelete={mockOnDelete} />);

      const messageElement = screen.getByRole('article');
      await user.pointer({ keys: '[MouseRight]', target: messageElement });

      const deleteButton = screen.getByText(/delete/i);
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      const confirmButton = screen.getByText(/delete/i);
      await user.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockMessage._id);
    });

    it('hides edit/delete options for partner messages', async () => {
      const user = userEvent.setup();
      render(<MessageBubble {...defaultProps} isOwn={false} />);

      const messageElement = screen.getByRole('article');
      await user.pointer({ keys: '[MouseRight]', target: messageElement });

      expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
      expect(screen.getByText(/copy/i)).toBeInTheDocument(); // Copy should still be available
    });

    it('allows copying message text', async () => {
      const user = userEvent.setup();
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });

      render(<MessageBubble {...defaultProps} />);

      const messageElement = screen.getByRole('article');
      await user.pointer({ keys: '[MouseRight]', target: messageElement });

      const copyButton = screen.getByText(/copy/i);
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello there! How are you doing today? 😊');
    });
  });

  describe('Message Status', () => {
    it('shows edited indicator for edited messages', () => {
      render(<MessageBubble {...defaultProps} message={mockEditedMessage} />);

      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });

    it('shows edit history on hover', async () => {
      const user = userEvent.setup();
      render(<MessageBubble {...defaultProps} message={mockEditedMessage} />);

      const editedIndicator = screen.getByText(/edited/i);
      await user.hover(editedIndicator);

      await waitFor(() => {
        expect(screen.getByText(/original message/i)).toBeInTheDocument();
      });
    });

    it('shows delivery status for own messages', () => {
      const messageWithStatus = {
        ...mockMessage,
        status: 'delivered' as const,
      };

      render(<MessageBubble {...defaultProps} message={messageWithStatus} />);

      expect(screen.getByLabelText(/delivered/i)).toBeInTheDocument();
    });

    it('shows read status for own messages', () => {
      const messageWithStatus = {
        ...mockMessage,
        status: 'read' as const,
      };

      render(<MessageBubble {...defaultProps} message={messageWithStatus} />);

      expect(screen.getByLabelText(/read/i)).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('applies different styles for own vs partner messages', () => {
      const { rerender } = render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const ownMessage = screen.getByRole('article');
      expect(ownMessage).toHaveClass('ml-auto'); // Right-aligned

      rerender(<MessageBubble {...defaultProps} isOwn={false} />);
      
      const partnerMessage = screen.getByRole('article');
      expect(partnerMessage).toHaveClass('mr-auto'); // Left-aligned
    });

    it('applies romantic theme colors', () => {
      render(<MessageBubble {...defaultProps} />);

      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveClass('bg-gradient-to-r'); // Romantic gradient
    });

    it('shows typing animation for new messages', () => {
      const newMessage = {
        ...mockMessage,
        createdAt: new Date().toISOString(), // Just created
      };

      render(<MessageBubble {...defaultProps} message={newMessage} />);

      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveClass('animate-fade-in');
    });
  });

  describe('Link Detection', () => {
    it('renders links as clickable elements', () => {
      const messageWithLink = {
        ...mockMessage,
        content: {
          text: 'Check out this website: https://example.com',
          type: 'text' as const,
        },
      };

      render(<MessageBubble {...defaultProps} message={messageWithLink} />);

      const link = screen.getByRole('link', { name: /https:\/\/example\.com/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('shows link preview for supported URLs', async () => {
      const messageWithLink = {
        ...mockMessage,
        content: {
          text: 'https://example.com',
          type: 'text' as const,
          metadata: {
            linkPreview: {
              title: 'Example Website',
              description: 'This is an example website',
              image: 'https://example.com/image.jpg',
            },
          },
        },
      };

      render(<MessageBubble {...defaultProps} message={messageWithLink} />);

      expect(screen.getByText('Example Website')).toBeInTheDocument();
      expect(screen.getByText('This is an example website')).toBeInTheDocument();
    });
  });

  describe('Emoji Handling', () => {
    it('renders emojis with proper size', () => {
      const emojiMessage = {
        ...mockMessage,
        content: {
          text: '😊❤️🎉',
          type: 'text' as const,
        },
      };

      render(<MessageBubble {...defaultProps} message={emojiMessage} />);

      const messageText = screen.getByText('😊❤️🎉');
      expect(messageText).toHaveClass('text-2xl'); // Large emoji class
    });

    it('handles mixed text and emoji content', () => {
      const mixedMessage = {
        ...mockMessage,
        content: {
          text: 'Hello 😊 how are you? ❤️',
          type: 'text' as const,
        },
      };

      render(<MessageBubble {...defaultProps} message={mixedMessage} />);

      expect(screen.getByText('Hello 😊 how are you? ❤️')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes message content to prevent unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestWrapper = ({ message }: { message: any }) => {
        renderSpy();
        return <MessageBubble {...defaultProps} message={message} />;
      };

      const { rerender } = render(<TestWrapper message={mockMessage} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same message should not cause re-render
      rerender(<TestWrapper message={mockMessage} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with different message should cause re-render
      rerender(<TestWrapper message={mockEditedMessage} />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('handles missing message content gracefully', () => {
      const messageWithoutContent = {
        ...mockMessage,
        content: null,
      };

      render(<MessageBubble {...defaultProps} message={messageWithoutContent} />);

      expect(screen.getByText(/message unavailable/i)).toBeInTheDocument();
    });

    it('handles missing sender information', () => {
      const messageWithoutSender = {
        ...mockMessage,
        sender: null,
      };

      render(<MessageBubble {...defaultProps} message={messageWithoutSender} />);

      expect(screen.getByText(/unknown sender/i)).toBeInTheDocument();
    });

    it('handles broken avatar images', () => {
      const messageWithBrokenAvatar = {
        ...mockMessage,
        sender: {
          ...mockUser,
          avatar: 'https://broken-link.com/avatar.jpg',
        },
      };

      render(<MessageBubble {...defaultProps} message={messageWithBrokenAvatar} showAvatar={true} />);

      const avatar = screen.getByRole('img', { name: /john doe/i });
      
      // Simulate image load error
      fireEvent.error(avatar);

      // Should show fallback avatar
      expect(screen.getByText('JD')).toBeInTheDocument(); // Initials fallback
    });
  });
});