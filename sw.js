const CACHE_NAME = 'securephoto-v1.4.0'; 
const urlsToCache = [
  './',
  './index.html',
  './style.css?v=1.3.0',
  './script.js',
  './secure.js',
  './manifest.json?v=1.3.0',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell', CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate - delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Stale-while-revalidate for HTML, cache-first for static
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // For navigation requests, use network-first to avoid stale HTML
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For everything else, cache-first
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(req).then(networkResponse => {
        if (req.method === 'GET' && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, responseClone));
        }
        return networkResponse;
      });
    })
  );
});

// Listen for skip waiting message from page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
