// Service Worker for Learn Python PWA
// Version: 1.0.0

const CACHE_NAME = 'learn-python-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Core files to cache during install
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/core/app.js',
  '/engines/skulpt.min.js',
  '/engines/skulpt-stdlib.js',
  '/lessons/lessons.json',
  '/assets/styles.css',
  // Add your icon files
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  // Offline fallback page
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Install complete');
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old cache versions
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[Service Worker] Activate complete');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', request.url);
          return cachedResponse;
        }

        console.log('[Service Worker] Fetching from network:', request.url);
        
        return caches.open(RUNTIME_CACHE).then((cache) => {
          return fetch(request)
            .then((response) => {
              // Check if valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response before caching
              const responseToCache = response.clone();

              // Cache dynamically fetched resources
              if (request.url.includes('/lessons/') || 
                  request.url.includes('/assets/') ||
                  request.url.includes('.json')) {
                cache.put(request, responseToCache);
              }

              return response;
            })
            .catch((error) => {
              console.error('[Service Worker] Fetch failed:', error);
              
              // Return offline page for navigation requests
              if (request.mode === 'navigate') {
                return caches.match('/offline.html');
              }
              
              // Return a custom offline response for API calls
              if (request.url.includes('/api/') || request.url.includes('.json')) {
                return new Response(
                  JSON.stringify({ 
                    error: 'You are currently offline. Please check your connection.' 
                  }),
                  {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                      'Content-Type': 'application/json'
                    })
                  }
                );
              }
              
              throw error;
            });
        });
      })
  );
});

// Handle background sync for saving progress
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered');
  
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

// Function to sync progress when back online
async function syncProgress() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    
    const progressRequests = requests.filter(req => 
      req.url.includes('/api/progress') || req.url.includes('/save-progress')
    );
    
    for (const request of progressRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[Service Worker] Progress synced successfully');
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync progress:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[Service Worker] All caches cleared');
      })
    );
  }
});

// Handle push notifications for learning reminders
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Time to continue your Python learning journey!',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/assets/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Learn Python Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});