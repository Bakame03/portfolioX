/*
 * portfolioX service worker.
 * - Navigations: network-first (a deploy is picked up on the next visit),
 *   falling back to the cached shell when offline.
 * - Same-origin assets (css/js/fonts/images): stale-while-revalidate —
 *   served instantly from cache while a background fetch refreshes it.
 * - Cross-origin requests (GitHub API, Formspree, analytics, CDN) are
 *   never intercepted.
 *
 * Bump CACHE_VERSION when you want to force-drop every cached asset.
 */
const CACHE_VERSION = 'portfolioX-v1';

const PRECACHE = [
  './',
  'index.html',
  '404.html',
  'manifest.json',
  'assets/css/style.css',
  'assets/css/featured.css',
  'assets/js/main.js',
  'assets/js/translations.js',
  'assets/vendor/bootstrap/css/bootstrap.subset.min.css',
  'assets/vendor/glightbox/css/glightbox.min.css',
  'assets/vendor/glightbox/js/glightbox.min.js',
  'assets/vendor/typed.js/typed.umd.js',
  'assets/fonts/inter-var-latin.woff2',
  'assets/fonts/source-serif-4-var-latin.woff2',
  'assets/img/favicon.svg',
  'assets/img/aldo_alex_nganji.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: fresh HTML first, cache as offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((hit) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
