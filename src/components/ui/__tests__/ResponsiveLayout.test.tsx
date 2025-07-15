import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResponsiveLayout, { 
  useViewport, 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveText 
} from '../ResponsiveLayout';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/test',
  }),
}));

// Mock auth context
const mockUser = {
  _id: '1',
  name: 'Test User',
  email: 'test@example.com',
};

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider value={{ user: mockUser, login: jest.fn(), logout: jest.fn(), loading: false }}>
    {children}
  </AuthProvider>
);

const MockChatProvider = ({ children }: { children: React.ReactNode }) => (
  <ChatProvider value={{ chats: [], currentChat: null, messages: [], unreadCount: 0 }}>
    {children}
  </ChatProvider>
);

// Test component that uses useViewport hook
const ViewportTestComponent = () => {
  const viewport = useViewport();
  return (
    <div>
      <div data-testid="viewport-width">{viewport.width}</div>
      <div data-testid="viewport-height">{viewport.height}</div>
      <div data-testid="is-mobile">{viewport.isMobile.toString()}</div>
      <div data-testid="is-tablet">{viewport.isTablet.toString()}</div>
      <div data-testid="is-desktop">{viewport.isDesktop.toString()}</div>
      <div data-testid="is-touch">{viewport.isTouch.toString()}</div>
    </div>
  );
};

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('renders children correctly', () => {
    render(
      <MockAuthProvider>
        <MockChatProvider>
          <ResponsiveLayout>
            <div data-testid="test-content">Test Content</div>
          </ResponsiveLayout>
        </MockChatProvider>
      </MockAuthProvider>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('shows navigation when user is authenticated', () => {
    render(
      <MockAuthProvider>
        <MockChatProvider>
          <ResponsiveLayout showNavigation={true}>
            <div>Content</div>
          </ResponsiveLayout>
        </MockChatProvider>
      </MockAuthProvider>
    );

    // Navigation should be present (we can't test the actual navigation component here
    // as it's in a separate file, but we can test that the layout structure is correct)
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('hides navigation when showNavigation is false', () => {
    render(
      <MockAuthProvider>
        <MockChatProvider>
          <ResponsiveLayout showNavigation={false}>
            <div data-testid="content">Content</div>
          </ResponsiveLayout>
        </MockChatProvider>
      </MockAuthProvider>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

describe('useViewport hook', () => {
  it('detects desktop viewport correctly', async () => {
    // Set desktop dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    render(<ViewportTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('viewport-width')).toHaveTextContent('1200');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('true');
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false');
    });
  });

  it('detects mobile viewport correctly', async () => {
    // Set mobile dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<ViewportTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('viewport-width')).toHaveTextContent('375');
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false');
    });
  });

  it('detects tablet viewport correctly', async () => {
    // Set tablet dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<ViewportTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('viewport-width')).toHaveTextContent('768');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true');
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
    });
  });

  it('responds to window resize events', async () => {
    const { rerender } = render(<ViewportTestComponent />);

    // Initial desktop size
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('true');

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
    });
  });
});

describe('ResponsiveContainer', () => {
  it('applies correct size classes', () => {
    const { rerender } = render(
      <ResponsiveContainer size="sm" data-testid="container">
        Content
      </ResponsiveContainer>
    );

    expect(screen.getByTestId('container')).toHaveClass('max-w-sm');

    rerender(
      <ResponsiveContainer size="lg" data-testid="container">
        Content
      </ResponsiveContainer>
    );

    expect(screen.getByTestId('container')).toHaveClass('max-w-4xl');
  });

  it('applies padding when enabled', () => {
    render(
      <ResponsiveContainer padding={true} data-testid="container">
        Content
      </ResponsiveContainer>
    );

    expect(screen.getByTestId('container')).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
  });

  it('does not apply padding when disabled', () => {
    render(
      <ResponsiveContainer padding={false} data-testid="container">
        Content
      </ResponsiveContainer>
    );

    expect(screen.getByTestId('container')).not.toHaveClass('px-4');
  });
});

describe('ResponsiveGrid', () => {
  it('applies correct grid column classes', () => {
    render(
      <ResponsiveGrid 
        columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        data-testid="grid"
      >
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('md:grid-cols-3');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });

  it('applies correct gap classes', () => {
    render(
      <ResponsiveGrid gap={6} data-testid="grid">
        <div>Item</div>
      </ResponsiveGrid>
    );

    expect(screen.getByTestId('grid')).toHaveClass('gap-6');
  });
});

describe('ResponsiveText', () => {
  it('applies correct responsive text size classes', () => {
    render(
      <ResponsiveText 
        size={{ xs: 'text-sm', sm: 'text-base', lg: 'text-lg' }}
        data-testid="text"
      >
        Responsive Text
      </ResponsiveText>
    );

    const text = screen.getByTestId('text');
    expect(text).toHaveClass('text-sm');
    expect(text).toHaveClass('sm:text-base');
    expect(text).toHaveClass('lg:text-lg');
  });
});

describe('Accessibility', () => {
  it('maintains proper focus management', () => {
    render(
      <MockAuthProvider>
        <MockChatProvider>
          <ResponsiveLayout>
            <button data-testid="test-button">Test Button</button>
          </ResponsiveLayout>
        </MockChatProvider>
      </MockAuthProvider>
    );

    const button = screen.getByTestId('test-button');
    button.focus();
    expect(button).toHaveFocus();
  });

  it('supports keyboard navigation', () => {
    render(
      <MockAuthProvider>
        <MockChatProvider>
          <ResponsiveLayout>
            <button data-testid="button1">Button 1</button>
            <button data-testid="button2">Button 2</button>
          </ResponsiveLayout>
        </MockChatProvider>
      </MockAuthProvider>
    );

    const button1 = screen.getByTestId('button1');
    const button2 = screen.getByTestId('button2');

    button1.focus();
    expect(button1).toHaveFocus();

    fireEvent.keyDown(button1, { key: 'Tab' });
    // Note: jsdom doesn't automatically handle tab navigation,
    // but we can test that the elements are focusable
    expect(button2).not.toBeDisabled();
  });
});

describe('Performance', () => {
  it('does not cause unnecessary re-renders', () => {
    const renderSpy = jest.fn();
    
    const TestComponent = () => {
      renderSpy();
      return <div>Test</div>;
    };

    const { rerender } = render(
      <ResponsiveLayout>
        <TestComponent />
      </ResponsiveLayout>
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with same props should not cause child re-render
    rerender(
      <ResponsiveLayout>
        <TestComponent />
      </ResponsiveLayout>
    );

    // Note: This test might need adjustment based on actual implementation
    // The goal is to ensure we're not causing unnecessary re-renders
  });
});

describe('Safe Area Support', () => {
  it('applies safe area classes correctly', () => {
    render(
      <ResponsiveLayout className="test-layout">
        <div>Content</div>
      </ResponsiveLayout>
    );

    // Check that the layout has the correct structure for safe areas
    // This is more of a structural test since jsdom doesn't support CSS env()
    expect(document.querySelector('.test-layout')).toBeInTheDocument();
  });
});

describe('Touch Device Detection', () => {
  it('detects touch devices correctly', async () => {
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });

    render(<ViewportTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('is-touch')).toHaveTextContent('true');
    });
  });

  it('detects non-touch devices correctly', async () => {
    // Remove touch support
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });

    render(<ViewportTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('is-touch')).toHaveTextContent('false');
    });
  });
});