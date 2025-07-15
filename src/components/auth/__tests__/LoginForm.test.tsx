/**
 * LoginForm Component Tests
 * Tests for authentication form with Google OAuth integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import LoginForm from '../LoginForm';
import { AuthContext } from '@/context/AuthContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
  }),
}));

// Mock Google OAuth
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }: any) => (
    <button
      data-testid="google-login"
      onClick={() => {
        const mockCredentialResponse = {
          credential: 'mock-jwt-token',
          select_by: 'btn',
        };
        onSuccess(mockCredentialResponse);
      }}
    >
      Sign in with Google
    </button>
  ),
}));

// Mock API
jest.mock('@/services/api', () => ({
  api: {
    auth: {
      login: jest.fn(),
      googleLogin: jest.fn(),
    },
  },
}));

const mockAuthContext = {
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null,
};

const renderWithContext = (authValue = mockAuthContext) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <LoginForm />
    </AuthContext.Provider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = renderWithContext();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper form labels and ARIA attributes', () => {
      renderWithContext();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('validates password length', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid credentials', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue({ success: true });
      
      renderWithContext({
        ...mockAuthContext,
        login: mockLogin,
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('handles login errors', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      renderWithContext({
        ...mockAuthContext,
        login: mockLogin,
        error: 'Invalid credentials',
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      
      renderWithContext({
        ...mockAuthContext,
        loading: true,
      });

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Google OAuth', () => {
    it('renders Google login button', () => {
      renderWithContext();
      expect(screen.getByTestId('google-login')).toBeInTheDocument();
    });

    it('handles Google login success', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue({ success: true });
      
      renderWithContext({
        ...mockAuthContext,
        login: mockLogin,
      });

      const googleButton = screen.getByTestId('google-login');
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          googleCredential: 'mock-jwt-token',
        });
      });
    });
  });

  describe('Navigation', () => {
    it('has link to signup page', () => {
      renderWithContext();
      
      const signupLink = screen.getByText(/don't have an account/i).closest('a');
      expect(signupLink).toHaveAttribute('href', '/signup');
    });

    it('has forgot password link', () => {
      renderWithContext();
      
      const forgotLink = screen.getByText(/forgot password/i);
      expect(forgotLink).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('renders romantic theme elements', () => {
      renderWithContext();
      
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/continue your love story/i)).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByLabelText(/toggle password visibility/i);

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Remember Me', () => {
    it('renders remember me checkbox', () => {
      renderWithContext();
      
      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('toggles remember me state', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Error Handling', () => {
    it('displays network errors', () => {
      renderWithContext({
        ...mockAuthContext,
        error: 'Network error. Please check your connection.',
      });

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithContext({
        ...mockAuthContext,
        error: 'Invalid credentials',
      });

      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'a');

      // Error should be cleared (this would need to be implemented in the component)
      await waitFor(() => {
        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Persistence', () => {
    it('persists email when remember me is checked', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn().mockReturnValue('test@example.com'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
      });

      renderWithContext();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('test@example.com');
    });
  });
});