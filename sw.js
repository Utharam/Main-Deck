/**
 * sw.js — Main Deck Service Worker
 * Caches app shell for offline-first, network-first for API calls.
 */

const CACHE_NAME = 'maindeck-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/theme.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/ui.js',
  './js/pages/home.js',
  './js/pages/projects.js',
  './js/pages/phases.js',
  './js/pages/notes.js',
  './js/pages/sop.js',
  './js/pages/stressbuster.js',
  './js/pages/settings.js',
  './js/widgets/tasks.js',
  './js/widgets/calls.js',
  './js/widgets/emails.js',
  './js/widgets/meetings.js',
  './js/widgets/reminders.js',
  './js/widgets/dayssince.js',
  './js/widgets/weather.js',
  './js/widgets/stress.js',
  './js/widgets/messages.js',
  './js/widgets/quicklinks.js',
  './js/utils/export.js',
  './js/utils/import.js',
  './js/utils/notify.js',
  './js/utils/time.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for external API calls (weather, geocoding, etc.)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for local static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached, but also update cache in background
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
