# Incremental Static Regeneration (ISR) Caching & Revalidation Strategy

**Document Tracking:** Launch-Readiness Item `PERF-05` (Issue #830)  
**Status:** Implemented & Documented  
**Target:** AudioBlocks Web Application (`AudioBlocks_Frontend_v1`)  

---

## 1. Executive Summary

As part of the pre-launch performance hardening initiative for AudioBlocks, public-facing pages must deliver instant First Contentful Paint (FCP) and near-zero Time to First Byte (TTFB) while maintaining up-to-date data for newly minted audio NFTs, artist profile changes, and community metrics.

To achieve this, AudioBlocks leverages **Next.js 15 Incremental Static Regeneration (ISR)** via Route Segment Config exports (`export const revalidate = <seconds>`), coupled with edge CDN caching and on-demand cache invalidation.

---

## 2. Revalidation Schedule Matrix

| Route | Classification | Revalidation Interval (`revalidate`) | Rationale |
|---|---|---|---|
| `/` (Home) | Public Landing | `60` (1 minute) | High-traffic landing page; displays featured drops, trending artists, and hero audio previews. 60-second TTL prevents backend hammering while refreshing content promptly. |
| `/marketPlace` | Public Explore / Catalog | `60` (1 minute) | Primary discovery surface for NFTs and sound packs. Fast revalidation captures new sales, mints, and listings without expensive real-time SSR. |
| `/artist/[id]` | Public Artist Profile | `300` (5 minutes) | Artist bio, avatar, and discography change infrequently compared to catalog streams; 5-minute cache balances freshness with high cache hit ratios. |
| `/release/[id]` | Public Release / Song Page | `300` (5 minutes) | Individual song/release landing pages with JSON-LD metadata for social sharing and search indexing. |
| `/artist-hub` | Public Informational | `3600` (1 hour) | Marketing & onboarding page for prospective musicians; static copy changes infrequently. |
| `/quality-standards` | Public Documentation | `3600` (1 hour) | Audio quality criteria and AI mastering documentation; static reference material. |
| `/legal/terms` | Public Legal | `3600` (1 hour) | Terms of Service, disclaimers, and royalty agreements. |
| `/dashboard/*` | Protected / Private | `0` (Dynamic / SSR) | User-specific authenticated routes (user library, wallet transactions, settings). Handled via client-side React Query with optimistic UI. |

---

## 3. How ISR Operates Under Next.js 15 App Router

1. **Build Time (Static Pre-generation):**
   - Public pages with `export const revalidate = N` are pre-rendered into static HTML and JSON during `next build`.
2. **Initial & Subsequent Visits (Stale-While-Revalidate):**
   - Requests arriving within the `revalidate` window are served instantly from the CDN/Edge Cache (0ms backend latency).
   - The first request *after* the `revalidate` interval still receives the cached (stale) version immediately (no user delay).
   - Simultaneously, Next.js triggers a background regeneration of the page on the server.
   - Once regenerated successfully, Next.js updates the cache. All subsequent visitors receive the new HTML.
   - If regeneration fails (e.g. backend temporarily unreachable), the previous cached version continues to be served gracefully without showing error screens to users.

---

## 4. On-Demand Revalidation (Cache Invalidation)

In addition to time-based revalidation, AudioBlocks supports event-driven **on-demand revalidation** via Next.js server actions / API endpoints:

- **Webhook Trigger on New Release / Mint:**
  ```typescript
  import { revalidatePath } from 'next/cache';

  export async function onSongMinted(artistId: string, releaseId: string) {
    // Purge cached pages immediately upon blockchain confirmation
    revalidatePath(`/release/${releaseId}`);
    revalidatePath(`/artist/${artistId}`);
    revalidatePath('/marketPlace');
    revalidatePath('/');
  }
  ```

---

## 5. Edge CDN & Cache-Control Headers

In standalone production deployments (Docker / Kubernetes / CDN):

- For public ISR routes, the upstream reverse proxy / CDN (Cloudflare, AWS CloudFront, or Vercel Edge Network) respects the `s-maxage` response header emitted by Next.js:
  ```http
  Cache-Control: s-maxage=60, stale-while-revalidate=300
  ```
- Browser caches are instructed not to trap stale versions while intermediate CDN edge nodes serve cached content globally.

---

## 6. Verification and Acceptance Criteria

- **Acceptance Criterion:** Revalidation strategy documented and public routes configured with explicit ISR `revalidate` exports.
- **Automated Validation:** Test suite in `tests/app/isrCaching.test.ts` validates that all designated public routes export the exact intended revalidation constants.
