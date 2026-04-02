/**
 * NovaDash 3.0 — sw.js
 * Service Worker: Cache-first for static assets, Network-first for Firestore
 */

const CACHE_NAME = 'novadash-v3.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './offline.html',
  './manifest.json',
  './css/style.css',
  './css/themes.css',
  './css/animations.css',
  './js/firebase.js',
  './js/auth.js',
  './js/firestore.js',
  './js/ui.js',
  './js/widgets.js',
  './js/ai.js',
  './js/search.js',
  './js/analytics.js',
  './js/shortcuts.js',
  './js/pwa.js',
  './js/app.js',
  // CDN resources
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js',
];

// ── Install: pre-cache static assets ──
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: smart routing strategy ──
self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Skip chrome-extension and non-http
  if (!url.startsWith('http')) return;

  // Network-first for Firebase/Firestore (real-time data)
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('generativelanguage.googleapis.com') ||
    url.includes('rss2json.com') ||
    url.includes('open-meteo.com') ||
    url.includes('ipapi.co') ||
    url.includes('zenquotes.io') ||
    url.includes('corsproxy.io')
  ) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Return cached version if network fails (offline)
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(e.request).then(response => {
        // Cache successful GET responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
      });
    })
  );
});
