import React from 'react';
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component for dynamic imports
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Error component for failed dynamic imports
const ErrorComponent = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-500 text-4xl mb-4">⚠️</div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to load component</h3>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Dynamic import wrapper with error handling and loading states
function createDynamicImport<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    loading?: ComponentType;
    error?: ComponentType<{ error: Error; retry: () => void }>;
    ssr?: boolean;
  } = {}
) {
  return dynamic(importFn, {
    loading: options.loading ? () => React.createElement(options.loading!) : () => <LoadingSpinner />,
    ssr: options.ssr ?? true,
  });
}

// Chat Components (Heavy components that can be code-split)
export const DynamicChatWindow = createDynamicImport(
  () => import('@/components/chat/ChatWindow'),
  { ssr: false } // Chat window doesn't need SSR
);

export const DynamicAIChatBot = createDynamicImport(
  () => import('@/components/chat/AIChatBot'),
  { ssr: false }
);

export const DynamicCsvUpload = createDynamicImport(
  () => import('@/components/chat/CsvUpload'),
  { ssr: false }
);

export const DynamicEnhancedCsvUpload = createDynamicImport(
  () => import('@/components/chat/EnhancedCsvUpload'),
  { ssr: false }
);

// Analytics Components (Heavy with Chart.js)
export const DynamicAnalyticsDashboard = createDynamicImport(
  () => import('@/components/analytics/AnalyticsDashboard'),
  { ssr: false } // Analytics don't need SSR
);

export const DynamicEnhancedAnalyticsDashboard = createDynamicImport(
  () => import('@/components/analytics/EnhancedAnalyticsDashboard'),
  { ssr: false }
);

export const DynamicWordCloudVisualization = createDynamicImport(
  () => import('@/components/analytics/WordCloudVisualization'),
  { ssr: false }
);

export const DynamicMilestonesTimeline = createDynamicImport(
  () => import('@/components/analytics/MilestonesTimeline'),
  { ssr: false }
);

// UI Components that might be heavy
export const DynamicVirtualScrollList = createDynamicImport(
  () => import('@/components/ui/VirtualScrollList'),
  { ssr: false }
);

export const DynamicTamilKeyboard = createDynamicImport(
  () => import('@/components/ui/TamilKeyboard'),
  { ssr: false }
);

// Utility function to preload components
export const preloadComponent = (componentImport: () => Promise<any>) => {
  if (typeof window !== 'undefined') {
    // Only preload on client side
    componentImport().catch(console.error);
  }
};

// Preload critical components on page load
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload components that are likely to be used soon
    setTimeout(() => {
      preloadComponent(() => import('@/components/chat/ChatWindow'));
      preloadComponent(() => import('@/components/chat/AIChatBot'));
    }, 1000);
  }
};

// Route-based code splitting helpers
export const createRouteComponent = <T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: ComponentType
) => {
  return dynamic(importFn, {
    loading: fallback ? () => React.createElement(fallback) : () => <LoadingSpinner />,
    ssr: true, // Routes should be SSR-enabled
  });
};

// Lazy load heavy libraries
export const loadChartJS = () => {
  return Promise.all([
    import('chart.js/auto'),
    import('react-chartjs-2'),
  ]);
};

export const loadFramerMotion = () => {
  return import('framer-motion');
};

export const loadSocketIO = () => {
  return import('socket.io-client');
};

// Progressive enhancement - load features based on user interaction
export class ProgressiveLoader {
  private static loadedFeatures = new Set<string>();
  private static loadingPromises = new Map<string, Promise<any>>();

  static async loadFeature(
    featureName: string,
    loader: () => Promise<any>
  ): Promise<any> {
    if (this.loadedFeatures.has(featureName)) {
      return;
    }

    if (this.loadingPromises.has(featureName)) {
      return this.loadingPromises.get(featureName);
    }

    const promise = loader()
      .then((result) => {
        this.loadedFeatures.add(featureName);
        this.loadingPromises.delete(featureName);
        return result;
      })
      .catch((error) => {
        this.loadingPromises.delete(featureName);
        throw error;
      });

    this.loadingPromises.set(featureName, promise);
    return promise;
  }

  static isFeatureLoaded(featureName: string): boolean {
    return this.loadedFeatures.has(featureName);
  }

  static async loadAnalytics() {
    return this.loadFeature('analytics', async () => {
      const [chartJS, reactChartJS] = await Promise.all([
        import('chart.js/auto'),
        import('react-chartjs-2'),
      ]);
      return { chartJS, reactChartJS };
    });
  }

  static async loadAIFeatures() {
    return this.loadFeature('ai', async () => {
      const aiComponents = await Promise.all([
        import('@/components/chat/AIChatBot'),
        import('@/services/api'),
      ]);
      return aiComponents;
    });
  }

  static async loadChatFeatures() {
    return this.loadFeature('chat', async () => {
      const [socketIO, chatComponents] = await Promise.all([
        import('socket.io-client'),
        import('@/components/chat/ChatWindow'),
      ]);
      return { socketIO, chatComponents };
    });
  }
}

// Bundle splitting configuration
export const bundleConfig = {
  // Vendor chunks
  vendors: {
    react: ['react', 'react-dom'],
    ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
    charts: ['chart.js', 'react-chartjs-2'],
    animation: ['framer-motion'],
    networking: ['axios', 'socket.io-client'],
  },
  
  // Feature chunks
  features: {
    auth: ['@react-oauth/google', 'js-cookie'],
    chat: ['socket.io-client'],
    analytics: ['chart.js', 'react-chartjs-2'],
    ai: [], // AI features are mostly custom code
  },
};

// Performance monitoring for dynamic imports
export const trackDynamicImport = (componentName: string) => {
  const startTime = performance.now();
  
  return {
    onLoad: () => {
      const loadTime = performance.now() - startTime;
      console.log(`Dynamic import ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      
      // Send to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'dynamic_import', {
          component_name: componentName,
          load_time: Math.round(loadTime),
        });
      }
    },
    onError: (error: Error) => {
      console.error(`Dynamic import ${componentName} failed:`, error);
      
      // Send error to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'dynamic_import_error', {
          component_name: componentName,
          error_message: error.message,
        });
      }
    },
  };
};

export default {
  DynamicChatWindow,
  DynamicAIChatBot,
  DynamicAnalyticsDashboard,
  DynamicEnhancedAnalyticsDashboard,
  DynamicWordCloudVisualization,
  DynamicVirtualScrollList,
  preloadCriticalComponents,
  ProgressiveLoader,
};