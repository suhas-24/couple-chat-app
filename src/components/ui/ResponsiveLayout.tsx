import React, { useState, useEffect } from 'react';
import ResponsiveNavigation from './ResponsiveNavigation';
import { useAuth } from '@/context/AuthContext';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  className?: string;
  containerClassName?: string;
}

interface ViewportSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  showNavigation = true,
  className = '',
  containerClassName = '',
}) => {
  const { user } = useAuth();
  const [viewport, setViewport] = useState<ViewportSize>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouch: false,
  });

  // Update viewport size and device detection
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setViewport({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
      });

      // Update CSS custom properties for responsive calculations
      document.documentElement.style.setProperty('--viewport-width', `${width}px`);
      document.documentElement.style.setProperty('--viewport-height', `${height}px`);
      document.documentElement.style.setProperty('--is-mobile', isMobile ? '1' : '0');
      document.documentElement.style.setProperty('--is-tablet', isTablet ? '1' : '0');
      document.documentElement.style.setProperty('--is-desktop', isDesktop ? '1' : '0');
      document.documentElement.style.setProperty('--is-touch', isTouch ? '1' : '0');
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  // Handle safe area insets for mobile devices
  useEffect(() => {
    const updateSafeArea = () => {
      const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0px';
      const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px';
      const safeAreaLeft = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0px';
      const safeAreaRight = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0px';

      document.documentElement.style.setProperty('--safe-area-top', safeAreaTop);
      document.documentElement.style.setProperty('--safe-area-bottom', safeAreaBottom);
      document.documentElement.style.setProperty('--safe-area-left', safeAreaLeft);
      document.documentElement.style.setProperty('--safe-area-right', safeAreaRight);
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);

    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  // Calculate layout dimensions
  const layoutDimensions = {
    navigationHeight: viewport.isMobile ? 64 : 72, // Mobile bottom nav vs desktop top nav
    bottomNavHeight: viewport.isMobile ? 80 : 0, // Bottom navigation on mobile
    contentHeight: viewport.isMobile 
      ? `calc(100vh - ${64 + 80}px - env(safe-area-inset-top) - env(safe-area-inset-bottom))`
      : `calc(100vh - 72px)`,
  };

  if (!user && showNavigation) {
    // Don't show navigation for unauthenticated users
    return (
      <div className={`min-h-screen bg-dark-bg ${className}`}>
        <div className={`container mx-auto ${containerClassName}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-dark-bg ${className}`}>
      {/* Navigation */}
      {showNavigation && user && <ResponsiveNavigation />}

      {/* Main Content */}
      <main
        className={`${containerClassName}`}
        style={{
          minHeight: showNavigation ? layoutDimensions.contentHeight : '100vh',
          paddingBottom: viewport.isMobile && showNavigation ? `${layoutDimensions.bottomNavHeight}px` : '0',
        }}
      >
        {children}
      </main>

      {/* Responsive Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50 lg:hidden">
          <div>W: {viewport.width}px</div>
          <div>H: {viewport.height}px</div>
          <div>Device: {viewport.isMobile ? 'Mobile' : viewport.isTablet ? 'Tablet' : 'Desktop'}</div>
          <div>Touch: {viewport.isTouch ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

// Hook for accessing viewport information
export const useViewport = () => {
  const [viewport, setViewport] = useState<ViewportSize>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouch: false,
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setViewport({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  return viewport;
};

// Responsive container component
interface ResponsiveContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  padding?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  size = 'lg',
  className = '',
  padding = true,
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const paddingClasses = padding ? 'px-4 sm:px-6 lg:px-8' : '';

  return (
    <div className={`mx-auto ${sizeClasses[size]} ${paddingClasses} ${className}`}>
      {children}
    </div>
  );
};

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className = '',
}) => {
  const gridClasses = [
    columns.xs && `grid-cols-${columns.xs}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    `gap-${gap}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={`grid ${gridClasses} ${className}`}>
      {children}
    </div>
  );
};

// Responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
  className?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  size = { xs: 'text-sm', sm: 'text-base', lg: 'text-lg' },
  className = '',
}) => {
  const textClasses = [
    size.xs,
    size.sm && `sm:${size.sm}`,
    size.md && `md:${size.md}`,
    size.lg && `lg:${size.lg}`,
    size.xl && `xl:${size.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={`${textClasses} ${className}`}>
      {children}
    </div>
  );
};

export default ResponsiveLayout;