// Service Worker registration and management utilities

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private offlineQueue: Array<{ url: string; options: RequestInit; resolve: Function; reject: Function }> = [];

  constructor() {
    // Only add event listeners in browser environment
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * Register the service worker
   */
  async register(config: ServiceWorkerConfig = {}): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available
              config.onUpdate?.(registration);
            } else {
              // Content cached for first time
              config.onSuccess?.(registration);
            }
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      console.log('Service Worker registered successfully');
      config.onSuccess?.(registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      config.onError?.(error as Error);
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      await this.registration.update();
    } catch (error) {
      console.error('Service Worker update failed:', error);
      throw error;
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Check if the app is running in standalone mode (PWA)
   */
  isStandalone(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }

    try {
      return await navigator.storage.persist();
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (typeof navigator === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
      return null;
    }

    try {
      return await navigator.storage.estimate();
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return null;
    }
  }

  /**
   * Handle network requests with offline queue
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (this.isOnline) {
      try {
        return await fetch(url, options);
      } catch (error) {
        // Network error, add to offline queue if it's a POST request
        if (options.method === 'POST') {
          return this.addToOfflineQueue(url, options);
        }
        throw error;
      }
    } else {
      // Offline, add to queue if it's a POST request
      if (options.method === 'POST') {
        return this.addToOfflineQueue(url, options);
      }
      throw new Error('Offline - request cannot be completed');
    }
  }

  /**
   * Add request to offline queue
   */
  private addToOfflineQueue(url: string, options: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.offlineQueue.push({ url, options, resolve, reject });
      
      // Store in IndexedDB for persistence
      this.storeOfflineRequest(url, options);
      
      // Return a mock response for UI feedback
      resolve(new Response(
        JSON.stringify({
          success: false,
          queued: true,
          message: 'Request queued for when connection is restored'
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      ));
    });
  }

  /**
   * Process offline queue when back online
   */
  private async processOfflineQueue(): Promise<void> {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const { url, options, resolve, reject } of queue) {
      try {
        const response = await fetch(url, options);
        resolve(response);
        
        // Remove from IndexedDB
        this.removeOfflineRequest(url, options);
      } catch (error) {
        reject(error);
      }
    }
  }

  /**
   * Store offline request in IndexedDB
   */
  private async storeOfflineRequest(url: string, options: RequestInit): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['offlineRequests'], 'readwrite');
      const store = transaction.objectStore('offlineRequests');
      
      await store.add({
        id: Date.now() + Math.random(),
        url,
        options: {
          method: options.method,
          headers: options.headers,
          body: options.body
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to store offline request:', error);
    }
  }

  /**
   * Remove offline request from IndexedDB
   */
  private async removeOfflineRequest(url: string, options: RequestInit): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['offlineRequests'], 'readwrite');
      const store = transaction.objectStore('offlineRequests');
      
      // Find and delete matching request - simplified approach
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          const request = cursor.value;
          if (request.url === url && request.options.method === options.method) {
            cursor.delete();
          } else {
            cursor.continue();
          }
        }
      };
    } catch (error) {
      console.error('Failed to remove offline request:', error);
    }
  }

  /**
   * Open IndexedDB
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }
      
      const request = indexedDB.open('CoupleChat', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('offlineRequests')) {
          db.createObjectStore('offlineRequests', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('offlineMessages')) {
          db.createObjectStore('offlineMessages', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('App is back online');
    this.isOnline = true;
    this.processOfflineQueue();
    
    // Trigger background sync
    if (this.registration && 'sync' in this.registration) {
      (this.registration as any).sync.register('background-sync-messages');
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('App is offline');
    this.isOnline = false;
  }

  /**
   * Handle messages from service worker
   */
  private handleMessage(event: MessageEvent): void {
    const { data } = event;
    
    switch (data.type) {
      case 'MESSAGE_SYNCED':
        console.log('Message synced:', data.message);
        // Dispatch custom event for components to listen
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('messageSynced', { detail: data.message }));
        }
        break;
        
      case 'CACHE_UPDATED':
        console.log('Cache updated');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cacheUpdated'));
        }
        break;
        
      default:
        console.log('Unknown message from service worker:', data);
    }
  }

  /**
   * Get network status
   */
  getNetworkStatus(): { online: boolean; effectiveType?: string; downlink?: number } {
    if (typeof navigator === 'undefined') {
      return { online: this.isOnline };
    }
    
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      online: this.isOnline,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink
    };
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalResources(urls: string[]): Promise<void> {
    if (!this.registration || typeof caches === 'undefined') {
      return;
    }

    try {
      const cache = await caches.open('couple-chat-preload');
      await cache.addAll(urls);
    } catch (error) {
      console.error('Failed to preload resources:', error);
    }
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Default registration function
export const registerSW = (config?: ServiceWorkerConfig) => {
  return serviceWorkerManager.register(config);
};

// Utility functions
export const unregisterSW = () => serviceWorkerManager.unregister();
export const updateSW = () => serviceWorkerManager.update();
export const skipWaitingSW = () => serviceWorkerManager.skipWaiting();

export default serviceWorkerManager;