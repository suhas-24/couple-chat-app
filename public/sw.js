// Service Worker for Couple Chat App
// Provides offline functionality and caching

const CACHE_NAME = 'couple-chat-v1';
const STATIC_CACHE_NAME = 'couple-chat-static-v1';
const DYNAMIC_CACHE_NAME = 'couple-chat-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/chat',
  '/analytics',
  '/login',
  '/signup',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/manifest.json',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/auth/profile',
  '/api/chat/chats',
  '/api/analytics/',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first
    event.respondWith(handleStaticAssets(request));
  } else {
    // Pages and other resources - stale while revalidate
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for cacheable APIs
    if (networkResponse.ok && isCacheableApi(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API', request.url);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for specific endpoints
    if (url.pathname.includes('/api/chat/')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Offline - messages will be sent when connection is restored',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset', request.url);
    throw error;
  }
}

// Handle page requests with stale-while-revalidate strategy
async function handlePageRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    // Fetch from network in background
    const networkResponsePromise = fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const cache = caches.open(DYNAMIC_CACHE_NAME);
          cache.then(c => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
      })
      .catch(() => null);
    
    // Return cached version immediately if available
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Otherwise wait for network
    const networkResponse = await networkResponsePromise;
    if (networkResponse) {
      return networkResponse;
    }
    
    // Fallback to offline page
    return caches.match('/offline.html') || new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Couple Chat</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
              color: #374151;
            }
            .container { 
              text-align: center; 
              padding: 2rem;
              background: white;
              border-radius: 1rem;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            .heart { 
              font-size: 3rem; 
              margin-bottom: 1rem;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
            h1 { 
              color: #ec4899; 
              margin-bottom: 0.5rem;
            }
            p { 
              color: #6b7280; 
              line-height: 1.6;
            }
            .retry-btn {
              background: linear-gradient(135deg, #ec4899, #f43f5e);
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              margin-top: 1rem;
              font-size: 1rem;
            }
            .retry-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="heart">💕</div>
            <h1>You're Offline</h1>
            <p>Don't worry! Your love connection will be restored when you're back online.</p>
            <p>Any messages you send will be delivered once you reconnect.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Try Again
            </button>
          </div>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  } catch (error) {
    console.error('Service Worker: Page request failed', error);
    throw error;
  }
}

// Check if API endpoint is cacheable
function isCacheableApi(pathname) {
  return CACHEABLE_APIS.some(api => pathname.startsWith(api));
}

// Handle background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-messages') {
    console.log('Service Worker: Background sync triggered for messages');
    event.waitUntil(syncOfflineMessages());
  }
});

// Sync offline messages when connection is restored
async function syncOfflineMessages() {
  try {
    // Get offline messages from IndexedDB
    const offlineMessages = await getOfflineMessages();
    
    for (const message of offlineMessages) {
      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineMessage(message.id);
          
          // Notify clients
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'MESSAGE_SYNCED',
                message: message
              });
            });
          });
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync message', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// IndexedDB helpers for offline message storage
async function getOfflineMessages() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CoupleChat', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineMessages'], 'readonly');
      const store = transaction.objectStore('offlineMessages');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineMessages')) {
        db.createObjectStore('offlineMessages', { keyPath: 'id' });
      }
    };
  });
}

async function removeOfflineMessage(messageId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CoupleChat', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineMessages'], 'readwrite');
      const store = transaction.objectStore('offlineMessages');
      const deleteRequest = store.delete(messageId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'couple-chat-message',
      data: data,
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/reply-icon.png'
        },
        {
          action: 'view',
          title: 'View Chat',
          icon: '/view-icon.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'reply') {
    // Handle reply action
    event.waitUntil(
      clients.openWindow('/chat?reply=true')
    );
  } else if (event.action === 'view') {
    // Handle view action
    event.waitUntil(
      clients.openWindow('/chat')
    );
  } else {
    // Default action - open chat
    event.waitUntil(
      clients.openWindow('/chat')
    );
  }
});