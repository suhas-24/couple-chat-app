/**
 * Accessibility context for managing global accessibility settings and preferences
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { announceToScreenReader, prefersReducedMotion, prefersHighContrast } from '@/lib/accessibility';

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  announcements: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
}

export interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  isHighContrast: boolean;
  isReducedMotion: boolean;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
  announcements: true,
  keyboardNavigation: true,
  focusVisible: true,
};

const FONT_SIZE_MAP = {
  'small': '14px',
  'medium': '16px',
  'large': '18px',
  'extra-large': '20px',
};

const FONT_SIZE_ORDER: AccessibilitySettings['fontSize'][] = ['small', 'medium', 'large', 'extra-large'];

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.warn('Failed to parse accessibility settings:', error);
      }
    }

    // Check system preferences
    setIsHighContrast(prefersHighContrast());
    setIsReducedMotion(prefersReducedMotion());
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  // Apply CSS custom properties based on settings
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    root.style.setProperty('--font-size-base', FONT_SIZE_MAP[settings.fontSize]);
    
    // High contrast
    if (settings.highContrast || isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (settings.reducedMotion || isReducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Focus visible
    if (settings.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
  }, [settings, isHighContrast, isReducedMotion]);

  // Listen for system preference changes
  useEffect(() => {
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    contrastQuery.addEventListener('change', handleContrastChange);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      contrastQuery.removeEventListener('change', handleContrastChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    
    if (settings.announcements) {
      announceToScreenReader('Accessibility settings updated');
    }
  };

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.announcements) {
      announceToScreenReader(message, priority);
    }
  };

  const toggleHighContrast = () => {
    updateSettings({ highContrast: !settings.highContrast });
    announce(`High contrast ${!settings.highContrast ? 'enabled' : 'disabled'}`);
  };

  const toggleReducedMotion = () => {
    updateSettings({ reducedMotion: !settings.reducedMotion });
    announce(`Reduced motion ${!settings.reducedMotion ? 'enabled' : 'disabled'}`);
  };

  const increaseFontSize = () => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(settings.fontSize);
    if (currentIndex < FONT_SIZE_ORDER.length - 1) {
      const newSize = FONT_SIZE_ORDER[currentIndex + 1];
      updateSettings({ fontSize: newSize });
      announce(`Font size increased to ${newSize}`);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(settings.fontSize);
    if (currentIndex > 0) {
      const newSize = FONT_SIZE_ORDER[currentIndex - 1];
      updateSettings({ fontSize: newSize });
      announce(`Font size decreased to ${newSize}`);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    announce('Accessibility settings reset to default');
  };

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    announce,
    isHighContrast: settings.highContrast || isHighContrast,
    isReducedMotion: settings.reducedMotion || isReducedMotion,
    toggleHighContrast,
    toggleReducedMotion,
    increaseFontSize,
    decreaseFontSize,
    resetSettings,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityContext(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
}

export default AccessibilityContext;