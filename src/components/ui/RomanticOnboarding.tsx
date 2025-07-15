import React, { useState, useEffect } from 'react';
import { Heart, ArrowRight, Sparkles, Users, MessageCircle, Gift, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useHeartParticles, useSparkleAnimation, useLoveReaction } from '@/lib/romanticAnimations';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  gradient: string;
}

interface RomanticOnboardingProps {
  isOpen: boolean;
  onComplete: (userPreferences: OnboardingData) => void;
  onSkip: () => void;
  className?: string;
}

interface OnboardingData {
  partnerName: string;
  relationshipStage: 'new' | 'dating' | 'engaged' | 'married' | 'long-term';
  communicationStyle: 'playful' | 'romantic' | 'casual' | 'intimate';
  preferredTheme: 'light' | 'dark' | 'romantic';
  notificationLevel: 'minimal' | 'balanced' | 'expressive';
  interests: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Love Story',
    description: 'Let\'s create a beautiful space for you and your partner to connect, share memories, and grow together.',
    icon: <Heart className="w-8 h-8" />,
    gradient: 'from-pink-500 to-rose-500'
  },
  {
    id: 'partner',
    title: 'Tell Us About Your Partner',
    description: 'Help us personalize your experience by sharing your partner\'s name and your relationship stage.',
    icon: <Users className="w-8 h-8" />,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'communication',
    title: 'Your Communication Style',
    description: 'Every couple communicates differently. Let\'s find the perfect tone for your conversations.',
    icon: <MessageCircle className="w-8 h-8" />,
    gradient: 'from-blue-500 to-purple-500'
  },
  {
    id: 'personalization',
    title: 'Make It Yours',
    description: 'Choose your preferred theme, notification style, and interests to create your perfect romantic experience.',
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-rose-500 to-pink-500'
  },
  {
    id: 'celebration',
    title: 'Ready to Begin!',
    description: 'Your romantic chat space is ready. Let\'s start creating beautiful memories together.',
    icon: <Gift className="w-8 h-8" />,
    action: 'Start Your Journey',
    gradient: 'from-pink-500 to-rose-500'
  }
];

const relationshipStages = [
  { value: 'new', label: 'Just Started Dating', emoji: '🌱' },
  { value: 'dating', label: 'Dating', emoji: '💕' },
  { value: 'engaged', label: 'Engaged', emoji: '💍' },
  { value: 'married', label: 'Married', emoji: '👰' },
  { value: 'long-term', label: 'Long-term Partnership', emoji: '🌟' }
];

const communicationStyles = [
  { value: 'playful', label: 'Playful & Fun', description: 'Lots of emojis and cute interactions', emoji: '😄' },
  { value: 'romantic', label: 'Romantic & Sweet', description: 'Heart particles and gentle animations', emoji: '💝' },
  { value: 'casual', label: 'Casual & Relaxed', description: 'Clean and simple communication', emoji: '😊' },
  { value: 'intimate', label: 'Intimate & Personal', description: 'Private and meaningful exchanges', emoji: '💌' }
];

const themes = [
  { value: 'light', label: 'Light & Bright', preview: 'bg-white border-gray-200' },
  { value: 'dark', label: 'Dark & Cozy', preview: 'bg-gray-900 border-gray-700' },
  { value: 'romantic', label: 'Romantic & Dreamy', preview: 'bg-gradient-to-r from-pink-100 to-rose-100 border-pink-200' }
];

const interests = [
  'Travel', 'Movies', 'Music', 'Cooking', 'Books', 'Photography', 'Art', 'Gaming',
  'Fitness', 'Nature', 'Dancing', 'Technology', 'Fashion', 'Food', 'Sports', 'Pets'
];

export const RomanticOnboarding: React.FC<RomanticOnboardingProps> = ({
  isOpen,
  onComplete,
  onSkip,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    partnerName: '',
    relationshipStage: 'dating',
    communicationStyle: 'romantic',
    preferredTheme: 'romantic',
    notificationLevel: 'balanced',
    interests: []
  });
  const [isVisible, setIsVisible] = useState(false);

  // Romantic animations
  const { containerRef, isActive: heartsActive } = useHeartParticles(isVisible);
  const loveReaction = useLoveReaction() as any;
  const addReaction = loveReaction?.addReaction || (() => {});
  const ReactionOverlay = loveReaction?.ReactionOverlay || (() => null);
  useSparkleAnimation(containerRef.current);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Add celebration reaction
      addReaction('💕', window.innerWidth / 2, window.innerHeight / 2);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(onboardingData);
    setIsVisible(false);
  };

  const handleSkip = () => {
    onSkip();
    setIsVisible(false);
  };

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const toggleInterest = (interest: string) => {
    setOnboardingData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const getCurrentStepContent = () => {
    const step = onboardingSteps[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center animate-heartbeat">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-sparkle">
                <Sparkles className="w-4 h-4 text-white m-1" />
              </div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Welcome to a space designed for love, connection, and beautiful moments together.
            </p>
          </div>
        );
      
      case 'partner':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Partner's Name
                </label>
                <input
                  type="text"
                  value={onboardingData.partnerName}
                  onChange={(e) => updateOnboardingData({ partnerName: e.target.value })}
                  className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Enter your partner's name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relationship Stage
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {relationshipStages.map((stage) => (
                    <button
                      key={stage.value}
                      onClick={() => updateOnboardingData({ relationshipStage: stage.value as any })}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all duration-200 text-left flex items-center space-x-3",
                        onboardingData.relationshipStage === stage.value
                          ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-pink-300"
                      )}
                    >
                      <span className="text-xl">{stage.emoji}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{stage.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'communication':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {communicationStyles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => updateOnboardingData({ communicationStyle: style.value as any })}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all duration-200 text-left",
                    onboardingData.communicationStyle === style.value
                      ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-pink-300"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{style.emoji}</span>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{style.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{style.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'personalization':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Preferred Theme
              </label>
              <div className="grid grid-cols-1 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => updateOnboardingData({ preferredTheme: theme.value as any })}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3",
                      onboardingData.preferredTheme === theme.value
                        ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-pink-300"
                    )}
                  >
                    <div className={cn("w-6 h-6 rounded-full", theme.preview)} />
                    <span className="font-medium text-gray-900 dark:text-white">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Interests (Select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={cn(
                      "p-2 rounded-lg border transition-all duration-200 text-sm",
                      onboardingData.interests.includes(interest)
                        ? "border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300"
                        : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-pink-300"
                    )}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'celebration':
        return (
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center animate-gentle-pulse">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-sparkle">
                <Sparkles className="w-4 h-4 text-white m-1" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Perfect! You're all set up.
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your romantic chat space is ready with:
              </p>
              <ul className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <li>✨ {onboardingData.communicationStyle} communication style</li>
                <li>🎨 {onboardingData.preferredTheme} theme</li>
                <li>🎯 {onboardingData.interests.length} shared interests</li>
                <li>💕 Personalized for {onboardingData.partnerName || 'your partner'}</li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const step = onboardingSteps[currentStep];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div
          ref={containerRef}
          className={cn(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in-with-love",
            className
          )}
        >
          {/* Header */}
          <div className="relative p-6 pb-0">
            <button
              onClick={handleSkip}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className={cn("p-2 rounded-lg bg-gradient-to-r text-white", step.gradient)}>
                {step.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{step.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Step {currentStep + 1} of {onboardingSteps.length}
                </p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">{step.description}</p>
          </div>
          
          {/* Progress Bar */}
          <div className="px-6 mb-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 pb-6">
            {getCurrentStepContent()}
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <span>Previous</span>
            </Button>
            
            <div className="flex space-x-2">
              {currentStep < onboardingSteps.length - 1 ? (
                <Button
                  variant="romantic"
                  onClick={handleNext}
                  className="flex items-center space-x-2"
                  disabled={currentStep === 1 && !onboardingData.partnerName.trim()}
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="love"
                  onClick={handleComplete}
                  className="flex items-center space-x-2"
                  showHeartIcon
                >
                  <span>{step.action || 'Complete'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ReactionOverlay />
    </>
  );
};

export default RomanticOnboarding;