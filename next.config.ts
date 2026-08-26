import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // NFT artwork is resolved through the application's configured IPFS
    // gateway. Never allow arbitrary remote hosts through the image optimizer.
    remotePatterns: [{ protocol: 'https', hostname: 'ipfs.io', pathname: '/ipfs/**' }],
  },
  eslint: {
    // Lint should be a separate CI check, not a deploy gate — pre-existing
    // lint errors in unrelated components shouldn't block production builds.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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

export default withBundleAnalyzerConfig(nextConfig);
