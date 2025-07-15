import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Heart, Sparkles } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25',
        romantic: 'bg-romantic-gradient text-white hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        love: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/25',
        dreamy: 'bg-dreamy-gradient text-white hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5',
        passion: 'bg-passion-gradient text-white hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
      effect: {
        none: '',
        glow: 'hover-glow',
        scale: 'hover-scale',
        float: 'hover-float',
        heartbeat: 'animate-heartbeat',
        sparkle: 'animate-sparkle',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      effect: 'none',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  showHeartIcon?: boolean;
  showSparkleIcon?: boolean;
  romanticeVariant?: 'default' | 'glow' | 'pulse' | 'float';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    effect,
    asChild = false, 
    loading = false,
    loadingText = 'Loading...',
    disabled,
    showHeartIcon = false,
    showSparkleIcon = false,
    romanticeVariant = 'default',
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? 'span' : 'button';
    const isDisabled = disabled || loading;
    
    // Add romantic effects based on variant
    const romanticEffects = React.useMemo(() => {
      if (variant === 'romantic' || variant === 'love') {
        switch (romanticeVariant) {
          case 'glow':
            return 'animate-romantic-glow';
          case 'pulse':
            return 'animate-gentle-pulse';
          case 'float':
            return 'hover:animate-love-bounce';
          default:
            return '';
        }
      }
      return '';
    }, [variant, romanticeVariant]);
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, effect, className }), romanticEffects)}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {/* Romantic background effects */}
        {(variant === 'romantic' || variant === 'love') && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-400 animate-gentle-pulse" />
          </div>
        )}
        
        {/* Loading state */}
        {loading && (
          <div className="mr-2 flex items-center">
            <Heart className="h-4 w-4 animate-heartbeat" />
          </div>
        )}
        
        {/* Heart icon */}
        {showHeartIcon && !loading && (
          <Heart className="mr-2 h-4 w-4 text-pink-200" />
        )}
        
        {/* Sparkle icon */}
        {showSparkleIcon && !loading && (
          <Sparkles className="mr-2 h-4 w-4 text-yellow-200" />
        )}
        
        {/* Button content */}
        <span className={cn(
          "relative z-10 transition-all duration-300",
          loading && "opacity-70"
        )}>
          {loading ? loadingText : children}
        </span>
        
        {/* Romantic sparkle overlay for romantic variants */}
        {(variant === 'romantic' || variant === 'love' || variant === 'dreamy') && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full opacity-70 animate-sparkle" />
            <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-white rounded-full opacity-50 animate-sparkle" style={{ animationDelay: '0.5s' }} />
          </div>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
