// public/sw.js
const CACHE_NAME = 'zedpos-cache-v1';

// Install the service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate the service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Intercept network requests (Just passes them through for now)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});