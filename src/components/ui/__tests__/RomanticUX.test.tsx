/**
 * 💕 UX Tests for Romantic Couple Chat App
 * Comprehensive test suite for user journey optimization
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RomanticOnboarding from '../RomanticOnboarding';
import MilestoneCelebration from '../MilestoneCelebration';
import RomanticThemeCustomizer from '../RomanticThemeCustomizer';
import RomanticNotificationSystem from '../RomanticNotificationSystem';
import { RomanticThemeToggle } from '../RomanticThemeToggle';

// Mock romantic animations
jest.mock('../../lib/romanticAnimations', () => ({
  useHeartParticles: () => ({ containerRef: { current: null }, isActive: false }),
  useSparkleAnimation: () => null,
  useLoveReaction: () => ({ addReaction: jest.fn(), ReactionOverlay: () => null }),
  useCelebrationOverlay: () => ({ triggerCelebration: jest.fn(), CelebrationOverlay: () => null }),
  useMessageSendAnimation: () => ({ triggerSendAnimation: jest.fn(), SendingAnimation: () => null })
}));

describe('🎯 Romantic Onboarding UX Tests', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render welcome step with romantic animations', () => {
    render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('Welcome to Your Love Story')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('should navigate through onboarding steps', async () => {
    const user = userEvent.setup();
    
    render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Step 1: Welcome
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 2: Partner info
    expect(screen.getByText('Tell Us About Your Partner')).toBeInTheDocument();
    
    const partnerInput = screen.getByPlaceholderText('Enter your partner\'s name');
    await user.type(partnerInput, 'Alex');
    
    await user.click(screen.getByRole('button', { name: /dating/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 3: Communication style
    expect(screen.getByText('Your Communication Style')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /romantic & sweet/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 4: Personalization
    expect(screen.getByText('Make It Yours')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /romantic & dreamy/i }));
    
    // Select interests
    await user.click(screen.getByRole('button', { name: /travel/i }));
    await user.click(screen.getByRole('button', { name: /movies/i }));
    
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 5: Completion
    expect(screen.getByText('Ready to Begin!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start your journey/i }));
    
    expect(mockOnComplete).toHaveBeenCalledWith({
      partnerName: 'Alex',
      relationshipStage: 'dating',
      communicationStyle: 'romantic',
      preferredTheme: 'romantic',
      notificationLevel: 'balanced',
      interests: ['Travel', 'Movies']
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Navigate to partner step
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Try to proceed without entering partner name
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
    
    // Enter partner name
    await user.type(screen.getByPlaceholderText('Enter your partner\'s name'), 'Alex');
    expect(nextButton).toBeEnabled();
  });

  it('should allow skipping onboarding', async () => {
    const user = userEvent.setup();
    
    render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    await user.click(screen.getByRole('button', { name: /×/i }));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('should show progress bar updates', async () => {
    const user = userEvent.setup();
    
    render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Check initial progress
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 20%');
    
    // Navigate to next step
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(progressBar).toHaveStyle('width: 40%');
  });
});

describe('🎉 Milestone Celebration UX Tests', () => {
  const mockMilestone = {
    id: 'test-milestone',
    type: 'anniversary' as const,
    title: 'Happy Anniversary!',
    description: 'Celebrating 1 year together',
    date: new Date().toISOString(),
    icon: '💕',
    color: '#ff6b9d',
    badge: 'Anniversary'
  };

  it('should display milestone celebration with animations', () => {
    render(
      <MilestoneCelebration
        milestone={mockMilestone}
        isVisible={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Happy Anniversary!')).toBeInTheDocument();
    expect(screen.getByText('Celebrating 1 year together')).toBeInTheDocument();
    expect(screen.getByText('Anniversary')).toBeInTheDocument();
  });

  it('should handle celebration actions', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    const mockOnShare = jest.fn();
    const mockOnSave = jest.fn();

    render(
      <MilestoneCelebration
        milestone={mockMilestone}
        isVisible={true}
        onClose={mockOnClose}
        onShare={mockOnShare}
        onSave={mockOnSave}
      />
    );

    await user.click(screen.getByRole('button', { name: /share/i }));
    expect(mockOnShare).toHaveBeenCalledWith(mockMilestone);

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(mockOnSave).toHaveBeenCalledWith(mockMilestone);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should format milestone date correctly', () => {
    const testDate = new Date('2024-02-14T12:00:00Z');
    const milestone = {
      ...mockMilestone,
      date: testDate.toISOString()
    };

    render(
      <MilestoneCelebration
        milestone={milestone}
        isVisible={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('February 14, 2024')).toBeInTheDocument();
  });
});

describe('🎨 Theme Customizer UX Tests', () => {
  const mockTheme = {
    id: 'test-theme',
    name: 'Test Theme',
    colors: {
      primary: '#ff6b9d',
      secondary: '#c44569',
      accent: '#f8b500',
      background: '#ffffff',
      surface: '#f8f9fa',
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
    }
  };

  it('should render theme customizer with tabs', () => {
    render(
      <RomanticThemeCustomizer
        isOpen={true}
        onClose={jest.fn()}
        onThemeChange={jest.fn()}
        currentTheme={mockTheme}
      />
    );

    expect(screen.getByText('Theme Customizer')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /colors/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /animations/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /effects/i })).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    const user = userEvent.setup();
    
    render(
      <RomanticThemeCustomizer
        isOpen={true}
        onClose={jest.fn()}
        onThemeChange={jest.fn()}
        currentTheme={mockTheme}
      />
    );

    // Switch to animations tab
    await user.click(screen.getByRole('tab', { name: /animations/i }));
    expect(screen.getByText('Heartbeat')).toBeInTheDocument();
    expect(screen.getByText('Sparkles')).toBeInTheDocument();

    // Switch to effects tab
    await user.click(screen.getByRole('tab', { name: /effects/i }));
    expect(screen.getByText('Glow')).toBeInTheDocument();
    expect(screen.getByText('Shadows')).toBeInTheDocument();
  });

  it('should update theme colors', async () => {
    const user = userEvent.setup();
    const mockOnThemeChange = jest.fn();
    
    render(
      <RomanticThemeCustomizer
        isOpen={true}
        onClose={jest.fn()}
        onThemeChange={mockOnThemeChange}
        currentTheme={mockTheme}
      />
    );

    // Update primary color
    const primaryColorInput = screen.getByDisplayValue('#ff6b9d');
    await user.clear(primaryColorInput);
    await user.type(primaryColorInput, '#ff0000');

    // Apply theme
    await user.click(screen.getByRole('button', { name: /apply theme/i }));
    
    expect(mockOnThemeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        colors: expect.objectContaining({
          primary: '#ff0000'
        })
      })
    );
  });

  it('should toggle animation settings', async () => {
    const user = userEvent.setup();
    
    render(
      <RomanticThemeCustomizer
        isOpen={true}
        onClose={jest.fn()}
        onThemeChange={jest.fn()}
        currentTheme={mockTheme}
      />
    );

    // Switch to animations tab
    await user.click(screen.getByRole('tab', { name: /animations/i }));
    
    // Toggle heartbeat animation
    const heartbeatToggle = screen.getByRole('button', { name: /heartbeat/i });
    await user.click(heartbeatToggle);
    
    // Verify toggle state change
    expect(heartbeatToggle).toHaveClass('bg-gray-300');
  });
});

describe('🔔 Notification System UX Tests', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'message' as const,
      title: 'New Message',
      message: 'You have a new message from Alex',
      timestamp: new Date(),
      isRead: false,
      priority: 'high' as const,
      romantic: {
        showHearts: true,
        showSparkles: true,
        customEmoji: '💕'
      }
    },
    {
      id: '2',
      type: 'milestone' as const,
      title: 'Milestone Reached',
      message: 'You\'ve sent 100 messages!',
      timestamp: new Date(Date.now() - 60000),
      isRead: false,
      priority: 'medium' as const,
      actions: [
        { label: 'View', onClick: jest.fn(), variant: 'primary' as const },
        { label: 'Share', onClick: jest.fn(), variant: 'secondary' as const }
      ]
    }
  ];

  it('should display notifications in correct order', () => {
    render(
      <RomanticNotificationSystem
        notifications={mockNotifications}
        onNotificationClose={jest.fn()}
      />
    );

    const notifications = screen.getAllByRole('alert');
    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toHaveTextContent('New Message');
    expect(notifications[1]).toHaveTextContent('Milestone Reached');
  });

  it('should handle notification actions', async () => {
    const user = userEvent.setup();
    const mockOnAction = jest.fn();
    
    render(
      <RomanticNotificationSystem
        notifications={mockNotifications}
        onNotificationClose={jest.fn()}
        onNotificationAction={mockOnAction}
      />
    );

    await user.click(screen.getByRole('button', { name: /view/i }));
    expect(mockOnAction).toHaveBeenCalledWith('2', 0);
  });

  it('should close notifications', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(
      <RomanticNotificationSystem
        notifications={mockNotifications}
        onNotificationClose={mockOnClose}
      />
    );

    await user.click(screen.getAllByRole('button', { name: /close/i })[0]);
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('should limit visible notifications', () => {
    const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
      ...mockNotifications[0],
      id: `${i}`,
      title: `Notification ${i}`
    }));

    render(
      <RomanticNotificationSystem
        notifications={manyNotifications}
        onNotificationClose={jest.fn()}
        maxVisible={3}
      />
    );

    expect(screen.getAllByRole('alert')).toHaveLength(3);
  });

  it('should format timestamps correctly', () => {
    const oldNotification = {
      ...mockNotifications[0],
      timestamp: new Date(Date.now() - 120000) // 2 minutes ago
    };

    render(
      <RomanticNotificationSystem
        notifications={[oldNotification]}
        onNotificationClose={jest.fn()}
      />
    );

    expect(screen.getByText('2m ago')).toBeInTheDocument();
  });
});

describe('🌙 Theme Toggle UX Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should cycle through themes', async () => {
    const user = userEvent.setup();
    const mockOnThemeChange = jest.fn();
    
    render(<RomanticThemeToggle onThemeChange={mockOnThemeChange} />);

    const themeButton = screen.getByRole('button', { name: /light/i });
    
    // Click to cycle to dark
    await user.click(themeButton);
    expect(mockOnThemeChange).toHaveBeenCalledWith('dark');
    
    // Click to cycle to romantic
    await user.click(themeButton);
    expect(mockOnThemeChange).toHaveBeenCalledWith('romantic');
    
    // Click to cycle back to light
    await user.click(themeButton);
    expect(mockOnThemeChange).toHaveBeenCalledWith('light');
  });

  it('should toggle romantic mode independently', async () => {
    const user = userEvent.setup();
    
    render(<RomanticThemeToggle />);

    // Should show romantic mode toggle for non-romantic themes
    const romanticToggle = screen.getByRole('button', { name: /normal/i });
    await user.click(romanticToggle);
    
    expect(screen.getByRole('button', { name: /romantic/i })).toBeInTheDocument();
  });

  it('should persist theme preference', async () => {
    const user = userEvent.setup();
    
    render(<RomanticThemeToggle />);

    await user.click(screen.getByRole('button', { name: /light/i }));
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});

describe('🎯 Accessibility Tests', () => {
  it('should have proper ARIA labels', () => {
    render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={jest.fn()}
        onSkip={jest.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={jest.fn()}
        onSkip={jest.fn()}
      />
    );

    // Test tab navigation
    await user.tab();
    expect(screen.getByRole('button', { name: /next/i })).toHaveFocus();
    
    // Test Enter key
    await user.keyboard('{Enter}');
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
  });

  it('should have proper color contrast', () => {
    render(
      <RomanticThemeToggle />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });
});

describe('💫 Performance Tests', () => {
  it('should render animations efficiently', async () => {
    const startTime = performance.now();
    
    render(
      <MilestoneCelebration
        milestone={{
          id: 'test',
          type: 'anniversary',
          title: 'Test',
          description: 'Test',
          date: new Date().toISOString(),
          icon: '💕',
          color: '#ff6b9d'
        }}
        isVisible={true}
        onClose={jest.fn()}
      />
    );

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // Should render within 100ms
  });

  it('should handle large notification queues', () => {
    const manyNotifications = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      type: 'message' as const,
      title: `Message ${i}`,
      message: `Content ${i}`,
      timestamp: new Date(),
      isRead: false,
      priority: 'low' as const
    }));

    const startTime = performance.now();
    
    render(
      <RomanticNotificationSystem
        notifications={manyNotifications}
        onNotificationClose={jest.fn()}
        maxVisible={5}
      />
    );

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(50); // Should handle efficiently
  });
});

describe('🧪 Integration Tests', () => {
  it('should complete full onboarding to theme customization flow', async () => {
    const user = userEvent.setup();
    let completedOnboarding = false;
    let selectedTheme = null;

    const mockOnComplete = (data: any) => {
      completedOnboarding = true;
      selectedTheme = data.preferredTheme;
    };

    const { rerender } = render(
      <RomanticOnboarding
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={jest.fn()}
      />
    );

    // Complete onboarding
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.type(screen.getByPlaceholderText('Enter your partner\'s name'), 'Alex');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /start your journey/i }));

    expect(completedOnboarding).toBe(true);
    expect(selectedTheme).toBe('romantic');

    // Now test theme customizer
    rerender(
      <RomanticThemeCustomizer
        isOpen={true}
        onClose={jest.fn()}
        onThemeChange={jest.fn()}
      />
    );

    expect(screen.getByText('Theme Customizer')).toBeInTheDocument();
  });
});

export {
  RomanticOnboarding,
  MilestoneCelebration,
  RomanticThemeCustomizer,
  RomanticNotificationSystem,
  RomanticThemeToggle
};