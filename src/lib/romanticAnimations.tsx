/**
 * 💫 Romantic Animations and Micro-interactions
 * Beautiful animations system for couple chat app
 */

import React, { useEffect, useRef, useState } from 'react';
import { romanticColors, animations, particles } from './romanticTheme';

// Heart particle animation
export const useHeartParticles = (trigger: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && containerRef.current) {
      setIsActive(true);
      createHeartParticles(containerRef.current);
      
      const timer = setTimeout(() => {
        setIsActive(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  const createHeartParticles = (container: HTMLElement) => {
    const particleCount = particles.hearts.count;
    
    for (let i = 0; i < particleCount; i++) {
      const heart = document.createElement('div');
      heart.innerHTML = '💕';
      heart.style.position = 'absolute';
      heart.style.fontSize = `${particles.hearts.sizes[Math.floor(Math.random() * particles.hearts.sizes.length)]}px`;
      heart.style.color = particles.hearts.colors[Math.floor(Math.random() * particles.hearts.colors.length)];
      heart.style.pointerEvents = 'none';
      heart.style.userSelect = 'none';
      heart.style.zIndex = '1000';
      
      // Random starting position
      const startX = Math.random() * container.offsetWidth;
      const startY = Math.random() * container.offsetHeight;
      heart.style.left = `${startX}px`;
      heart.style.top = `${startY}px`;
      
      // Animation
      heart.style.animation = `floatingHearts ${particles.hearts.animationDuration}ms ease-out forwards`;
      
      container.appendChild(heart);
      
      // Remove after animation
      setTimeout(() => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
        }
      }, particles.hearts.animationDuration);
    }
  };

  return { containerRef, isActive };
};

// Sparkle animation hook
export const useSparkleAnimation = (element: HTMLElement | null) => {
  useEffect(() => {
    if (!element) return;

    const createSparkle = () => {
      const sparkle = document.createElement('div');
      sparkle.innerHTML = '✨';
      sparkle.style.position = 'absolute';
      sparkle.style.fontSize = '12px';
      sparkle.style.pointerEvents = 'none';
      sparkle.style.animation = `sparkle ${particles.sparkles.animationDuration}ms ease-out forwards`;
      
      const rect = element.getBoundingClientRect();
      sparkle.style.left = `${Math.random() * rect.width}px`;
      sparkle.style.top = `${Math.random() * rect.height}px`;
      
      element.appendChild(sparkle);
      
      setTimeout(() => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      }, particles.sparkles.animationDuration);
    };

    const interval = setInterval(createSparkle, particles.sparkles.spawnRate);
    return () => clearInterval(interval);
  }, [element]);
};

// Love reaction animation
export const useLoveReaction = () => {
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; x: number; y: number }>>([]);

  const addReaction = (emoji: string, x: number, y: number) => {
    const id = Date.now().toString();
    setReactions(prev => [...prev, { id, emoji, x, y }]);
    
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 800);
  };

  const ReactionOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
      {reactions.map(reaction => (
        <div
          key={reaction.id}
          className="absolute text-2xl animate-love-reaction"
          style={{
            left: reaction.x,
            top: reaction.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {reaction.emoji}
        </div>
      ))}
    </div>
  );

  return { addReaction, ReactionOverlay };
};

// Typing indicator animation
export const TypingIndicator = ({ isVisible, partnerName }: { isVisible: boolean; partnerName: string }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-text-secondary animate-slide-in-with-love">
      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
        <span className="text-primary">💕</span>
      </div>
      <div className="flex items-center space-x-1">
        <span className="text-sm">{partnerName} is typing</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
};

// Message send animation
export const useMessageSendAnimation = () => {
  const [isSending, setIsSending] = useState(false);

  const triggerSendAnimation = () => {
    setIsSending(true);
    setTimeout(() => setIsSending(false), 600);
  };

  const SendingAnimation = () => (
    isSending ? (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-heartbeat">
            <span className="text-3xl">💕</span>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        </div>
      </div>
    ) : null
  );

  return { triggerSendAnimation, SendingAnimation };
};

// Milestone celebration animation
export const useCelebrationAnimation = () => {
  const [isActive, setIsActive] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'hearts' | 'sparkles' | 'confetti'>('hearts');

  const celebrate = (type: 'hearts' | 'sparkles' | 'confetti' = 'hearts') => {
    setCelebrationType(type);
    setIsActive(true);
    
    setTimeout(() => {
      setIsActive(false);
    }, 4000);
  };

  const CelebrationOverlay = () => (
    isActive ? (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {celebrationType === 'hearts' && <HeartsCelebration />}
        {celebrationType === 'sparkles' && <SparklesCelebration />}
        {celebrationType === 'confetti' && <ConfettiCelebration />}
      </div>
    ) : null
  );

  return { celebrate, CelebrationOverlay };
};

// Individual celebration components
const HeartsCelebration = () => (
  <div className="absolute inset-0">
    {Array.from({ length: 20 }, (_, i) => (
      <div
        key={i}
        className="absolute text-4xl animate-floating-hearts"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2000}ms`,
          animationDuration: `${3000 + Math.random() * 2000}ms`,
        }}
      >
        {['💕', '💖', '💗', '💘', '💝'][Math.floor(Math.random() * 5)]}
      </div>
    ))}
  </div>
);

const SparklesCelebration = () => (
  <div className="absolute inset-0">
    {Array.from({ length: 30 }, (_, i) => (
      <div
        key={i}
        className="absolute text-2xl animate-sparkle"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 1000}ms`,
          animationDuration: `${2000 + Math.random() * 1000}ms`,
        }}
      >
        ✨
      </div>
    ))}
  </div>
);

const ConfettiCelebration = () => (
  <div className="absolute inset-0">
    {Array.from({ length: 50 }, (_, i) => (
      <div
        key={i}
        className="absolute w-3 h-3 rounded-full animate-floating-hearts"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          backgroundColor: particles.hearts.colors[Math.floor(Math.random() * particles.hearts.colors.length)],
          animationDelay: `${Math.random() * 3000}ms`,
          animationDuration: `${4000 + Math.random() * 2000}ms`,
        }}
      />
    ))}
  </div>
);

// Hover effects
export const useHoverEffects = () => {
  const addHoverEffect = (element: HTMLElement, effect: 'glow' | 'scale' | 'float') => {
    const handleMouseEnter = () => {
      switch (effect) {
        case 'glow':
          element.style.boxShadow = '0 0 20px rgba(255, 107, 157, 0.4)';
          break;
        case 'scale':
          element.style.transform = 'scale(1.05)';
          break;
        case 'float':
          element.style.transform = 'translateY(-4px)';
          break;
      }
    };

    const handleMouseLeave = () => {
      element.style.boxShadow = '';
      element.style.transform = '';
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  };

  return { addHoverEffect };
};

// Smooth scroll with romantic easing
export const useSmoothScroll = () => {
  const scrollToElement = (elementId: string, offset = 0) => {
    const element = document.getElementById(elementId);
    if (element) {
      const top = element.offsetTop - offset;
      window.scrollTo({
        top,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return { scrollToElement, scrollToTop };
};

// Celebration overlay for milestones
export const useCelebrationOverlay = () => {
  const [celebrations, setCelebrations] = useState<Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    timestamp: number;
  }>>([]);

  const triggerCelebration = (type: string) => {
    const celebration = {
      id: `celebration_${Date.now()}`,
      type,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      timestamp: Date.now()
    };

    setCelebrations(prev => [...prev, celebration]);

    // Remove after animation
    setTimeout(() => {
      setCelebrations(prev => prev.filter(c => c.id !== celebration.id));
    }, 3000);
  };

  const CelebrationOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
      {celebrations.map(celebration => (
        <div
          key={celebration.id}
          className="absolute animate-love-reaction"
          style={{
            left: celebration.x,
            top: celebration.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {celebration.type === 'hearts' && '💕'}
          {celebration.type === 'sparkles' && '✨'}
          {celebration.type === 'confetti' && '🎊'}
          {celebration.type === 'fire' && '🔥'}
          {celebration.type === 'stars' && '⭐'}
        </div>
      ))}
    </div>
  );

  return { triggerCelebration, CelebrationOverlay };
};

// Export all animation utilities
export default {
  useHeartParticles,
  useSparkleAnimation,
  useLoveReaction,
  TypingIndicator,
  useMessageSendAnimation,
  useCelebrationAnimation,
  useCelebrationOverlay,
  useHoverEffects,
  useSmoothScroll,
};