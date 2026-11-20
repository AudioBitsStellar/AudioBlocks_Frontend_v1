import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

type RemotePattern = Exclude<
  NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number],
  URL
>;

/**
 * #595 — builds an exact-origin pattern from an env value such as
 * `https://cdn.example.com` or a bare host `bucket.s3.amazonaws.com`.
 * Returns null for unset or malformed values so a bad env never widens access.
 */
function originPattern(value: string | undefined, pathname: string): RemotePattern | null {
  if (!value?.trim()) return null;
  try {
    const raw = value.trim();
    const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return {
      protocol: url.protocol === 'https:' ? 'https' : 'http',
      hostname: url.hostname,
      port: url.port,
      pathname,
    };
  } catch {
    return null;
  }
}

/**
 * #846 — cache headers for this origin's own static output, so a fronting
 * CDN/edge cache (and the browser) can serve them without re-checking on
 * every request. Track audio/artwork is NOT served from this app — it comes
 * straight from `NEXT_PUBLIC_MEDIA_HOST` / the IPFS gateway configured above,
 * so its cache behavior is that origin's responsibility, not this config's.
 */
export async function headers() {
  return [
    {
      // #847 — tells browsers to upgrade this origin (and subdomains) to
      // HTTPS on their own for the next two years, without waiting on the
      // redirect `middleware.ts` issues for the first request. Sent
      // unconditionally: browsers only honor it on a response actually
      // delivered over HTTPS, so it's a no-op over plain HTTP (local dev).
      source: '/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ],
    },
    {
      // Next.js build output under `/_next/static/` is already content-hashed
      // per build; restating the header here keeps the contract explicit and
      // test-covered rather than relying on Next's (also immutable) default.
      source: '/_next/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      // Design/artwork assets under these `public/` subdirectories aren't
      // filename-hashed, so treat them as long-lived but revalidate-able: a
      // real change needs a new filename to bust this, same as the image
      // optimizer's own cache below. Matched by directory (the same
      // `/prefix/:path*` form `middleware.ts` already uses) rather than by
      // extension, since a `headers()` source is compiled by Next at build
      // time with no way to dry-run it here first — a typo'd extension
      // pattern would fail the build, not just miss a few files.
      source: '/:dir(artist_hub|dashboard|home|icons)/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
    },
    {
      // The service worker file itself must always be revalidated — caching
      // it defeats the update check browsers run on every navigation, which
      // is how `public/sw.js`'s own CACHE_VERSION bump reaches clients.
      source: '/sw.js',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
    },
    {
      source: '/manifest.json',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
    },
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  headers,
  images: {
    // NFT artwork is resolved through the application's configured IPFS
    // gateway. Never allow arbitrary remote hosts through the image optimizer.
    // #595 — also allow the backend's S3/CDN media host and the configured
    // IPFS gateway (e.g. a Pinata dedicated gateway); ipfs.io stays as fallback.
    remotePatterns: [
      { protocol: 'https', hostname: 'ipfs.io', pathname: '/ipfs/**' },
      originPattern(process.env.NEXT_PUBLIC_IPFS_GATEWAY, '/ipfs/**'),
      originPattern(process.env.NEXT_PUBLIC_MEDIA_HOST, '/**'),
    ].filter((pattern): pattern is RemotePattern => pattern !== null),
    // #846 — the optimizer re-derives variants from the CDN/IPFS origin;
    // 30 days keeps optimized covers cached without serving stale artwork
    // for long after an artist replaces one.
    minimumCacheTTL: 2592000,
  },
  eslint: {
    // Lint should be a separate CI check, not a deploy gate — pre-existing
    // lint errors in unrelated components shouldn't block production builds.
    // Enforced by the `lint` job in .github/workflows/test.yml.
    ignoreDuringBuilds: true,
  },
  // Type errors fail production builds (no `ignoreBuildErrors`). Type errors
  // are also caught in CI by the `type-check` job in .github/workflows/test.yml.
  webpack: (config) => {
    // @metamask/sdk (pulled in via @dynamic-labs/ethereum) optionally
    // supports React Native and imports this for native storage — it's
    // never used on web, so stub it out instead of bundling/resolving it.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

// Bundle analyzer configuration
const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

let config: NextConfig = withBundleAnalyzerConfig(nextConfig) as NextConfig;

// Add Sentry if DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  config = withSentryConfig(config, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
  });
}

export default config;
