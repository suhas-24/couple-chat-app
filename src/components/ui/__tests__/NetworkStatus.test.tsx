/**
 * NetworkStatus Component Tests
 * Tests for network connectivity indicator
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import NetworkStatus from '../NetworkStatus';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('NetworkStatus', () => {
  beforeEach(() => {
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<NetworkStatus />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      expect(statusElement).toHaveAttribute('aria-label', expect.stringContaining('offline'));
    });
  });

  describe('Online Status', () => {
    it('does not render when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      render(<NetworkStatus />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders offline indicator when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    });
  });

  describe('Network Events', () => {
    it('responds to online event', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus />);

      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
      });
    });

    it('responds to offline event', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      render(<NetworkStatus />);

      expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('shows retry button when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls retry callback when retry button is clicked', async () => {
      const mockRetry = jest.fn();
      
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus onRetry={mockRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Custom Messages', () => {
    it('displays custom offline message', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus offlineMessage="Connection lost" />);

      expect(screen.getByText('Connection lost')).toBeInTheDocument();
    });

    it('displays custom retry text', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus retryText="Try Again" />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('renders in top position by default', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveClass('top-4');
    });

    it('renders in bottom position when specified', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NetworkStatus position="bottom" />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveClass('bottom-4');
    });
  });

  describe('Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<NetworkStatus />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});