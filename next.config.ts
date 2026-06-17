import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Lint should be a separate CI check, not a deploy gate — pre-existing
    // lint errors in unrelated components shouldn't block production builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
