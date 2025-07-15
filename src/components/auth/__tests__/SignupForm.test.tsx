/**
 * SignupForm Component Tests
 * Tests for user registration form with validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import SignupForm from '../SignupForm';
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
      data-testid="google-signup"
      onClick={() => {
        const mockCredentialResponse = {
          credential: 'mock-jwt-token',
          select_by: 'btn',
        };
        onSuccess(mockCredentialResponse);
      }}
    >
      Sign up with Google
    </button>
  ),
}));

const mockAuthContext = {
  user: null,
  signup: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null,
};

const renderWithContext = (authValue = mockAuthContext) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <SignupForm />
    </AuthContext.Provider>
  );
};

describe('SignupForm', () => {
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

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Tab through form elements
      await user.tab();
      expect(firstNameInput).toHaveFocus();

      await user.tab();
      expect(lastNameInput).toHaveFocus();

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(confirmPasswordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Test weak password
      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      // Clear and test password without special characters
      await user.clear(passwordInput);
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one special character/i)).toBeInTheDocument();
      });
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'DifferentPassword123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const passwordInput = screen.getByLabelText(/^password$/i);

      // Weak password
      await user.type(passwordInput, '123');
      expect(screen.getByText(/weak/i)).toBeInTheDocument();

      // Medium password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'password123');
      expect(screen.getByText(/medium/i)).toBeInTheDocument();

      // Strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'Password123!');
      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      const mockSignup = jest.fn().mockResolvedValue({ success: true });
      
      renderWithContext({
        ...mockAuthContext,
        signup: mockSignup,
      });

      // Fill out form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      
      // Accept terms
      await user.click(screen.getByLabelText(/i agree to the terms/i));
      
      // Submit
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
        });
      });
    });

    it('requires terms acceptance', async () => {
      const user = userEvent.setup();
      renderWithContext();

      // Fill out form without accepting terms
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/you must agree to the terms/i)).toBeInTheDocument();
      });
    });

    it('handles signup errors', async () => {
      const user = userEvent.setup();
      const mockSignup = jest.fn().mockRejectedValue(new Error('Email already exists'));
      
      renderWithContext({
        ...mockAuthContext,
        signup: mockSignup,
        error: 'Email already exists',
      });

      // Fill out form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByLabelText(/i agree to the terms/i));
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      renderWithContext({
        ...mockAuthContext,
        loading: true,
      });

      const submitButton = screen.getByRole('button', { name: /creating account/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Google OAuth', () => {
    it('renders Google signup button', () => {
      renderWithContext();
      expect(screen.getByTestId('google-signup')).toBeInTheDocument();
    });

    it('handles Google signup success', async () => {
      const user = userEvent.setup();
      const mockSignup = jest.fn().mockResolvedValue({ success: true });
      
      renderWithContext({
        ...mockAuthContext,
        signup: mockSignup,
      });

      const googleButton = screen.getByTestId('google-signup');
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          googleCredential: 'mock-jwt-token',
        });
      });
    });
  });

  describe('Navigation', () => {
    it('has link to login page', () => {
      renderWithContext();
      
      const loginLink = screen.getByText(/already have an account/i).closest('a');
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('UI Elements', () => {
    it('renders romantic theme elements', () => {
      renderWithContext();
      
      expect(screen.getByText(/join the love story/i)).toBeInTheDocument();
      expect(screen.getByText(/create your couple account/i)).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const toggleButtons = screen.getAllByLabelText(/toggle password visibility/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Toggle first password field
      await user.click(toggleButtons[0]);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Toggle second password field
      await user.click(toggleButtons[1]);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Terms and Privacy', () => {
    it('renders terms and privacy links', () => {
      renderWithContext();
      
      const termsLink = screen.getByText(/terms of service/i);
      const privacyLink = screen.getByText(/privacy policy/i);
      
      expect(termsLink).toBeInTheDocument();
      expect(privacyLink).toBeInTheDocument();
    });

    it('opens terms and privacy in new tab', () => {
      renderWithContext();
      
      const termsLink = screen.getByText(/terms of service/i).closest('a');
      const privacyLink = screen.getByText(/privacy policy/i).closest('a');
      
      expect(termsLink).toHaveAttribute('target', '_blank');
      expect(privacyLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Real-time Validation', () => {
    it('validates email on blur', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const emailInput = screen.getByLabelText(/email/i);
      
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('validates password match on confirm password change', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'DifferentPassword');

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form State Management', () => {
    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithContext({
        ...mockAuthContext,
        error: 'Email already exists',
      });

      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'a');

      // Error should be cleared (this would need to be implemented in the component)
      await waitFor(() => {
        expect(screen.queryByText(/email already exists/i)).not.toBeInTheDocument();
      });
    });

    it('maintains form state during validation', async () => {
      const user = userEvent.setup();
      renderWithContext();

      const firstNameInput = screen.getByLabelText(/first name/i);
      const emailInput = screen.getByLabelText(/email/i);
      
      await user.type(firstNameInput, 'John');
      await user.type(emailInput, 'invalid-email');
      
      // Trigger validation
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Form values should be preserved
      expect(firstNameInput).toHaveValue('John');
      expect(emailInput).toHaveValue('invalid-email');
    });
  });

  describe('Newsletter Subscription', () => {
    it('renders newsletter subscription checkbox', () => {
      renderWithContext();
      
      const newsletterCheckbox = screen.getByLabelText(/subscribe to newsletter/i);
      expect(newsletterCheckbox).toBeInTheDocument();
      expect(newsletterCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('includes newsletter preference in signup data', async () => {
      const user = userEvent.setup();
      const mockSignup = jest.fn().mockResolvedValue({ success: true });
      
      renderWithContext({
        ...mockAuthContext,
        signup: mockSignup,
      });

      // Fill out form and check newsletter
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByLabelText(/i agree to the terms/i));
      await user.click(screen.getByLabelText(/subscribe to newsletter/i));
      
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          subscribeToNewsletter: true,
        });
      });
    });
  });
});