import React, { useState, useEffect } from 'react';
import { Heart, Moon, Sun, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface RomanticThemeToggleProps {
  onThemeChange?: (theme: 'light' | 'dark' | 'romantic') => void;
  className?: string;
}

export const RomanticThemeToggle: React.FC<RomanticThemeToggleProps> = ({
  onThemeChange,
  className
}) => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'romantic'>('light');
  const [romanticMode, setRomanticMode] = useState(false);

  useEffect(() => {
    // Check system preference and saved theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'romantic';
    const romanticModeEnabled = localStorage.getItem('romanticMode') === 'true';
    
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setCurrentTheme('dark');
    }
    
    setRomanticMode(romanticModeEnabled);
    applyTheme(savedTheme || 'light', romanticModeEnabled);
  }, []);

  const applyTheme = (theme: 'light' | 'dark' | 'romantic', romantic: boolean = false) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark', 'romantic');
    
    // Apply new theme
    root.classList.add(theme);
    
    // Apply romantic mode
    if (romantic || theme === 'romantic') {
      root.classList.add('romantic-mode');
    } else {
      root.classList.remove('romantic-mode');
    }
    
    // Save preferences
    localStorage.setItem('theme', theme);
    localStorage.setItem('romanticMode', String(romantic || theme === 'romantic'));
    
    // Notify parent component
    onThemeChange?.(theme);
  };

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'romantic'> = ['light', 'dark', 'romantic'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    
    setCurrentTheme(nextTheme);
    setRomanticMode(nextTheme === 'romantic');
    applyTheme(nextTheme, nextTheme === 'romantic');
  };

  const toggleRomanticMode = () => {
    const newRomanticMode = !romanticMode;
    setRomanticMode(newRomanticMode);
    applyTheme(currentTheme, newRomanticMode);
  };

  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'romantic':
        return <Heart className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (currentTheme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'romantic':
        return 'Romantic';
      default:
        return 'Light';
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300",
          currentTheme === 'romantic' && "bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20",
          currentTheme === 'dark' && "bg-gray-100 dark:bg-gray-800",
          "hover:scale-105"
        )}
        title={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
      >
        <span className={cn(
          "transition-all duration-300",
          currentTheme === 'romantic' && "animate-heartbeat text-pink-500"
        )}>
          {getThemeIcon()}
        </span>
        <span className="text-sm font-medium">{getThemeLabel()}</span>
      </Button>

      {/* Romantic Mode Toggle (separate from theme) */}
      {currentTheme !== 'romantic' && (
        <Button
          variant={romanticMode ? "love" : "ghost"}
          size="sm"
          onClick={toggleRomanticMode}
          className={cn(
            "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300",
            romanticMode && "animate-gentle-pulse",
            "hover:scale-105"
          )}
          title={`Romantic mode: ${romanticMode ? 'ON' : 'OFF'}`}
        >
          <div className="relative">
            <Sparkles className={cn(
              "w-4 h-4 transition-all duration-300",
              romanticMode ? "text-white animate-sparkle" : "text-gray-500"
            )} />
            {romanticMode && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-400 rounded-full animate-gentle-pulse" />
            )}
          </div>
          <span className="text-sm font-medium">
            {romanticMode ? 'Romantic' : 'Normal'}
          </span>
        </Button>
      )}

      {/* Theme Preview Indicator */}
      <div className="flex items-center space-x-1">
        <div className={cn(
          "w-3 h-3 rounded-full border-2 transition-all duration-300",
          currentTheme === 'light' && "bg-yellow-400 border-yellow-500",
          currentTheme === 'dark' && "bg-gray-800 border-gray-700",
          currentTheme === 'romantic' && "bg-gradient-to-r from-pink-400 to-rose-400 border-pink-500 animate-gentle-pulse"
        )} />
        {romanticMode && currentTheme !== 'romantic' && (
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-sparkle" />
        )}
      </div>
    </div>
  );
};

export default RomanticThemeToggle;