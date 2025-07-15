/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
        "2xl": "3rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Custom breakpoints for specific use cases
      'mobile': {'max': '767px'},
      'tablet': {'min': '768px', 'max': '1023px'},
      'desktop': {'min': '1024px'},
      // Touch device detection
      'touch': {'raw': '(hover: none) and (pointer: coarse)'},
      'no-touch': {'raw': '(hover: hover) and (pointer: fine)'},
    },
    extend: {
      colors: {
        // LoveChat Theme Colors
        primary: '#ef427c',
        secondary: '#311b23',
        'dark-bg': '#121212',
        'sidebar-bg': '#1e1e1e',
        'chatlist-bg': '#121212',
        'input-bg': '#2c2c2c',
        'border-color': '#333333',
        'text-primary': '#ffffff',
        'text-secondary': '#a3a3a3',
        'chat-bubble-bg': '#26161a',
        'ai-chat-bubble-bg': '#2a2752',
        'ai-text-primary': '#a399ff',
        
        // Enhanced Romantic Color Palette
        'romantic-primary': {
          50: '#fef7f0',
          100: '#fdeee1',
          200: '#fad4c3',
          300: '#f6b5a5',
          400: '#f19687',
          500: '#ef427c',
          600: '#e91e63',
          700: '#c2185b',
          800: '#ad1457',
          900: '#880e4f',
        },
        
        'romantic-secondary': {
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
        
        'romantic-accent': {
          'rose': '#ff69b4',
          'blush': '#ffb6c1',
          'coral': '#ff7f7f',
          'lavender': '#e6e6fa',
          'champagne': '#f7e7ce',
          'pearl': '#f8f6f0',
        },
        
        // Dark Mode Romantic Colors
        'dark-romantic': {
          'bg': '#0a0a0a',
          'surface': '#1a1a1a',
          'card': '#2a2a2a',
          'primary': '#ff6b9d',
          'secondary': '#c44569',
          'accent': '#f8b500',
          'text': '#ffffff',
          'text-secondary': '#cccccc',
          'border': '#333333',
          'glow': 'rgba(255, 107, 157, 0.15)',
          'shadow': 'rgba(255, 107, 157, 0.25)',
        },
        
        // Sentiment Colors
        'sentiment': {
          'love': '#ff69b4',
          'joy': '#ffd700',
          'excitement': '#ff4757',
          'calm': '#7bed9f',
          'romantic': '#ff6b9d',
          'playful': '#ff9ff3',
          'caring': '#70a1ff',
          'passionate': '#ff3838',
        },
        
        // Keep existing colors for compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "bounce-gentle": "bounceGentle 0.6s ease-out",
        "heartbeat": "heartbeat 1.5s ease-in-out infinite",
        "floating-hearts": "floatingHearts 3s ease-in-out infinite",
        "sparkle": "sparkle 2s ease-in-out infinite",
        "gentle-pulse": "gentlePulse 2s ease-in-out infinite",
        "slide-in-with-love": "slideInWithLove 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "message-appear": "messageAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "love-reaction": "loveReaction 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "romantic-glow": "romanticGlow 2s ease-in-out infinite",
        "particle-float": "particleFloat 4s linear infinite",
        "love-bounce": "loveBounce 0.6s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
          '70%': { transform: 'translate3d(0, -4px, 0)' },
          '90%': { transform: 'translate3d(0, -2px, 0)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      maxWidth: {
        'xs': '20rem',
        'chat': '48rem',
        'analytics': '72rem',
      },
      fontFamily: {
        'plus-jakarta': ['Plus Jakarta Sans', 'Noto Sans', 'sans-serif'],
        'typewriter': ['Special Elite', 'cursive'],
        'tamil': ['Noto Sans Tamil', 'Mukti', 'Latha', 'Vijaya', 'Tamil Sangam MN', 'InaiMathi', 'system-ui', 'sans-serif'],
        'tanglish': ['Noto Sans Tamil', 'Plus Jakarta Sans', 'Mukti', 'Noto Sans', 'system-ui', 'sans-serif'],
        'sans': ['Plus Jakarta Sans', 'Noto Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require('@tailwindcss/forms')],
}
