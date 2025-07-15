/**
 * EnhancedCsvUpload Component Tests
 * Tests for CSV file upload with validation and preview
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import EnhancedCsvUpload from '../EnhancedCsvUpload';
import { ChatContext } from '@/context/ChatContext';
import { api } from '@/services/api';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock API
jest.mock('@/services/api', () => ({
  api: {
    chat: {
      uploadCsv: jest.fn(),
      previewCsv: jest.fn(),
    },
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockChat = {
  _id: 'chat1',
  participants: [
    { _id: 'user1', name: 'John' },
    { _id: 'user2', name: 'Jane' },
  ],
  chatName: 'John & Jane',
  isActive: true,
  lastMessageAt: new Date().toISOString(),
  metadata: { theme: 'romantic' as const },
  createdAt: new Date().toISOString(),
};

const mockChatContext = {
  currentChat: mockChat,
  messages: [],
  sendMessage: jest.fn(),
  isLoading: false,
  error: null,
  hasMore: false,
  loadMoreMessages: jest.fn(),
  markAsRead: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
};

const mockCsvPreview = {
  totalMessages: 150,
  dateRange: {
    start: '2023-01-01',
    end: '2023-12-31',
  },
  participants: ['John', 'Jane'],
  sampleMessages: [
    {
      sender: 'John',
      content: 'Hello there!',
      timestamp: '2023-01-01T10:00:00Z',
    },
    {
      sender: 'Jane',
      content: 'Hi! How are you?',
      timestamp: '2023-01-01T10:05:00Z',
    },
  ],
  format: 'whatsapp',
  warnings: [],
};

const renderWithContext = (chatValue = mockChatContext) => {
  return render(
    <ChatContext.Provider value={chatValue}>
      <EnhancedCsvUpload onUploadComplete={jest.fn()} />
    </ChatContext.Provider>
  );
};

// Helper to create mock file
const createMockFile = (name: string, content: string, type = 'text/csv') => {
  const file = new File([content], name, { type });
  return file;
};

describe('EnhancedCsvUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.chat.previewCsv as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCsvPreview,
    });
    (api.chat.uploadCsv as jest.Mock).mockResolvedValue({
      success: true,
      data: { importedCount: 150 },
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = renderWithContext();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels and roles', () => {
      renderWithContext();

      expect(screen.getByLabelText(/upload csv file/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const fileInput = screen.getByLabelText(/upload csv file/i);
      const browseButton = screen.getByRole('button', { name: /browse files/i });

      await user.tab();
      expect(browseButton).toHaveFocus();

      // File input should be accessible via keyboard
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('accepts CSV files', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(api.chat.previewCsv).toHaveBeenCalledWith(mockChat._id, expect.any(FormData));
      });
    });

    it('rejects non-CSV files', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const file = createMockFile('document.txt', 'Not a CSV', 'text/plain');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      expect(screen.getByText(/please select a csv file/i)).toBeInTheDocument();
      expect(api.chat.previewCsv).not.toHaveBeenCalled();
    });

    it('rejects files that are too large', async () => {
      const user = userEvent.setup();
      renderWithContext();

      // Create a large file (mock 11MB)
      const largeContent = 'a'.repeat(11 * 1024 * 1024);
      const file = createMockFile('large.csv', largeContent);
      
      // Mock file size
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });

      const fileInput = screen.getByLabelText(/upload csv file/i);
      await user.upload(fileInput, file);

      expect(screen.getByText(/file size must be less than 10mb/i)).toBeInTheDocument();
      expect(api.chat.previewCsv).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag and drop events', async () => {
      renderWithContext();

      const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div');
      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');

      // Simulate drag enter
      fireEvent.dragEnter(dropZone!, {
        dataTransfer: { files: [file] },
      });

      expect(screen.getByText(/drop your file here/i)).toBeInTheDocument();

      // Simulate drop
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(api.chat.previewCsv).toHaveBeenCalled();
      });
    });

    it('shows visual feedback during drag', () => {
      renderWithContext();

      const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div');
      
      fireEvent.dragEnter(dropZone!);
      expect(dropZone).toHaveClass('border-pink-500'); // Assuming this class is added

      fireEvent.dragLeave(dropZone!);
      expect(dropZone).not.toHaveClass('border-pink-500');
    });
  });

  describe('File Preview', () => {
    it('shows preview after file selection', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
        expect(screen.getByText('150 messages')).toBeInTheDocument();
        expect(screen.getByText('Jan 1, 2023 - Dec 31, 2023')).toBeInTheDocument();
      });
    });

    it('displays sample messages', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
        expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
      });
    });

    it('shows format detection', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const file = createMockFile('whatsapp.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/whatsapp format detected/i)).toBeInTheDocument();
      });
    });

    it('displays warnings when present', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...mockCsvPreview,
          warnings: ['Some timestamps could not be parsed', 'Unknown sender names found'],
        },
      });

      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,invalid-date');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/warnings/i)).toBeInTheDocument();
        expect(screen.getByText(/some timestamps could not be parsed/i)).toBeInTheDocument();
        expect(screen.getByText(/unknown sender names found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Upload Process', () => {
    it('uploads file after confirmation', async () => {
      const user = userEvent.setup();
      const mockOnUploadComplete = jest.fn();
      
      render(
        <ChatContext.Provider value={mockChatContext}>
          <EnhancedCsvUpload onUploadComplete={mockOnUploadComplete} />
        </ChatContext.Provider>
      );

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /import messages/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(api.chat.uploadCsv).toHaveBeenCalledWith(mockChat._id, expect.any(FormData));
        expect(mockOnUploadComplete).toHaveBeenCalledWith({ importedCount: 150 });
      });
    });

    it('shows upload progress', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed upload
      (api.chat.uploadCsv as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: { importedCount: 150 } }), 100))
      );

      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /import messages/i });
      await user.click(uploadButton);

      expect(screen.getByText(/importing messages/i)).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/import completed/i)).toBeInTheDocument();
      });
    });

    it('handles upload errors', async () => {
      const user = userEvent.setup();
      
      (api.chat.uploadCsv as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /import messages/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Format Support', () => {
    it('supports WhatsApp format', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockCsvPreview, format: 'whatsapp' },
      });

      renderWithContext();

      const file = createMockFile('whatsapp.txt', '[1/1/23, 10:00:00 AM] John: Hello');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/whatsapp format/i)).toBeInTheDocument();
      });
    });

    it('supports Telegram format', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockCsvPreview, format: 'telegram' },
      });

      renderWithContext();

      const file = createMockFile('telegram.json', '{"messages": []}');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/telegram format/i)).toBeInTheDocument();
      });
    });

    it('supports generic CSV format', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockCsvPreview, format: 'generic' },
      });

      renderWithContext();

      const file = createMockFile('generic.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/generic csv format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles preview API errors', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockRejectedValue(new Error('Invalid CSV format'));

      renderWithContext();

      const file = createMockFile('invalid.csv', 'invalid content');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/invalid csv format/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('allows canceling upload', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText('Preview')).not.toBeInTheDocument();
      expect(screen.getByText(/drag and drop your csv file here/i)).toBeInTheDocument();
    });

    it('allows selecting different file', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const file1 = createMockFile('chat1.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file1);

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });

      const changeFileButton = screen.getByRole('button', { name: /choose different file/i });
      await user.click(changeFileButton);

      expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    });

    it('shows helpful instructions', () => {
      renderWithContext();

      expect(screen.getByText(/supported formats/i)).toBeInTheDocument();
      expect(screen.getByText(/whatsapp/i)).toBeInTheDocument();
      expect(screen.getByText(/telegram/i)).toBeInTheDocument();
      expect(screen.getByText(/generic csv/i)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('validates file content structure', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Missing required columns: sender, message, timestamp',
      });

      renderWithContext();

      const file = createMockFile('invalid.csv', 'col1,col2\nval1,val2');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/missing required columns/i)).toBeInTheDocument();
      });
    });

    it('validates date formats', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...mockCsvPreview,
          warnings: ['Invalid date format in row 5: "not-a-date"'],
        },
      });

      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,not-a-date');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/invalid date format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('handles large files efficiently', async () => {
      const user = userEvent.setup();
      
      (api.chat.previewCsv as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockCsvPreview, totalMessages: 10000 },
      });

      renderWithContext();

      const file = createMockFile('large.csv', 'sender,message,timestamp\n'.repeat(10000));
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('10,000 messages')).toBeInTheDocument();
      });
    });

    it('shows processing indicator for large files', async () => {
      const user = userEvent.setup();
      
      // Mock delayed preview
      (api.chat.previewCsv as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockCsvPreview }), 100))
      );

      renderWithContext();

      const file = createMockFile('chat.csv', 'sender,message,timestamp\nJohn,Hello,2023-01-01');
      const fileInput = screen.getByLabelText(/upload csv file/i);

      await user.upload(fileInput, file);

      expect(screen.getByText(/processing file/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });
    });
  });
});