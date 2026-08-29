/**
 * AudioBlocks Service Worker (`public/sw.js`)
 *
 * Provides progressive web app (PWA) capabilities, static asset caching,
 * API response caching, offline fallback support, and cache invalidation.
 *
 * @architecture
 * 1. Cache Storage Namespaces:
 *    - `static-assets-cache-v1`: Stores static shell resources, Next.js JS/CSS bundles, fonts, and images.
 *    - `api-cache-v1`: Caches dynamic REST/GraphQL backend API responses.
 *
 * 2. Caching Strategies:
 *    - API Requests (`/api/*`): Network-First with Cache Fallback.
 *      Attempts to fetch fresh backend data over the network first. Upon success, clones and updates
 *      the response in `api-cache-v1`. If offline or network fetch fails, returns cached API data.
 *    - Static Assets (`/_next/static/*`, media extensions, static shell): Cache-First with Network Fallback.
 *      Serves cached assets immediately for fast load times. On cache miss, fetches over network,
 *      validates HTTP 200 basic response, and updates `static-assets-cache-v1`.
 *    - Default Requests: Pass-through standard fetch request directly to network.
 *
 * 3. Cache Lifecycle & Invalidation:
 *    - `install`: Pre-caches core shell assets (`/`, `/favicon.ico`) and triggers `self.skipWaiting()`.
 *    - `activate`: Sweeps CacheStorage, deletes outdated cache buckets non-matching `CACHE_VERSION`,
 *      and claims active clients (`self.clients.claim()`).
 *    - Invalidation Trigger: Incrementing `CACHE_VERSION` (e.g. 'v1' -> 'v2') automatically purges old caches.
 *
 * 4. Offline Capabilities:
 *    - Enables full offline shell loading for cached static routes and assets.
 *    - Provides stale cached API data when user experiences low connectivity or offline state.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `static-assets-cache-${CACHE_VERSION}`;
const API_CACHE_NAME = `api-cache-${CACHE_VERSION}`;

/** Core static application shell resources pre-cached during Service Worker installation. */
const STATIC_ASSETS = ['/', '/favicon.ico'];

/**
 * Service Worker Install Event Handler
 * Pre-caches fundamental static assets and immediately activates the new worker.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

/**
 * Service Worker Activate Event Handler
 * Purges obsolete cache buckets when CACHE_VERSION changes and claims open browser clients.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Service Worker Fetch Interceptor
 * Routes fetch events to appropriate caching strategies based on URL pattern matching.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strategy 1: Network-first for API requests (`/api/*`)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(API_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Strategy 2: Cache-first for static assets (Next.js bundles, images, CSS, fonts)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/) ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Strategy 3: Default pass-through fetch for external / non-matching requests
  event.respondWith(fetch(event.request));
});
