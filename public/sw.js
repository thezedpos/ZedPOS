const CACHE_NAME = 'zedpos-offline-v1';

// 1. Install Phase: Cache the core files instantly
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png'
      ]);
    })
  );
  self.skipWaiting();
});

// 2. Activate Phase: Take over the app
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 3. Fetch Phase: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests (pages, images, styles).
  // We DO NOT cache POST/PUT requests (like making a sale to Supabase).
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // The internet is working! Save a fresh copy to the cache
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // The internet is down! Serve the saved copy from the cache
        return caches.match(event.request);
      })
  );
});