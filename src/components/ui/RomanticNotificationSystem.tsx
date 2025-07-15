import React, { useState, useEffect } from 'react';
import { Heart, X, Bell, MessageCircle, Gift, Calendar, Info, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useHeartParticles, useLoveReaction } from '@/lib/romanticAnimations';

type NotificationType = 'message' | 'milestone' | 'reminder' | 'celebration' | 'info' | 'success' | 'warning' | 'error';

interface RomanticNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'romantic';
  }>;
  romantic?: {
    showHearts: boolean;
    showSparkles: boolean;
    customEmoji?: string;
  };
}

interface RomanticNotificationProps {
  notification: RomanticNotification;
  onClose: (id: string) => void;
  onAction?: (id: string, actionIndex: number) => void;
  className?: string;
}

interface RomanticNotificationSystemProps {
  notifications: RomanticNotification[];
  onNotificationClose: (id: string) => void;
  onNotificationAction?: (id: string, actionIndex: number) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  className?: string;
}

const notificationStyles = {
  message: {
    gradient: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    icon: MessageCircle,
    romantic: true
  },
  milestone: {
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: Gift,
    romantic: true
  },
  reminder: {
    gradient: 'from-blue-500 to-purple-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Calendar,
    romantic: false
  },
  celebration: {
    gradient: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: Heart,
    romantic: true
  },
  info: {
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Info,
    romantic: false
  },
  success: {
    gradient: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: CheckCircle,
    romantic: false
  },
  warning: {
    gradient: 'from-yellow-500 to-amber-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: AlertCircle,
    romantic: false
  },
  error: {
    gradient: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: XCircle,
    romantic: false
  }
};

const RomanticNotificationComponent: React.FC<RomanticNotificationProps> = ({
  notification,
  onClose,
  onAction,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const style = notificationStyles[notification.type];
  const IconComponent = style.icon;

  // Romantic animations
  const { containerRef, isActive: heartsActive } = useHeartParticles(
    showParticles && (notification.romantic?.showHearts || style.romantic)
  );
  const loveReaction = useLoveReaction() as any;
  const addReaction = loveReaction?.addReaction || (() => {});
  const ReactionOverlay = loveReaction?.ReactionOverlay || (() => null);

  useEffect(() => {
    setIsVisible(true);
    
    // Show particles for romantic notifications
    if (style.romantic || notification.romantic?.showHearts) {
      const timer = setTimeout(() => setShowParticles(true), 200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  const handleAction = (actionIndex: number) => {
    onAction?.(notification.id, actionIndex);
    if (notification.actions?.[actionIndex]) {
      notification.actions[actionIndex].onClick();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative max-w-sm w-full rounded-lg border shadow-lg transition-all duration-300 animate-slide-in-with-love",
          style.bgColor,
          style.borderColor,
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          notification.priority === 'high' && "ring-2 ring-pink-500 ring-opacity-50",
          className
        )}
      >
        {/* Priority indicator */}
        {notification.priority === 'high' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-gentle-pulse" />
        )}
        
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {/* Icon */}
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-r text-white",
                style.gradient,
                style.romantic && "animate-heartbeat"
              )}>
                <IconComponent className="w-4 h-4" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {notification.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(notification.timestamp)}
                </p>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Message */}
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {notification.message}
          </p>
        </div>
        
        {/* Custom emoji */}
        {notification.romantic?.customEmoji && (
          <div className="px-4 pb-3">
            <span className="text-2xl animate-gentle-pulse">
              {notification.romantic.customEmoji}
            </span>
          </div>
        )}
        
        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="px-4 pb-4 flex space-x-2">
            {notification.actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant === 'romantic' ? 'romantic' : action.variant === 'primary' ? 'default' : 'outline'}
                onClick={() => handleAction(index)}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
        
        {/* Romantic decorations */}
        {style.romantic && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            <div className="absolute top-2 right-2 w-1 h-1 bg-pink-300 rounded-full animate-sparkle opacity-70" />
            <div className="absolute bottom-2 left-2 w-1 h-1 bg-pink-300 rounded-full animate-sparkle opacity-50" style={{ animationDelay: '0.5s' }} />
            {notification.romantic?.showSparkles && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-pink-300 opacity-20 animate-sparkle text-xs">
                ✨
              </div>
            )}
          </div>
        )}
      </div>
      
      <ReactionOverlay />
    </>
  );
};

export const RomanticNotificationSystem: React.FC<RomanticNotificationSystemProps> = ({
  notifications,
  onNotificationClose,
  onNotificationAction,
  position = 'top-right',
  maxVisible = 5,
  className
}) => {
  const visibleNotifications = notifications.slice(0, maxVisible);
  
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div className={cn(
      "fixed z-50 space-y-3 max-w-sm w-full",
      getPositionClasses(),
      className
    )}>
      {visibleNotifications.map((notification) => (
        <RomanticNotificationComponent
          key={notification.id}
          notification={notification}
          onClose={onNotificationClose}
          onAction={onNotificationAction}
        />
      ))}
    </div>
  );
};

// Hook for managing notifications
export const useRomanticNotifications = () => {
  const [notifications, setNotifications] = useState<RomanticNotification[]>([]);

  const addNotification = (
    type: NotificationType,
    title: string,
    message: string,
    options?: Partial<RomanticNotification>
  ) => {
    const notification: RomanticNotification = {
      id: `notification_${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      isRead: false,
      priority: 'medium',
      ...options
    };

    setNotifications(prev => [notification, ...prev]);

    // Auto-remove after 5 seconds for non-high priority
    if (notification.priority !== 'high') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }

    return notification.id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Pre-built notification creators
  const showLoveMessage = (partnerName: string, message: string) => {
    return addNotification('message', `Message from ${partnerName}`, message, {
      priority: 'high',
      romantic: {
        showHearts: true,
        showSparkles: true,
        customEmoji: '💕'
      }
    });
  };

  const showMilestone = (title: string, description: string) => {
    return addNotification('milestone', title, description, {
      priority: 'high',
      romantic: {
        showHearts: true,
        showSparkles: true,
        customEmoji: '🎉'
      },
      actions: [
        { label: 'View Details', onClick: () => {}, variant: 'romantic' },
        { label: 'Share', onClick: () => {}, variant: 'secondary' }
      ]
    });
  };

  const showCelebration = (event: string) => {
    return addNotification('celebration', 'Celebration Time!', event, {
      priority: 'high',
      romantic: {
        showHearts: true,
        showSparkles: true,
        customEmoji: '🎊'
      }
    });
  };

  const showReminder = (title: string, message: string) => {
    return addNotification('reminder', title, message, {
      priority: 'medium',
      actions: [
        { label: 'Remind Later', onClick: () => {}, variant: 'secondary' },
        { label: 'Done', onClick: () => {}, variant: 'primary' }
      ]
    });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    clearAll,
    showLoveMessage,
    showMilestone,
    showCelebration,
    showReminder
  };
};

export default RomanticNotificationSystem;