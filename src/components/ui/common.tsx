import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
        sizeClasses[size],
        className
      )}
    />
  );
};

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  name, 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center font-medium",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img 
          src={src} 
          alt={name} 
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white">
          {initials}
        </div>
      )}
    </div>
  );
};

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  size = 'md',
  className,
  children 
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    secondary: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top' 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className={cn(
            "absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-nowrap",
            positions[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4 max-w-sm">{description}</p>
      )}
      {action && action}
    </div>
  );
};

interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({ 
  isOnline, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "w-3 h-3 rounded-full border-2 border-white",
        isOnline ? "bg-green-500" : "bg-gray-400",
        className
      )}
    />
  );
};

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  users, 
  className 
}) => {
  if (users.length === 0) return null;

  const text = users.length === 1 
    ? `${users[0]} is typing...`
    : `${users.join(', ')} are typing...`;

  return (
    <div className={cn("flex items-center space-x-2 text-sm text-gray-500", className)}>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span>{text}</span>
    </div>
  );
};

export default {
  LoadingSpinner,
  Avatar,
  Badge,
  Tooltip,
  EmptyState,
  OnlineStatus,
  TypingIndicator
};