/**
 * Accessibility settings component for managing user preferences
 */

import React, { useState } from 'react';
import { Settings, Eye, Volume2, Keyboard, Type, Contrast, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityContext } from '@/context/AccessibilityContext';
import { Button } from './button';
import { Card } from './card';

export interface AccessibilitySettingsProps {
  className?: string;
  onClose?: () => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  className,
  onClose,
}) => {
  const {
    settings,
    updateSettings,
    isHighContrast,
    isReducedMotion,
    toggleHighContrast,
    toggleReducedMotion,
    increaseFontSize,
    decreaseFontSize,
    resetSettings,
    announce,
  } = useAccessibilityContext();

  const [activeTab, setActiveTab] = useState<'visual' | 'audio' | 'keyboard'>('visual');

  const handleToggle = (setting: keyof typeof settings) => {
    const newValue = !settings[setting];
    updateSettings({ [setting]: newValue });
    announce(`${setting} ${newValue ? 'enabled' : 'disabled'}`);
  };

  const tabs = [
    { id: 'visual' as const, label: 'Visual', icon: Eye },
    { id: 'audio' as const, label: 'Audio', icon: Volume2 },
    { id: 'keyboard' as const, label: 'Keyboard', icon: Keyboard },
  ];

  return (
    <Card className={cn('p-6 max-w-2xl mx-auto', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Accessibility Settings</h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close accessibility settings"
          >
            ✕
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Visual Settings */}
      {activeTab === 'visual' && (
        <div id="visual-panel" role="tabpanel" aria-labelledby="visual-tab">
          <div className="space-y-6">
            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">High Contrast Mode</label>
                <p className="text-sm text-gray-600">
                  Increases contrast for better visibility
                </p>
              </div>
              <button
                onClick={toggleHighContrast}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isHighContrast ? 'bg-primary' : 'bg-gray-200'
                )}
                aria-pressed={isHighContrast}
                aria-label="Toggle high contrast mode"
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    isHighContrast ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Reduce Motion</label>
                <p className="text-sm text-gray-600">
                  Minimizes animations and transitions
                </p>
              </div>
              <button
                onClick={toggleReducedMotion}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isReducedMotion ? 'bg-primary' : 'bg-gray-200'
                )}
                aria-pressed={isReducedMotion}
                aria-label="Toggle reduced motion"
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    isReducedMotion ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-sm font-medium mb-2 block">Font Size</label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseFontSize}
                  disabled={settings.fontSize === 'small'}
                  aria-label="Decrease font size"
                >
                  <Type className="w-3 h-3" />
                  -
                </Button>
                <span className="text-sm font-medium min-w-20 text-center">
                  {settings.fontSize}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseFontSize}
                  disabled={settings.fontSize === 'extra-large'}
                  aria-label="Increase font size"
                >
                  <Type className="w-4 h-4" />
                  +
                </Button>
              </div>
            </div>

            {/* Focus Visible */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enhanced Focus Indicators</label>
                <p className="text-sm text-gray-600">
                  Shows clear focus outlines for keyboard navigation
                </p>
              </div>
              <button
                onClick={() => handleToggle('focusVisible')}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.focusVisible ? 'bg-primary' : 'bg-gray-200'
                )}
                aria-pressed={settings.focusVisible}
                aria-label="Toggle enhanced focus indicators"
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    settings.focusVisible ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Settings */}
      {activeTab === 'audio' && (
        <div id="audio-panel" role="tabpanel" aria-labelledby="audio-tab">
          <div className="space-y-6">
            {/* Screen Reader Announcements */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Screen Reader Announcements</label>
                <p className="text-sm text-gray-600">
                  Announces important changes and updates
                </p>
              </div>
              <button
                onClick={() => handleToggle('announcements')}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.announcements ? 'bg-primary' : 'bg-gray-200'
                )}
                aria-pressed={settings.announcements}
                aria-label="Toggle screen reader announcements"
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    settings.announcements ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Test Announcement */}
            <div>
              <Button
                variant="outline"
                onClick={() => announce('This is a test announcement', 'polite')}
                className="w-full"
              >
                Test Screen Reader Announcement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Settings */}
      {activeTab === 'keyboard' && (
        <div id="keyboard-panel" role="tabpanel" aria-labelledby="keyboard-tab">
          <div className="space-y-6">
            {/* Keyboard Navigation */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enhanced Keyboard Navigation</label>
                <p className="text-sm text-gray-600">
                  Improves keyboard navigation throughout the app
                </p>
              </div>
              <button
                onClick={() => handleToggle('keyboardNavigation')}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.keyboardNavigation ? 'bg-primary' : 'bg-gray-200'
                )}
                aria-pressed={settings.keyboardNavigation}
                aria-label="Toggle enhanced keyboard navigation"
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    settings.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Keyboard Shortcuts Help */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Keyboard Shortcuts</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>• <kbd className="px-1 bg-gray-200 rounded">Tab</kbd> - Navigate forward</div>
                <div>• <kbd className="px-1 bg-gray-200 rounded">Shift + Tab</kbd> - Navigate backward</div>
                <div>• <kbd className="px-1 bg-gray-200 rounded">Enter</kbd> - Activate button/link</div>
                <div>• <kbd className="px-1 bg-gray-200 rounded">Space</kbd> - Activate button</div>
                <div>• <kbd className="px-1 bg-gray-200 rounded">Escape</kbd> - Close modal/menu</div>
                <div>• <kbd className="px-1 bg-gray-200 rounded">Ctrl + Shift + T</kbd> - Toggle Tamil input</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div className="mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={resetSettings}
          className="w-full"
        >
          <Zap className="w-4 h-4 mr-2" />
          Reset to Default Settings
        </Button>
      </div>
    </Card>
  );
};

export default AccessibilitySettings;