import React, { useState, useEffect } from 'react';
import { Palette, Heart, Moon, Sun, Sparkles, Save, RotateCcw, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { romanticColors } from '@/lib/romanticTheme';

interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  animations: {
    heartbeat: boolean;
    sparkles: boolean;
    particles: boolean;
    gentlePulse: boolean;
  };
  effects: {
    blur: number;
    glow: boolean;
    shadows: boolean;
    gradients: boolean;
  };
  isDefault?: boolean;
}

interface RomanticThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange: (theme: CustomTheme) => void;
  currentTheme?: CustomTheme;
  className?: string;
}

const defaultThemes: CustomTheme[] = [
  {
    id: 'romantic_classic',
    name: 'Romantic Classic',
    colors: {
      primary: '#ff6b9d',
      secondary: '#c44569',
      accent: '#f8b500',
      background: '#fff5f8',
      surface: '#ffffff',
      text: '#2d3748',
      textSecondary: '#718096'
    },
    animations: {
      heartbeat: true,
      sparkles: true,
      particles: true,
      gentlePulse: true
    },
    effects: {
      blur: 0,
      glow: true,
      shadows: true,
      gradients: true
    },
    isDefault: true
  },
  {
    id: 'romantic_dark',
    name: 'Romantic Dark',
    colors: {
      primary: '#ff6b9d',
      secondary: '#c44569',
      accent: '#ffd700',
      background: '#1a1a1a',
      surface: '#2d2d2d',
      text: '#ffffff',
      textSecondary: '#a0a0a0'
    },
    animations: {
      heartbeat: true,
      sparkles: true,
      particles: false,
      gentlePulse: true
    },
    effects: {
      blur: 0,
      glow: true,
      shadows: true,
      gradients: true
    },
    isDefault: true
  },
  {
    id: 'dreamy_pastels',
    name: 'Dreamy Pastels',
    colors: {
      primary: '#fbb6ce',
      secondary: '#c8a2c8',
      accent: '#ffcc5c',
      background: '#fef7ff',
      surface: '#fff0f5',
      text: '#4a5568',
      textSecondary: '#718096'
    },
    animations: {
      heartbeat: false,
      sparkles: true,
      particles: true,
      gentlePulse: true
    },
    effects: {
      blur: 2,
      glow: false,
      shadows: true,
      gradients: true
    },
    isDefault: true
  },
  {
    id: 'passionate_red',
    name: 'Passionate Red',
    colors: {
      primary: '#e53e3e',
      secondary: '#c53030',
      accent: '#feb2b2',
      background: '#fffafa',
      surface: '#fed7d7',
      text: '#2d3748',
      textSecondary: '#718096'
    },
    animations: {
      heartbeat: true,
      sparkles: false,
      particles: true,
      gentlePulse: false
    },
    effects: {
      blur: 0,
      glow: true,
      shadows: true,
      gradients: true
    },
    isDefault: true
  }
];

const colorPresets = {
  romantic: ['#ff6b9d', '#c44569', '#f8b500', '#ff69b4', '#ffc0cb'],
  purple: ['#9f7aea', '#805ad5', '#6b46c1', '#8b5cf6', '#a78bfa'],
  blue: ['#4299e1', '#3182ce', '#2b6cb0', '#4299e1', '#90cdf4'],
  green: ['#48bb78', '#38a169', '#2f855a', '#68d391', '#9ae6b4'],
  orange: ['#ed8936', '#dd6b20', '#c05621', '#f6ad55', '#fbd38d']
};

export const RomanticThemeCustomizer: React.FC<RomanticThemeCustomizerProps> = ({
  isOpen,
  onClose,
  onThemeChange,
  currentTheme,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'animations' | 'effects'>('colors');
  const [customTheme, setCustomTheme] = useState<CustomTheme>(
    currentTheme || defaultThemes[0]
  );
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    // Load saved themes from localStorage
    const saved = localStorage.getItem('romanticThemes');
    if (saved) {
      setSavedThemes(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (currentTheme) {
      setCustomTheme(currentTheme);
    }
  }, [currentTheme]);

  const saveTheme = () => {
    const newTheme = {
      ...customTheme,
      id: `custom_${Date.now()}`,
      name: customTheme.name || 'Custom Theme'
    };
    
    const updatedThemes = [...savedThemes, newTheme];
    setSavedThemes(updatedThemes);
    localStorage.setItem('romanticThemes', JSON.stringify(updatedThemes));
    
    // Auto-apply saved theme
    onThemeChange(newTheme);
  };

  const loadTheme = (theme: CustomTheme) => {
    setCustomTheme(theme);
    if (isPreview) {
      onThemeChange(theme);
    }
  };

  const resetToDefault = () => {
    setCustomTheme(defaultThemes[0]);
  };

  const exportTheme = () => {
    const dataStr = JSON.stringify(customTheme, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${customTheme.name.replace(/\s+/g, '_')}_theme.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTheme = JSON.parse(e.target?.result as string);
          setCustomTheme(importedTheme);
        } catch (error) {
          console.error('Error importing theme:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const updateThemeColor = (colorKey: keyof CustomTheme['colors'], value: string) => {
    setCustomTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }));
  };

  const updateThemeAnimation = (animationKey: keyof CustomTheme['animations'], value: boolean) => {
    setCustomTheme(prev => ({
      ...prev,
      animations: {
        ...prev.animations,
        [animationKey]: value
      }
    }));
  };

  const updateThemeEffect = (effectKey: keyof CustomTheme['effects'], value: boolean | number) => {
    setCustomTheme(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [effectKey]: value
      }
    }));
  };

  const applyTheme = () => {
    onThemeChange(customTheme);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden",
        className
      )}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Theme Customizer
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create your perfect romantic theme
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
                className={cn(
                  "flex items-center space-x-2",
                  isPreview && "bg-pink-100 text-pink-600"
                )}
              >
                <span>Preview</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            </div>
          </div>
        </div>

        {/* Theme Name */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={customTheme.name}
            onChange={(e) => setCustomTheme(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white"
            placeholder="Theme name"
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'colors', label: 'Colors', icon: Palette },
            { id: 'animations', label: 'Animations', icon: Sparkles },
            { id: 'effects', label: 'Effects', icon: Heart }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-pink-600 border-b-2 border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'colors' && (
            <div className="space-y-6">
              {/* Color Presets */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Color Presets
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(colorPresets).map(([name, colors]) => (
                    <div key={name} className="space-y-1">
                      <div className="text-xs text-gray-500 capitalize">{name}</div>
                      <div className="flex space-x-1">
                        {colors.map((color, index) => (
                          <button
                            key={index}
                            onClick={() => updateThemeColor('primary', color)}
                            className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Controls */}
              <div className="space-y-4">
                {Object.entries(customTheme.colors).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-3">
                    <label className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => updateThemeColor(key as keyof CustomTheme['colors'], e.target.value)}
                      className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateThemeColor(key as keyof CustomTheme['colors'], e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'animations' && (
            <div className="space-y-4">
              {Object.entries(customTheme.animations).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <button
                    onClick={() => updateThemeAnimation(key as keyof CustomTheme['animations'], !value)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      value ? "bg-pink-500" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                      value ? "translate-x-6" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'effects' && (
            <div className="space-y-4">
              {Object.entries(customTheme.effects).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  {typeof value === 'boolean' ? (
                    <button
                      onClick={() => updateThemeEffect(key as keyof CustomTheme['effects'], !value)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        value ? "bg-pink-500" : "bg-gray-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                        value ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </button>
                  ) : (
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={value}
                      onChange={(e) => updateThemeEffect(key as keyof CustomTheme['effects'], parseInt(e.target.value))}
                      className="w-24"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preset Themes */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Preset Themes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {defaultThemes.map(theme => (
              <button
                key={theme.id}
                onClick={() => loadTheme(theme)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                  customTheme.id === theme.id
                    ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-pink-300"
                )}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {theme.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={exportTheme}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="romantic" onClick={saveTheme}>
              <Save className="w-4 h-4 mr-2" />
              Save Theme
            </Button>
            <Button variant="love" onClick={applyTheme}>
              Apply Theme
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RomanticThemeCustomizer;