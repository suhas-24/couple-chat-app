/**
 * AuthContext Tests
 * Tests for authentication context provider and hooks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { api } from '@/services/api';

// Mock API
jest.mock('@/services/api', () => ({
  api: {
    auth: {
      login: jest.fn(),
      signup: jest.fn(),
      googleLogin: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    },
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/test',
  }),
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, login, logout, signup, loading, error } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.name : 'No user'}</div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="error">{error || 'No error'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => signup({ 
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'test@example.com', 
        password: 'password' 
      })}>
        Signup
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderWithProvider = (children: React.ReactNode) => {
  return render(
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Provider Initialization', () => {
    it('initializes with no user when no token stored', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });

    it('attempts to load user when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('mock-token');
      
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.getProfile as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
      });

      expect(api.auth.getProfile).toHaveBeenCalled();
    });

    it('handles invalid stored token', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      
      (api.auth.getProfile as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('Login', () => {
    it('successfully logs in user', async () => {
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.login as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'new-token',
        },
      });

      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });

      expect(api.auth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'new-token');
    });

    it('handles login errors', async () => {
      (api.auth.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    it('handles Google login', async () => {
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.googleLogin as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'google-token',
        },
      });

      const TestGoogleLogin = () => {
        const { googleLogin } = useAuth();
        return (
          <button onClick={() => googleLogin('google-credential')}>
            Google Login
          </button>
        );
      };

      renderWithProvider(<TestGoogleLogin />);

      const googleLoginButton = screen.getByText('Google Login');
      fireEvent.click(googleLoginButton);

      await waitFor(() => {
        expect(api.auth.googleLogin).toHaveBeenCalledWith('google-credential');
      });
    });
  });

  describe('Signup', () => {
    it('successfully signs up user', async () => {
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.signup as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'signup-token',
        },
      });

      renderWithProvider(<TestComponent />);

      const signupButton = screen.getByText('Signup');
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
      });

      expect(api.auth.signup).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password',
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'signup-token');
    });

    it('handles signup errors', async () => {
      (api.auth.signup as jest.Mock).mockRejectedValue(new Error('Email already exists'));

      renderWithProvider(<TestComponent />);

      const signupButton = screen.getByText('Signup');
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
      });
    });
  });

  describe('Logout', () => {
    it('successfully logs out user', async () => {
      // First set up a logged-in state
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.login as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'token',
        },
      });

      (api.auth.logout as jest.Mock).mockResolvedValue({ success: true });

      renderWithProvider(<TestComponent />);

      // Login first
      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
      });

      // Then logout
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('handles logout errors gracefully', async () => {
      // Set up logged-in state
      mockLocalStorage.getItem.mockReturnValue('token');
      
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.getProfile as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      (api.auth.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
      });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      // Should still clear local state even if API call fails
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('Error Handling', () => {
    it('clears errors when starting new operations', async () => {
      // First create an error state
      (api.auth.login as jest.Mock).mockRejectedValue(new Error('Login failed'));

      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      });

      // Now try signup - error should be cleared
      (api.auth.signup as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          user: { _id: '1', name: 'John', email: 'john@example.com' },
          token: 'token',
        },
      });

      const signupButton = screen.getByText('Signup');
      fireEvent.click(signupButton);

      // Error should be cleared immediately when starting new operation
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('Hook Usage', () => {
    it('throws error when used outside provider', () => {
      const TestComponentOutsideProvider = () => {
        useAuth();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Token Management', () => {
    it('sets authorization header when token is available', async () => {
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.login as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'new-token',
        },
      });

      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'new-token');
      });
    });

    it('removes token on logout', async () => {
      mockLocalStorage.getItem.mockReturnValue('existing-token');
      
      const mockUser = {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      (api.auth.getProfile as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      (api.auth.logout as jest.Mock).mockResolvedValue({ success: true });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
      });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      (api.auth.login as jest.Mock).mockReturnValue(loginPromise);

      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      // Resolve the promise
      resolveLogin!({
        success: true,
        data: {
          user: { _id: '1', name: 'John', email: 'john@example.com' },
          token: 'token',
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });
    });

    it('shows loading during initial token validation', async () => {
      mockLocalStorage.getItem.mockReturnValue('token');

      let resolveProfile: (value: any) => void;
      const profilePromise = new Promise(resolve => {
        resolveProfile = resolve;
      });

      (api.auth.getProfile as jest.Mock).mockReturnValue(profilePromise);

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      // Resolve the promise
      resolveProfile!({
        success: true,
        data: { _id: '1', name: 'John', email: 'john@example.com' },
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });
    });
  });
});