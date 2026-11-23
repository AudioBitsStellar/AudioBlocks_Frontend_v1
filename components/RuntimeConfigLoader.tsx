/**
 * Initializes runtime configuration on app startup (#815).
 *
 * Fetches the runtime config from the server so feature flags can be
 * applied throughout the app without rebuild.
 */

'use client';

import { useEffect } from 'react';
import { getRuntimeConfig } from '@/lib/runtimeConfig';

export default function RuntimeConfigLoader() {
  useEffect(() => {
    // Fetch runtime config on mount to populate cache for feature flag checks
    getRuntimeConfig().catch(() => {
      // Errors are logged in getRuntimeConfig, nothing to do here
    });
  }, []);

  return null;
}
