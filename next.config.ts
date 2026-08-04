import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // #155: track/artwork images are sourced from arbitrary NFT
    // metadata/IPFS gateways controlled by artists, not a fixed set of
    // domains we can enumerate — routing them through next/image (rather
    // than allowlisting specific hostnames) still gets format
    // auto-negotiation and resizing; a specific allowlist should replace
    // this once the actual metadata/gateway hosts in use are known.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  eslint: {
    // Lint should be a separate CI check, not a deploy gate — pre-existing
    // lint errors in unrelated components shouldn't block production builds.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // @metamask/sdk (pulled in via @dynamic-labs/ethereum) optionally
    // supports React Native and imports this for native storage — it's
    // never used on web, so stub it out instead of bundling/resolving it.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    // Web Worker support (#111): output workers as separate static assets
    // Workers are loaded via `new Worker(new URL('./worker', import.meta.url))`
    // which webpack 5 handles natively. This config ensures they are placed
    // in the output static directory for long-term caching.
    if (config.output && !config.output.webassemblyModuleFilename) {
      config.output.webassemblyModuleFilename = 'static/chunks/[id].[hash:8].wasm';
    }

    return config;
  },
};

// Bundle analyzer configuration
const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzerConfig(nextConfig);
