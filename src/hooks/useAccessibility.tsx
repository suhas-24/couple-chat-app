/**
 * Accessibility hooks for managing focus, keyboard navigation, and screen reader support
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface UseAccessibilityOptions {
  announceChanges?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
}

/**
 * Hook for managing focus and accessibility features
 */
export function useAccessibility(options: UseAccessibilityOptions = {}) {
  const { announceChanges = false, trapFocus = false, restoreFocus = false } = options;
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Check for user preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHighContrast = () => {
      const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches ||
                             window.matchMedia('(-ms-high-contrast: active)').matches;
      setIsHighContrast(hasHighContrast);
    };

    const checkReducedMotion = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReducedMotion(prefersReducedMotion);
    };

    checkHighContrast();
    checkReducedMotion();

    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    contrastQuery.addEventListener('change', checkHighContrast);
    motionQuery.addEventListener('change', checkReducedMotion);

    return () => {
      contrastQuery.removeEventListener('change', checkHighContrast);
      motionQuery.removeEventListener('change', checkReducedMotion);
    };
  }, []);

  // Announce changes to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceChanges || typeof window === 'undefined') return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [announceChanges]);

  // Save current focus for restoration
  const saveFocus = useCallback(() => {
    if (restoreFocus && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }
  }, [restoreFocus]);

  // Restore previously saved focus
  const restoreFocusToSaved = useCallback(() => {
    if (restoreFocus && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [restoreFocus]);

  return {
    isHighContrast,
    reducedMotion,
    announce,
    saveFocus,
    restoreFocus: restoreFocusToSaved,
  };
}

/**
 * Hook for managing focus trap within a container
 */
export function useFocusTrap(isActive: boolean = false) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Allow parent components to handle escape
        const escapeEvent = new CustomEvent('focustrap:escape', { bubbles: true });
        container.dispatchEvent(escapeEvent);
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    // Focus first element when trap becomes active
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for managing keyboard navigation
 */
export function useKeyboardNavigation(
  items: Array<{ id: string; element?: HTMLElement }>,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (id: string) => void;
  } = {}
) {
  const { loop = true, orientation = 'vertical', onSelect } = options;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isNavigating) return;

    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    let newIndex = activeIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (isVertical) {
          e.preventDefault();
          newIndex = activeIndex + 1;
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          e.preventDefault();
          newIndex = activeIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = activeIndex + 1;
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = activeIndex - 1;
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(items[activeIndex]?.id);
        return;
      case 'Escape':
        setIsNavigating(false);
        return;
    }

    // Handle wrapping
    if (newIndex < 0) {
      newIndex = loop ? items.length - 1 : 0;
    } else if (newIndex >= items.length) {
      newIndex = loop ? 0 : items.length - 1;
    }

    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      items[newIndex]?.element?.focus();
    }
  }, [activeIndex, isNavigating, items, loop, orientation, onSelect]);

  useEffect(() => {
    if (isNavigating) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isNavigating]);

  const startNavigation = useCallback((startIndex: number = 0) => {
    setActiveIndex(startIndex);
    setIsNavigating(true);
    items[startIndex]?.element?.focus();
  }, [items]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
  }, []);

  return {
    activeIndex,
    isNavigating,
    startNavigation,
    stopNavigation,
  };
}

/**
 * Hook for managing live regions and announcements
 */
export function useLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((
    message: string, 
    priority: 'off' | 'polite' | 'assertive' = 'polite'
  ) => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  const LiveRegion = useCallback(() => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  ), []);

  return { announce, LiveRegion };
}

/**
 * Hook for managing skip links
 */
export function useSkipLinks(links: Array<{ id: string; label: string; target: string }>) {
  const [isVisible, setIsVisible] = useState(false);

  const SkipLinks = useCallback(() => (
    <div className={`skip-links ${isVisible ? 'visible' : ''}`}>
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.target}`}
          className="skip-link"
          onFocus={() => setIsVisible(true)}
          onBlur={() => setIsVisible(false)}
        >
          {link.label}
        </a>
      ))}
    </div>
  ), [links, isVisible]);

  return { SkipLinks };
}