/**
 * Accessibility utility functions and constants
 */

// ARIA roles and properties
export const ARIA_ROLES = {
  BUTTON: 'button',
  DIALOG: 'dialog',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  LISTBOX: 'listbox',
  OPTION: 'option',
  ALERT: 'alert',
  STATUS: 'status',
  REGION: 'region',
  BANNER: 'banner',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
} as const;

export const ARIA_STATES = {
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  PRESSED: 'aria-pressed',
  CURRENT: 'aria-current',
} as const;

export const ARIA_PROPERTIES = {
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  RELEVANT: 'aria-relevant',
  BUSY: 'aria-busy',
  CONTROLS: 'aria-controls',
  OWNS: 'aria-owns',
  ACTIVEDESCENDANT: 'aria-activedescendant',
  LEVEL: 'aria-level',
  SETSIZE: 'aria-setsize',
  POSINSET: 'aria-posinset',
} as const;

// Keyboard key constants
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * Generates a unique ID for accessibility purposes
 */
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates ARIA attributes object
 */
export function createAriaAttributes(attributes: Record<string, any>): Record<string, any> {
  const ariaAttributes: Record<string, any> = {};
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      ariaAttributes[key] = value;
    }
  });
  
  return ariaAttributes;
}

/**
 * Checks if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  
  const focusableSelectors = [
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];
  
  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'a[href]:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])',
  ];
  
  const elements = container.querySelectorAll(focusableSelectors.join(', '));
  return Array.from(elements).filter(el => isFocusable(el as HTMLElement)) as HTMLElement[];
}

/**
 * Manages focus within a container (focus trap)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== KEYS.TAB) return;
    
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
  
  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announces a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Creates a roving tabindex manager for a group of elements
 */
export function createRovingTabindex(elements: HTMLElement[]): {
  setActive: (index: number) => void;
  getActive: () => number;
  destroy: () => void;
} {
  let activeIndex = 0;
  
  const updateTabindex = () => {
    elements.forEach((element, index) => {
      element.tabIndex = index === activeIndex ? 0 : -1;
    });
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    let newIndex = activeIndex;
    
    switch (e.key) {
      case KEYS.ARROW_DOWN:
      case KEYS.ARROW_RIGHT:
        e.preventDefault();
        newIndex = (activeIndex + 1) % elements.length;
        break;
      case KEYS.ARROW_UP:
      case KEYS.ARROW_LEFT:
        e.preventDefault();
        newIndex = (activeIndex - 1 + elements.length) % elements.length;
        break;
      case KEYS.HOME:
        e.preventDefault();
        newIndex = 0;
        break;
      case KEYS.END:
        e.preventDefault();
        newIndex = elements.length - 1;
        break;
      default:
        return;
    }
    
    activeIndex = newIndex;
    updateTabindex();
    elements[activeIndex]?.focus();
  };
  
  const handleFocus = (e: FocusEvent) => {
    const index = elements.indexOf(e.target as HTMLElement);
    if (index !== -1) {
      activeIndex = index;
      updateTabindex();
    }
  };
  
  // Initialize
  updateTabindex();
  elements.forEach(element => {
    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('focus', handleFocus);
  });
  
  return {
    setActive: (index: number) => {
      if (index >= 0 && index < elements.length) {
        activeIndex = index;
        updateTabindex();
      }
    },
    getActive: () => activeIndex,
    destroy: () => {
      elements.forEach(element => {
        element.removeEventListener('keydown', handleKeyDown);
        element.removeEventListener('focus', handleFocus);
        element.tabIndex = 0; // Reset to default
      });
    },
  };
}

/**
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Checks if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches ||
         window.matchMedia('(-ms-high-contrast: active)').matches;
}

/**
 * Gets color contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  // This is a simplified version - in production, you'd want a more robust color parsing
  const getLuminance = (color: string): number => {
    // Convert hex to RGB and calculate relative luminance
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Checks if color combination meets WCAG contrast requirements
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  } else {
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  }
}