import React, { useState, useEffect } from 'react';
import { Heart, Gift, Calendar, Award, Sparkles, X, Share2, Download, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useHeartParticles, useLoveReaction, useCelebrationOverlay } from '@/lib/romanticAnimations';

interface Milestone {
  id: string;
  type: 'anniversary' | 'first_message' | 'message_count' | 'streak' | 'custom';
  title: string;
  description: string;
  date: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
  achievement?: {
    count: number;
    unit: string;
  };
}

interface MilestoneCelebrationProps {
  milestone: Milestone;
  isVisible: boolean;
  onClose: () => void;
  onShare?: (milestone: Milestone) => void;
  onSave?: (milestone: Milestone) => void;
  className?: string;
}

const milestoneTypes = {
  anniversary: {
    gradient: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    celebration: 'hearts'
  },
  first_message: {
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    celebration: 'sparkles'
  },
  message_count: {
    gradient: 'from-blue-500 to-purple-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    celebration: 'confetti'
  },
  streak: {
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    celebration: 'fire'
  },
  custom: {
    gradient: 'from-green-500 to-teal-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    celebration: 'stars'
  }
};

export const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  milestone,
  isVisible,
  onClose,
  onShare,
  onSave,
  className
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  
  const milestoneStyle = milestoneTypes[milestone.type];
  
  // Romantic animations
  const { containerRef, isActive: heartsActive } = useHeartParticles(celebrationActive);
  const loveReaction = useLoveReaction() as any;
  const addReaction = loveReaction?.addReaction || (() => {});
  const ReactionOverlay = loveReaction?.ReactionOverlay || (() => null);
  const celebrationHook = useCelebrationOverlay() as any;
  const triggerCelebration = celebrationHook?.triggerCelebration || (() => {});
  const CelebrationOverlay = celebrationHook?.CelebrationOverlay || (() => null);

  useEffect(() => {
    if (isVisible) {
      setCelebrationActive(true);
      // Trigger celebration animation
      setTimeout(() => {
        triggerCelebration(milestone.type);
      }, 500);
      
      // Add reaction in center
      setTimeout(() => {
        addReaction('🎉', window.innerWidth / 2, window.innerHeight / 2);
      }, 1000);
    }
  }, [isVisible, milestone.type]);

  const handleShare = () => {
    onShare?.(milestone);
  };

  const handleSave = () => {
    onSave?.(milestone);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMilestoneMessage = () => {
    switch (milestone.type) {
      case 'anniversary':
        return `🎊 Celebrating your special day! Time flies when you're in love.`;
      case 'first_message':
        return `💌 Remember your first message? Look how far you've come!`;
      case 'message_count':
        return `📱 You've shared ${milestone.achievement?.count} messages of love!`;
      case 'streak':
        return `🔥 Amazing! You've been chatting for ${milestone.achievement?.count} days straight!`;
      case 'custom':
        return `✨ A special moment worth celebrating in your love story!`;
      default:
        return `🎉 Another beautiful milestone in your journey together!`;
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div
          ref={containerRef}
          className={cn(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-slide-in-with-love relative overflow-hidden",
            className
          )}
        >
          {/* Background decoration */}
          <div className={cn(
            "absolute inset-0 opacity-5 bg-gradient-to-r",
            milestoneStyle.gradient
          )} />
          
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center space-y-4">
              {/* Milestone icon */}
              <div className="relative inline-block">
                <div className={cn(
                  "w-16 h-16 rounded-full bg-gradient-to-r text-white flex items-center justify-center animate-gentle-pulse",
                  milestoneStyle.gradient
                )}>
                  {milestone.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-sparkle">
                  <Sparkles className="w-4 h-4 text-white m-1" />
                </div>
              </div>
              
              {/* Milestone title */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {milestone.title}
                </h2>
                {milestone.badge && (
                  <div className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                    milestoneStyle.bgColor,
                    milestoneStyle.borderColor,
                    "border"
                  )}>
                    <Award className="w-4 h-4 mr-1" />
                    {milestone.badge}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Milestone message */}
            <div className={cn(
              "p-4 rounded-lg border",
              milestoneStyle.bgColor,
              milestoneStyle.borderColor
            )}>
              <p className="text-center text-gray-700 dark:text-gray-300">
                {getMilestoneMessage()}
              </p>
            </div>
            
            {/* Milestone details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Description
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {milestone.description}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Date
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDate(milestone.date)}
                </span>
              </div>
              
              {milestone.achievement && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Achievement
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {milestone.achievement.count} {milestone.achievement.unit}
                  </span>
                </div>
              )}
            </div>
            
            {/* Celebration quote */}
            <div className="text-center py-4">
              <p className="text-sm italic text-gray-500 dark:text-gray-400">
                "Every love story is beautiful, but yours is our favorite." 💕
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="px-6 pb-6 flex justify-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Save</span>
            </Button>
            
            <Button
              variant="romantic"
              size="sm"
              onClick={onClose}
              className="flex items-center space-x-2"
              showHeartIcon
            >
              <span>Continue</span>
            </Button>
          </div>
          
          {/* Floating hearts for extra celebration */}
          {celebrationActive && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 text-pink-400 animate-floating-hearts">❤️</div>
              <div className="absolute top-1/3 right-1/4 text-rose-400 animate-floating-hearts" style={{ animationDelay: '0.5s' }}>💕</div>
              <div className="absolute bottom-1/3 left-1/3 text-purple-400 animate-floating-hearts" style={{ animationDelay: '1s' }}>💖</div>
              <div className="absolute bottom-1/4 right-1/3 text-pink-400 animate-floating-hearts" style={{ animationDelay: '1.5s' }}>🌹</div>
            </div>
          )}
        </div>
      </div>
      
      <ReactionOverlay />
      <CelebrationOverlay />
    </>
  );
};

// Milestone tracking system
export const useMilestoneTracker = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

  const createMilestone = (type: Milestone['type'], data: Partial<Milestone>): Milestone => {
    const baseId = `${type}_${Date.now()}`;
    const common = {
      id: baseId,
      type,
      date: new Date().toISOString(),
      color: milestoneTypes[type].gradient,
      ...data
    };

    switch (type) {
      case 'anniversary':
        return {
          ...common,
          title: 'Happy Anniversary! 🎉',
          description: 'Celebrating another year of love',
          icon: <Heart className="w-8 h-8" />,
          badge: 'Anniversary'
        };
      case 'first_message':
        return {
          ...common,
          title: 'First Message! 💌',
          description: 'Your love story begins',
          icon: <Gift className="w-8 h-8" />,
          badge: 'First Contact'
        };
      case 'message_count':
        return {
          ...common,
          title: 'Message Milestone! 📱',
          description: `${data.achievement?.count || 0} messages shared`,
          icon: <Award className="w-8 h-8" />,
          badge: 'Chatter'
        };
      case 'streak':
        return {
          ...common,
          title: 'Amazing Streak! 🔥',
          description: `${data.achievement?.count || 0} days of connection`,
          icon: <Calendar className="w-8 h-8" />,
          badge: 'Consistent'
        };
      case 'custom':
        return {
          ...common,
          title: data.title || 'Special Moment! ✨',
          description: data.description || 'A memorable moment',
          icon: <Sparkles className="w-8 h-8" />,
          badge: 'Custom'
        };
      default:
        return common as Milestone;
    }
  };

  const triggerMilestone = (type: Milestone['type'], data?: Partial<Milestone>) => {
    const milestone = createMilestone(type, data || {});
    setMilestones(prev => [...prev, milestone]);
    setActiveMilestone(milestone);
  };

  const closeMilestone = () => {
    setActiveMilestone(null);
  };

  const checkMessageCountMilestone = (messageCount: number) => {
    const milestoneNumbers = [1, 10, 50, 100, 500, 1000];
    if (milestoneNumbers.includes(messageCount)) {
      triggerMilestone('message_count', {
        achievement: { count: messageCount, unit: 'messages' }
      });
    }
  };

  const checkStreakMilestone = (streakDays: number) => {
    const streakMilestones = [7, 30, 100, 365];
    if (streakMilestones.includes(streakDays)) {
      triggerMilestone('streak', {
        achievement: { count: streakDays, unit: 'days' }
      });
    }
  };

  return {
    milestones,
    activeMilestone,
    triggerMilestone,
    closeMilestone,
    checkMessageCountMilestone,
    checkStreakMilestone
  };
};

export default MilestoneCelebration;