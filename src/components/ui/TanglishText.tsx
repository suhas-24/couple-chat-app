/**
 * TanglishText component for optimized rendering of Tamil-English mixed text
 */

import React, { forwardRef } from 'react';
import { useTanglish } from '@/hooks/useTanglish';
import { cn } from '@/lib/utils';

export interface TanglishTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  autoDetect?: boolean;
  normalize?: boolean;
  enableSegmentation?: boolean;
  showLanguageIndicator?: boolean;
  fallbackComponent?: React.ComponentType<{ text: string; className?: string }>;
}

/**
 * Component that automatically detects and optimally renders Tanglish text
 */
export const TanglishText = forwardRef<HTMLSpanElement, TanglishTextProps>(
  ({
    text,
    autoDetect = true,
    normalize = true,
    enableSegmentation = false,
    showLanguageIndicator = false,
    fallbackComponent: FallbackComponent,
    className,
    ...props
  }, ref) => {
    const {
      detection,
      segments,
      normalizedText,
      renderingStyles,
      isValid,
      fontLoaded,
    } = useTanglish(text, {
      autoDetect,
      normalize,
      enableSegmentation,
    });

    // Use fallback component if provided and fonts aren't loaded
    if (FallbackComponent && !fontLoaded && detection.hasUnicode) {
      return <FallbackComponent text={text} className={className} />;
    }

    // Show warning for invalid text
    if (!isValid) {
      console.warn('Invalid Tamil text detected:', text);
    }

    const displayText = normalizedText || text;

    // Render segmented text if segmentation is enabled
    if (enableSegmentation && segments.length > 1) {
      return (
        <span
          ref={ref}
          className={cn('tanglish-text', className)}
          style={renderingStyles}
          {...props}
        >
          {segments.map((segment, index) => (
            <span
              key={index}
              className={cn(
                'tanglish-segment',
                `tanglish-segment--${segment.language}`,
                {
                  'font-tamil': segment.language === 'tamil',
                  'font-sans': segment.language === 'english',
                }
              )}
              data-language={segment.language}
            >
              {segment.text}
            </span>
          ))}
          {showLanguageIndicator && (
            <LanguageIndicator detection={detection} />
          )}
        </span>
      );
    }

    // Render as single text block
    return (
      <span
        ref={ref}
        className={cn(
          'tanglish-text',
          {
            'font-tamil': detection.hasUnicode,
            'font-sans': !detection.hasUnicode,
            'text-opacity-75': !fontLoaded && detection.hasUnicode,
          },
          className
        )}
        style={renderingStyles}
        data-language={detection.language}
        data-confidence={detection.confidence}
        {...props}
      >
        {displayText}
        {showLanguageIndicator && (
          <LanguageIndicator detection={detection} />
        )}
      </span>
    );
  }
);

TanglishText.displayName = 'TanglishText';

/**
 * Language indicator component
 */
interface LanguageIndicatorProps {
  detection: ReturnType<typeof useTanglish>['detection'];
}

const LanguageIndicator: React.FC<LanguageIndicatorProps> = ({ detection }) => {
  if (detection.language === 'unknown' || detection.confidence < 0.5) {
    return null;
  }

  const getIndicatorColor = () => {
    switch (detection.language) {
      case 'tamil':
        return 'bg-blue-500';
      case 'english':
        return 'bg-green-500';
      case 'tanglish':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getIndicatorText = () => {
    switch (detection.language) {
      case 'tamil':
        return 'த';
      case 'english':
        return 'EN';
      case 'tanglish':
        return 'த/EN';
      default:
        return '?';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'w-4 h-4 ml-1 text-xs text-white rounded-full',
        'opacity-60 hover:opacity-100 transition-opacity',
        getIndicatorColor()
      )}
      title={`${detection.language} (${Math.round(detection.confidence * 100)}% confidence)`}
    >
      {getIndicatorText()}
    </span>
  );
};

/**
 * Fallback component for when fonts are not loaded
 */
export const TanglishTextFallback: React.FC<{
  text: string;
  className?: string;
}> = ({ text, className }) => {
  return (
    <span
      className={cn(
        'tanglish-text-fallback',
        'animate-pulse bg-gray-200 rounded',
        className
      )}
      title="Loading Tamil fonts..."
    >
      {text}
    </span>
  );
};

export default TanglishText;