// CattleTrack Analytics Service Worker
const CACHE_NAME = 'cattletrack-v1';
const STATIC_ASSETS = [
  '/cattletrack.html',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache when offline, network when online
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Supabase API calls
  if(event.request.method !== 'GET') return;
  if(event.request.url.includes('supabase.co')) return;
  if(event.request.url.includes('api.anthropic.com')) return;
  if(event.request.url.includes('cdn.')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if(response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(event.request).then(cached => {
          if(cached) return cached;
          // For navigation requests, serve the app
          if(event.request.mode === 'navigate') {
            return caches.match('/cattletrack.html');
          }
        });
      })
  );
});

// Listen for skip waiting message
self.addEventListener('message', event => {
  if(event.data === 'skipWaiting') self.skipWaiting();
});
