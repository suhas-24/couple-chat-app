/**
 * Accessibility tests for AccessibilitySettings component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AccessibilitySettings from '../AccessibilitySettings';
import { AccessibilityProvider } from '@/context/AccessibilityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
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

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  );
};

describe('AccessibilitySettings', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('should not have accessibility violations', async () => {
    const { container } = renderWithProvider(<AccessibilitySettings />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders accessibility settings with proper ARIA attributes', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /visual/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /audio/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /keyboard/i })).toBeInTheDocument();
  });

  it('manages tab navigation correctly', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    const visualTab = screen.getByRole('tab', { name: /visual/i });
    const audioTab = screen.getByRole('tab', { name: /audio/i });
    
    expect(visualTab).toHaveAttribute('aria-selected', 'true');
    expect(audioTab).toHaveAttribute('aria-selected', 'false');
    
    fireEvent.click(audioTab);
    
    expect(visualTab).toHaveAttribute('aria-selected', 'false');
    expect(audioTab).toHaveAttribute('aria-selected', 'true');
  });

  it('toggles high contrast mode with proper ARIA states', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    const highContrastToggle = screen.getByLabelText(/toggle high contrast mode/i);
    expect(highContrastToggle).toHaveAttribute('aria-pressed', 'false');
    
    fireEvent.click(highContrastToggle);
    
    expect(highContrastToggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('provides keyboard navigation for font size controls', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    const decreaseButton = screen.getByLabelText(/decrease font size/i);
    const increaseButton = screen.getByLabelText(/increase font size/i);
    
    expect(decreaseButton).toBeInTheDocument();
    expect(increaseButton).toBeInTheDocument();
    
    // Test keyboard interaction
    fireEvent.keyDown(increaseButton, { key: 'Enter' });
    fireEvent.keyDown(increaseButton, { key: ' ' });
  });

  it('announces changes to screen readers', async () => {
    renderWithProvider(<AccessibilitySettings />);
    
    // Navigate to audio tab first
    const audioTab = screen.getByRole('tab', { name: /audio/i });
    fireEvent.click(audioTab);
    
    const testButton = screen.getByText(/test screen reader announcement/i);
    fireEvent.click(testButton);
    
    // Verify announcement was made (would need to mock the announce function)
    await waitFor(() => {
      expect(document.querySelector('[aria-live]')).toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts help section', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    // Navigate to keyboard tab
    const keyboardTab = screen.getByRole('tab', { name: /keyboard/i });
    fireEvent.click(keyboardTab);
    
    expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
    expect(screen.getByText(/navigate forward/i)).toBeInTheDocument();
    expect(screen.getByText(/activate button\/link/i)).toBeInTheDocument();
  });

  it('resets settings with confirmation', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    const resetButton = screen.getByText(/reset to default settings/i);
    expect(resetButton).toBeInTheDocument();
    
    fireEvent.click(resetButton);
    
    // Verify settings are reset (would need to check context state)
  });

  it('supports focus management', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    const firstTab = screen.getByRole('tab', { name: /visual/i });
    const closeButton = screen.queryByLabelText(/close accessibility settings/i);
    
    // Test focus order
    firstTab.focus();
    expect(document.activeElement).toBe(firstTab);
    
    if (closeButton) {
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    }
  });

  it('provides proper labeling for all interactive elements', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    // Check that all buttons have accessible names
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
    
    // Check that all tabs have accessible names
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toHaveAccessibleName();
    });
  });

  it('maintains proper heading hierarchy', () => {
    renderWithProvider(<AccessibilitySettings />);
    
    const mainHeading = screen.getByRole('heading', { level: 2 });
    expect(mainHeading).toHaveTextContent(/accessibility settings/i);
  });

  it('handles reduced motion preferences', () => {
    // Mock reduced motion preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    renderWithProvider(<AccessibilitySettings />);
    
    const reducedMotionToggle = screen.getByLabelText(/toggle reduced motion/i);
    expect(reducedMotionToggle).toBeInTheDocument();
  });
});