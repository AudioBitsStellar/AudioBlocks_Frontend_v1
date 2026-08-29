# Service Worker Caching & Offline Strategy

`public/sw.js` implements a custom Service Worker for AudioBlocks Frontend to deliver high-performance static asset caching, API response resilience, and offline media application availability.

---

## 🏗 Architecture Overview

The Service Worker operates at the browser root level (`/sw.js`) and intercepts all network requests initiated by the application. It segregates cached data into two distinct `CacheStorage` buckets:

1. **`static-assets-cache-v1`**: Pre-cached shell resources (`/`, `/favicon.ico`), Next.js static JavaScript chunks (`/_next/static/*`), CSS stylesheets, web fonts (`woff2`, `ttf`, `eot`), and UI image assets.
2. **`api-cache-v1`**: Dynamic endpoint responses for requests matching the `/api/` prefix.

---

## ⚡ Caching Strategies

```
                       ┌─────────────────────────┐
                       │   Application Fetch     │
                       └────────────┬────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
         Is /api/* Endpoint?                Is Static Asset / Bundle?
                  │                                   │
       (Network-First Strategy)             (Cache-First Strategy)
                  │                                   │
         ┌────────┴────────┐                 ┌────────┴────────┐
         ▼                 ▼                 ▼                 ▼
   Fetch Network     Offline? Return   Return Cached     Cache Miss?
   & Update Cache    Cached Response   Asset (Instant)   Fetch & Store
```

### 1. Network-First Strategy (`/api/*`)

- **Primary Behavior**: Attempts to execute the fetch request over the network.
- **Cache Update**: On a successful network response, a clone of the response is stored in `api-cache-v1`.
- **Fallback**: If the network request fails (e.g. offline, timeout, server unavailable), the Service Worker serves the last cached response from `api-cache-v1`.
- **Use Case**: Ensures listeners receive up-to-date playlist details, balance stats, and social feeds while preserving offline fallback data.

### 2. Cache-First Strategy (Static Assets & Media)

- **Primary Behavior**: Checks `static-assets-cache-v1` first. If a match is found, it is returned instantly without network delay.
- **Cache Miss**: If not present, fetches from the network, verifies an HTTP `200 OK` basic response, stores a copy in `static-assets-cache-v1`, and returns the response.
- **Targeted Assets**:
  - `/_next/static/*`
  - `.png`, `.jpg`, `.jpeg`, `.svg`, `.gif`, `.webp`
  - `.woff2`, `.woff`, `.ttf`, `.eot`
  - Static app shell (`/`, `/favicon.ico`)

### 3. Default Pass-Through Fetch

- Requests that do not match `/api/` or static asset patterns are routed directly to the network without intervention.

---

## 🔄 Cache Invalidation & Versioning

Service Worker updates and cache cleanups are driven by the `CACHE_VERSION` string:

```javascript
const CACHE_VERSION = 'v1';
const CACHE_NAME = `static-assets-cache-${CACHE_VERSION}`;
const API_CACHE_NAME = `api-cache-${CACHE_VERSION}`;
```

### Invalidation Lifecycle:

1. **Version Update**: When updating assets or service worker logic, increment `CACHE_VERSION` (e.g., `'v1'` $\rightarrow$ `'v2'`).
2. **Install Phase**: `self.skipWaiting()` forces the new worker to take over immediately upon installation.
3. **Activate Phase**: The `activate` event handler queries all `CacheStorage` keys and deletes any cache buckets whose name does not equal current `CACHE_NAME` or `API_CACHE_NAME`.
4. **Client Claiming**: `self.clients.claim()` ensures open tabs and windows use the newly updated Service Worker immediately without requiring a full page refresh.

---

## 📡 Offline Capabilities & Fallbacks

- **App Shell Availability**: Cached static assets allow the application shell, navigation components, and player UI to render when disconnected from internet access.
- **Graceful API Degradation**: API responses cached during previous online sessions allow UI views to display historical audio metadata and user collection stats while offline.
- **Network Recovery**: Once network connectivity is restored, the Network-First strategy automatically refreshes cached API endpoints seamlessly.

---

## 🛠 Testing & Inspection

To inspect or test the Service Worker in modern browsers:

1. Open Chrome DevTools $\rightarrow$ **Application** tab.
2. Select **Service Workers** under Application to verify registration, view status, or toggle **Offline** mode.
3. Select **Cache Storage** under Cache to inspect stored entries in `static-assets-cache-v1` and `api-cache-v1`.
