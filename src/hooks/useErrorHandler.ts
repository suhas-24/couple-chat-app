import { useCallback } from 'react';
import { errorService } from '../services/errorService';
import { useOfflineQueue } from './useOfflineQueue';
import { useNetworkStatus } from './useNetworkStatus';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  reportError?: boolean;
  fallbackAction?: () => void;
  retryAction?: () => Promise<void>;
}

export function useErrorHandler() {
  const { addToQueue } = useOfflineQueue();
  const { isOnline } = useNetworkStatus();

  const handleError = useCallback((
    error: Error | string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      reportError = true,
      fallbackAction,
      retryAction,
    } = options;

    // Report error if enabled
    if (reportError) {
      errorService.reportError(error, { 
        hasRetryAction: !!retryAction,
        hasFallbackAction: !!fallbackAction,
        isOnline 
      });
    }

    // Get user-friendly message
    const userMessage = errorService.getUserFriendlyMessage(error);

    // Show toast notification if enabled
    if (showToast) {
      // This would integrate with your toast notification system
      console.log('Toast:', userMessage);
    }

    // Execute fallback action if provided
    if (fallbackAction) {
      try {
        fallbackAction();
      } catch (fallbackError) {
        console.error('Fallback action failed:', fallbackError);
      }
    }

    return userMessage;
  }, [addToQueue, isOnline]);

  const handleAsyncError = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    options: ErrorHandlerOptions & {
      queueOnOffline?: boolean;
      queueType?: string;
      queueData?: any;
    } = {}
  ): Promise<T | null> => {
    const {
      queueOnOffline = false,
      queueType,
      queueData,
      ...errorOptions
    } = options;

    try {
      return await errorService.handleNetworkError(
        asyncOperation,
        errorOptions.fallbackAction ? () => {
          errorOptions.fallbackAction!();
          return null;
        } : undefined
      );
    } catch (error) {
      // If offline and queueing is enabled, add to queue
      if (!isOnline && queueOnOffline && queueType && queueData) {
        addToQueue(queueType, queueData);
        handleError('Action queued for when you\'re back online', {
          ...errorOptions,
          reportError: false,
        });
        return null;
      }

      handleError(error as Error, errorOptions);
      return null;
    }
  }, [handleError, addToQueue, isOnline]);

  const withErrorBoundary = useCallback(<T extends any[]>(
    fn: (...args: T) => void | Promise<void>,
    options: ErrorHandlerOptions = {}
  ) => {
    return async (...args: T) => {
      try {
        await fn(...args);
      } catch (error) {
        handleError(error as Error, options);
      }
    };
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    withErrorBoundary,
  };
}