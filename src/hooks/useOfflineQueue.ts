import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { errorService } from '../services/errorService';

export interface QueuedAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOnline } = useNetworkStatus();

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const storedQueue = localStorage.getItem('offlineQueue');
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(queue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }, [queue]);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [isOnline, queue.length, isProcessing]);

  const addToQueue = useCallback((type: string, data: any, maxRetries: number = 3) => {
    const action: QueuedAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
    };

    setQueue(prev => [...prev, action]);
    return action.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(action => action.id !== id));
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0 || !isOnline) {
      return;
    }

    setIsProcessing(true);

    try {
      // Process actions one by one
      for (const action of queue) {
        try {
          await processAction(action);
          removeFromQueue(action.id);
        } catch (error) {
          // Increment retry count
          setQueue(prev => 
            prev.map(a => 
              a.id === action.id 
                ? { ...a, retries: a.retries + 1 }
                : a
            )
          );

          // Remove if max retries reached
          if (action.retries >= action.maxRetries) {
            errorService.reportError(
              `Failed to process queued action after ${action.maxRetries} retries`,
              { action },
              'medium'
            );
            removeFromQueue(action.id);
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, queue, isOnline, removeFromQueue]);

  const processAction = async (action: QueuedAction): Promise<void> => {
    switch (action.type) {
      case 'send_message':
        await processSendMessage(action.data);
        break;
      case 'upload_file':
        await processFileUpload(action.data);
        break;
      case 'update_profile':
        await processProfileUpdate(action.data);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  const processSendMessage = async (data: any): Promise<void> => {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
  };

  const processFileUpload = async (data: any): Promise<void> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }
  };

  const processProfileUpdate = async (data: any): Promise<void> => {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.statusText}`);
    }
  };

  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem('offlineQueue');
  }, []);

  const getQueueStats = useCallback(() => {
    return {
      total: queue.length,
      pending: queue.filter(a => a.retries === 0).length,
      retrying: queue.filter(a => a.retries > 0).length,
      failed: queue.filter(a => a.retries >= a.maxRetries).length,
    };
  }, [queue]);

  return {
    queue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    getQueueStats,
  };
}