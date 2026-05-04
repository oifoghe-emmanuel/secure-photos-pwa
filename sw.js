// sw.js
const CACHE_NAME = 'securephoto-v1';
const ASSETS = [
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Install - cache all core files
self.addEventListener('install', (e) => {
  console.log('SW: Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching files', ASSETS);
        // Cache each file individually so 1 failure doesn't kill everything
        return Promise.all(
          ASSETS.map((url) => {
            return cache.add(url).catch((err) => {
              console.error('SW: Failed to cache:', url, err);
              throw err;
            });
          })
        );
      })
      .then(() => {
        console.log('SW: Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('SW: Install failed:', err);
      })
  );
});

// Activate - delete old caches
self.addEventListener('activate', (e) => {
  console.log('SW: Activated');
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log('SW: Deleting old cache:', key);
              return caches.delete(key);
            })
      );
    }).then(() => {
      console.log('SW: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch - serve from cache, fallback to network, fallback to index.html for navigation
self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // Don't cache Chrome extensions or other schemes
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Return cached file if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(e.request).then((networkResponse) => {
        // Don't cache bad responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }

        // Clone response because it's a stream
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Network failed and not in cache
        // If this is a navigation request, return cached index.html
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // For other requests, just fail
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});