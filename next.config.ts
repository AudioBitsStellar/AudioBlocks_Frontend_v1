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

const nextConfig: NextConfig = {
  /* config options here */
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

let config = withBundleAnalyzerConfig(nextConfig);

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
