'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Check if the browser supports service workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Force registration immediately without waiting for window load
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker forcefully registered! Scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null; // Invisible background component
}