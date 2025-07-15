/**
 * 💕 Romantic Design System for Couple Chat App
 * Enhanced theme with comprehensive color palettes, animations, and visual elements
 */

// Core Romantic Color Palette
export const romanticColors = {
  // Primary romantic colors
  primary: {
    50: '#fef7f0',
    100: '#fdeee1',
    200: '#fad4c3',
    300: '#f6b5a5',
    400: '#f19687',
    500: '#ef427c', // Main primary
    600: '#e91e63',
    700: '#c2185b',
    800: '#ad1457',
    900: '#880e4f',
  },
  
  // Secondary romantic colors
  secondary: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0',
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c',
  },
  
  // Romantic accent colors
  accent: {
    rose: '#ff69b4',
    blush: '#ffb6c1',
    coral: '#ff7f7f',
    lavender: '#e6e6fa',
    champagne: '#f7e7ce',
    pearl: '#f8f6f0',
  },
  
  // Dark mode romantic colors
  darkMode: {
    background: '#0a0a0a',
    surface: '#1a1a1a',
    card: '#2a2a2a',
    primary: '#ff6b9d',
    secondary: '#c44569',
    accent: '#f8b500',
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#333333',
  },
  
  // Gradient combinations
  gradients: {
    sunrise: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
    sunset: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    twilight: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    romantic: 'linear-gradient(135deg, #ff6b9d 0%, #ffeaa7 100%)',
    passion: 'linear-gradient(135deg, #ff7675 0%, #fd79a8 100%)',
    dreamy: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  
  // Sentiment-based colors
  sentiment: {
    love: '#ff69b4',
    joy: '#ffd700',
    excitement: '#ff4757',
    calm: '#7bed9f',
    romantic: '#ff6b9d',
    playful: '#ff9ff3',
    caring: '#70a1ff',
    passionate: '#ff3838',
  },
} as const;

// Animation configurations
export const animations = {
  // Romantic micro-animations
  heartbeat: {
    name: 'heartbeat',
    duration: '1.5s',
    timing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: {
      '0%, 100%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
    },
  },
  
  floatingHearts: {
    name: 'floatingHearts',
    duration: '3s',
    timing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: {
      '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
      '50%': { transform: 'translateY(-20px) rotate(180deg)', opacity: '0.8' },
      '100%': { transform: 'translateY(0) rotate(360deg)', opacity: '1' },
    },
  },
  
  sparkle: {
    name: 'sparkle',
    duration: '2s',
    timing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: {
      '0%, 100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
      '25%': { transform: 'scale(1.1) rotate(90deg)', opacity: '0.8' },
      '50%': { transform: 'scale(0.9) rotate(180deg)', opacity: '0.6' },
      '75%': { transform: 'scale(1.1) rotate(270deg)', opacity: '0.8' },
    },
  },
  
  gentlePulse: {
    name: 'gentlePulse',
    duration: '2s',
    timing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.7' },
    },
  },
  
  slideInWithLove: {
    name: 'slideInWithLove',
    duration: '0.6s',
    timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: {
      '0%': { transform: 'translateY(30px) scale(0.8)', opacity: '0' },
      '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
    },
  },
  
  messageAppear: {
    name: 'messageAppear',
    duration: '0.4s',
    timing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: {
      '0%': { transform: 'translateY(20px) scale(0.9)', opacity: '0' },
      '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
    },
  },
  
  loveReaction: {
    name: 'loveReaction',
    duration: '0.8s',
    timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: {
      '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
      '50%': { transform: 'scale(1.2) rotate(180deg)', opacity: '1' },
      '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
    },
  },
} as const;

// Particle effects configuration
export const particles = {
  hearts: {
    count: 10,
    colors: ['#ff69b4', '#ff1493', '#ff6b9d', '#ffc0cb'],
    sizes: [12, 16, 20],
    animationDuration: 4000,
    spawnRate: 200,
  },
  
  sparkles: {
    count: 15,
    colors: ['#ffd700', '#ffeb3b', '#fff176', '#fff59d'],
    sizes: [6, 8, 10],
    animationDuration: 2000,
    spawnRate: 150,
  },
  
  petals: {
    count: 8,
    colors: ['#ffb6c1', '#ffc0cb', '#dda0dd', '#f0e68c'],
    sizes: [8, 12, 16],
    animationDuration: 6000,
    spawnRate: 300,
  },
} as const;

// Typography scale for romantic feel
export const typography = {
  romantic: {
    fontFamily: "'Dancing Script', 'Great Vibes', cursive",
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  
  elegant: {
    fontFamily: "'Playfair Display', 'Cormorant Garamond', serif",
    fontWeight: '400',
    letterSpacing: '0.01em',
  },
  
  casual: {
    fontFamily: "'Poppins', 'Inter', sans-serif",
    fontWeight: '400',
    letterSpacing: '0.01em',
  },
  
  headings: {
    h1: { fontSize: '2.5rem', fontWeight: '700', lineHeight: '1.2' },
    h2: { fontSize: '2rem', fontWeight: '600', lineHeight: '1.3' },
    h3: { fontSize: '1.5rem', fontWeight: '500', lineHeight: '1.4' },
    h4: { fontSize: '1.25rem', fontWeight: '500', lineHeight: '1.4' },
  },
} as const;

// Romantic shadows and effects
export const effects = {
  shadows: {
    soft: '0 4px 20px rgba(255, 107, 157, 0.15)',
    medium: '0 8px 30px rgba(255, 107, 157, 0.2)',
    strong: '0 12px 40px rgba(255, 107, 157, 0.25)',
    glow: '0 0 20px rgba(255, 107, 157, 0.3)',
    romantic: '0 4px 20px rgba(255, 105, 180, 0.3)',
  },
  
  blurs: {
    subtle: 'blur(0.5px)',
    medium: 'blur(1px)',
    strong: 'blur(2px)',
  },
  
  filters: {
    warm: 'sepia(0.2) saturate(1.1) hue-rotate(330deg)',
    dreamy: 'blur(0.5px) saturate(1.2) brightness(1.1)',
    vintage: 'sepia(0.3) contrast(1.1) saturate(0.9)',
  },
} as const;

// Romantic spacing and sizing
export const spacing = {
  romantic: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  
  component: {
    padding: {
      button: '0.75rem 1.5rem',
      card: '1.5rem',
      modal: '2rem',
      input: '1rem',
    },
    
    borderRadius: {
      sm: '0.375rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
      romantic: '1.5rem',
    },
  },
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  mobile: '375px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

// Theme variants
export const themes = {
  classic: {
    primary: romanticColors.primary[500],
    secondary: romanticColors.secondary[500],
    background: romanticColors.darkMode.background,
    accent: romanticColors.accent.rose,
  },
  
  sunset: {
    primary: '#ff6b9d',
    secondary: '#f093fb',
    background: '#1a1a2e',
    accent: '#ffeaa7',
  },
  
  vintage: {
    primary: '#d63384',
    secondary: '#6f42c1',
    background: '#2d1b38',
    accent: '#ffc107',
  },
  
  minimalist: {
    primary: '#ff69b4',
    secondary: '#dda0dd',
    background: '#0f0f0f',
    accent: '#87ceeb',
  },
} as const;

// Utility functions
export const utils = {
  // Generate random romantic colors
  getRandomRomanticColor: () => {
    const colors = Object.values(romanticColors.accent);
    return colors[Math.floor(Math.random() * colors.length)];
  },
  
  // Generate romantic gradient
  createRomanticGradient: (color1: string, color2: string, angle = 135) => {
    return `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
  },
  
  // Apply romantic animation
  applyAnimation: (element: HTMLElement, animationName: keyof typeof animations) => {
    const animation = animations[animationName];
    const iteration = 'iteration' in animation ? animation.iteration : '';
    element.style.animation = `${animation.name} ${animation.duration} ${animation.timing} ${iteration}`;
  },
  
  // Get theme-aware color
  getThemeColor: (colorKey: string, theme: keyof typeof themes = 'classic') => {
    const selectedTheme = themes[theme];
    return selectedTheme[colorKey as keyof typeof selectedTheme] || colorKey;
  },
} as const;

export default {
  colors: romanticColors,
  animations,
  particles,
  typography,
  effects,
  spacing,
  breakpoints,
  themes,
  utils,
};