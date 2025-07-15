// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

interface ResourceTiming {
  name: string;
  duration: number;
  size?: number;
  type: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Web Vitals monitoring
    this.observeWebVitals();
    
    // Resource timing monitoring
    this.observeResourceTiming();
    
    // Navigation timing
    this.observeNavigationTiming();
    
    this.isMonitoring = true;
  }

  private observeWebVitals() {
    // First Contentful Paint
    this.createObserver('paint', (entries) => {
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
          this.reportMetric('FCP', entry.startTime);
        }
      });
    });

    // Largest Contentful Paint
    this.createObserver('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
      this.reportMetric('LCP', lastEntry.startTime);
    });

    // First Input Delay
    this.createObserver('first-input', (entries) => {
      const firstInput = entries[0] as any;
      this.metrics.fid = firstInput.processingStart - firstInput.startTime;
      this.reportMetric('FID', this.metrics.fid);
    });

    // Cumulative Layout Shift
    let clsValue = 0;
    this.createObserver('layout-shift', (entries) => {
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      this.metrics.cls = clsValue;
      this.reportMetric('CLS', clsValue);
    });
  }

  private observeResourceTiming() {
    this.createObserver('resource', (entries) => {
      entries.forEach((entry) => {
        const resource: ResourceTiming = {
          name: entry.name,
          duration: entry.duration,
          size: (entry as any).transferSize,
          type: this.getResourceType(entry.name),
        };
        
        this.analyzeResourcePerformance(resource);
      });
    });
  }

  private observeNavigationTiming() {
    this.createObserver('navigation', (entries) => {
      const navigation = entries[0] as PerformanceNavigationTiming;
      this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
      this.reportMetric('TTFB', this.metrics.ttfb);
      
      // Additional navigation metrics
      const navEntry = navigation as any;
      const metrics = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navEntry.navigationStart,
        loadComplete: navigation.loadEventEnd - navEntry.navigationStart,
        domInteractive: navigation.domInteractive - navEntry.navigationStart,
      };
      
      Object.entries(metrics).forEach(([key, value]) => {
        this.reportMetric(key, value);
      });
    });
  }

  private createObserver(type: string, callback: (entries: PerformanceEntry[]) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Performance observer for ${type} not supported:`, error);
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  private analyzeResourcePerformance(resource: ResourceTiming) {
    // Flag slow resources
    if (resource.duration > 1000) {
      console.warn(`Slow resource detected: ${resource.name} (${resource.duration}ms)`);
    }
    
    // Flag large resources
    if (resource.size && resource.size > 500000) { // 500KB
      console.warn(`Large resource detected: ${resource.name} (${(resource.size / 1024).toFixed(2)}KB)`);
    }
  }

  private reportMetric(name: string, value: number) {
    console.log(`Performance metric - ${name}: ${value.toFixed(2)}ms`);
    
    // Send to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: Math.round(value),
      });
    }
  }

  // Public methods
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    console.log(`Function ${name} took ${duration.toFixed(2)}ms`);
    return result;
  }

  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`Async function ${name} took ${duration.toFixed(2)}ms`);
    return result;
  }

  markStart(name: string) {
    performance.mark(`${name}-start`);
  }

  markEnd(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    console.log(`${name} took ${measure.duration.toFixed(2)}ms`);
    
    return measure.duration;
  }

  getResourceTimings(): ResourceTiming[] {
    return performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      duration: entry.duration,
      size: (entry as any).transferSize,
      type: this.getResourceType(entry.name),
    }));
  }

  getBundleAnalysis() {
    const resources = this.getResourceTimings();
    const analysis = {
      totalSize: 0,
      totalDuration: 0,
      byType: {} as Record<string, { count: number; size: number; duration: number }>,
    };

    resources.forEach((resource) => {
      analysis.totalSize += resource.size || 0;
      analysis.totalDuration += resource.duration;
      
      if (!analysis.byType[resource.type]) {
        analysis.byType[resource.type] = { count: 0, size: 0, duration: 0 };
      }
      
      analysis.byType[resource.type].count++;
      analysis.byType[resource.type].size += resource.size || 0;
      analysis.byType[resource.type].duration += resource.duration;
    });

    return analysis;
  }

  disconnect() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }
}

// Memory monitoring
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private intervalId?: NodeJS.Timeout;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  startMonitoring(interval = 30000) { // 30 seconds
    if (typeof window === 'undefined' || !(performance as any).memory) {
      console.warn('Memory monitoring not supported');
      return;
    }

    this.intervalId = setInterval(() => {
      const memory = (performance as any).memory;
      const usage = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      };

      console.log('Memory usage:', usage);

      // Warn if memory usage is high
      if (usage.used / usage.limit > 0.8) {
        console.warn('High memory usage detected:', usage);
      }
    }, interval);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  getMemoryUsage() {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    };
  }
}

// Bundle size analyzer
export const analyzeBundleSize = () => {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  const analysis = {
    scripts: scripts.length,
    stylesheets: stylesheets.length,
    totalRequests: scripts.length + stylesheets.length,
  };

  console.log('Bundle analysis:', analysis);
  return analysis;
};

// Performance budget checker
export const checkPerformanceBudget = (metrics: PerformanceMetrics) => {
  const budget = {
    fcp: 1800, // 1.8s
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    ttfb: 600, // 600ms
  };

  const violations: string[] = [];

  Object.entries(budget).forEach(([metric, threshold]) => {
    const value = metrics[metric as keyof PerformanceMetrics];
    if (value && value > threshold) {
      violations.push(`${metric.toUpperCase()}: ${value.toFixed(2)} (budget: ${threshold})`);
    }
  });

  if (violations.length > 0) {
    console.warn('Performance budget violations:', violations);
  } else {
    console.log('All performance budgets met!');
  }

  return violations;
};

// Lazy loading utilities
export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) => {
  const defaultOptions = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
};

// Image optimization utilities
export const getOptimalImageSize = (containerWidth: number, devicePixelRatio = 1) => {
  const sizes = [320, 640, 768, 1024, 1280, 1920];
  const targetWidth = containerWidth * devicePixelRatio;
  
  return sizes.find(size => size >= targetWidth) || sizes[sizes.length - 1];
};

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();
export const memoryMonitor = MemoryMonitor.getInstance();

// Auto-start monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  memoryMonitor.startMonitoring();
}

export default performanceMonitor;