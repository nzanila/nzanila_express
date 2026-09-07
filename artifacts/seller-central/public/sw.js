// Seller Central service worker.
//
// Bump CACHE_NAME on any change to this file — the activate handler deletes every other
// cache, which is what stops a seller being served a stale bundle after a deploy.
const CACHE_NAME = 'nzanila-seller-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/app-icon-192.png', '/app-icon-512.png'];

self.addEventListener('install', event => {
  // Individual puts rather than cache.addAll: addAll rejects the whole install if any one
  // asset 404s, which would silently leave the app uninstallable.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(SHELL.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache the API. A seller looking at orders, stock or messages must see the
  // current state, and a cached order list is worse than an error.
  if (url.pathname.startsWith('/api/')) return;

  // Cross-origin (the API worker, Unsplash, fonts) goes straight to the network.
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so a deploy is picked up immediately, falling back to the
  // cached shell so the app still opens with no connection.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then(hit => hit || caches.match('/')))
    );
    return;
  }

  // Static assets: cache first, since Vite fingerprints filenames so a hit is never stale.
  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
