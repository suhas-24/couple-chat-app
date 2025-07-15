export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class ErrorService {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  /**
   * Report an error to the monitoring service
   */
  reportError(error: Error | string, context?: Record<string, any>, severity: ErrorReport['severity'] = 'medium'): void {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity,
      context,
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported:', errorReport);
    }

    // Store locally (in production, this would send to monitoring service)
    this.storeErrorLocally(errorReport);

    // Send to monitoring service (placeholder for production implementation)
    this.sendToMonitoringService(errorReport);
  }

  /**
   * Retry a function with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const { maxRetries, baseDelay, maxDelay, backoffFactor } = {
      ...this.defaultRetryConfig,
      ...config,
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          this.reportError(lastError, { 
            attempts: attempt + 1,
            function: fn.name || 'anonymous'
          }, 'high');
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        await this.sleep(jitteredDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle network errors with retry logic
   */
  async handleNetworkError<T>(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    try {
      return await this.retryWithBackoff(operation, {
        maxRetries: 3,
        baseDelay: 1000,
      });
    } catch (error) {
      this.reportError(error as Error, { 
        operation: 'network_request',
        hasFallback: !!fallback 
      }, 'medium');

      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;

    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('NetworkError')) {
      return 'Connection problem. Please check your internet and try again.';
    }

    // Authentication errors
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'Your session has expired. Please log in again.';
    }

    // Permission errors
    if (message.includes('403') || message.includes('forbidden')) {
      return 'You don\'t have permission to perform this action.';
    }

    // Server errors
    if (message.includes('500') || message.includes('server')) {
      return 'Server error. Please try again in a moment.';
    }

    // File upload errors
    if (message.includes('file') && (message.includes('size') || message.includes('type'))) {
      return 'File upload failed. Please check the file size and format.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and try again.';
    }

    // Generic fallback
    return 'Something went wrong. Please try again.';
  }

  /**
   * Clear stored error reports
   */
  clearErrorReports(): void {
    try {
      localStorage.removeItem('errorReports');
    } catch (error) {
      console.warn('Failed to clear error reports:', error);
    }
  }

  /**
   * Get stored error reports
   */
  getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('errorReports');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve error reports:', error);
      return [];
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeErrorLocally(errorReport: ErrorReport): void {
    try {
      const existingErrors = this.getStoredErrors();
      existingErrors.push(errorReport);
      
      // Keep only last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(existingErrors));
    } catch (error) {
      console.warn('Failed to store error locally:', error);
    }
  }

  private async sendToMonitoringService(errorReport: ErrorReport): Promise<void> {
    // Placeholder for production monitoring service integration
    // In production, this would send to services like Sentry, LogRocket, etc.
    
    try {
      // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) });
      console.log('Error would be sent to monitoring service:', errorReport);
    } catch (error) {
      console.warn('Failed to send error to monitoring service:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const errorService = new ErrorService();