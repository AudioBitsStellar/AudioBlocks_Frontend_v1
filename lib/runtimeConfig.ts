/**
 * Runtime configuration loaded from the server.
 *
 * Unlike build-time `NEXT_PUBLIC_*` variables, runtime config can be changed
 * without rebuilding (#815). The config is fetched once at app startup and
 * cached, so feature flags can be toggled server-side for instant effect.
 *
 * Config falls back to environment variables for backward compatibility,
 * and to `defaultFlagValue()` if neither runtime config nor env vars exist.
 */

export interface RuntimeConfig {
  featureFlags: Record<string, boolean | string>;
}

let cachedRuntimeConfig: RuntimeConfig | null = null;
let configFetchPromise: Promise<RuntimeConfig | null> | null = null;

/**
 * Fetches runtime configuration from the server.
 * Returns null if fetch fails or we're in an environment where fetch isn't available.
 */
async function fetchRuntimeConfig(): Promise<RuntimeConfig | null> {
  // Only fetch on client side
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch('/api/runtime-config', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Don't cache; we want fresh config
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`Failed to fetch runtime config: ${response.status} ${response.statusText}`);
      return null;
    }

    const config = await response.json();
    return config as RuntimeConfig;
  } catch (error) {
    console.warn('Failed to fetch runtime config:', error);
    return null;
  }
}

/**
 * Get the current runtime config, fetching from the server if not yet cached.
 * Deduplicates concurrent fetch requests.
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig | null> {
  // If we've already cached it, return immediately
  if (cachedRuntimeConfig !== null) {
    return cachedRuntimeConfig;
  }

  // If a fetch is in progress, wait for it
  if (configFetchPromise !== null) {
    return configFetchPromise;
  }

  // Start the fetch and cache the promise to deduplicate
  configFetchPromise = fetchRuntimeConfig().then((config) => {
    if (config !== null) {
      cachedRuntimeConfig = config;
    }
    return config;
  });

  return configFetchPromise;
}

/**
 * Get a feature flag value from runtime config (synchronously if already cached).
 * Returns undefined if not set in runtime config.
 */
export function getRuntimeFeatureFlag(flagName: string): string | boolean | undefined {
  if (cachedRuntimeConfig === null) {
    return undefined;
  }
  return cachedRuntimeConfig.featureFlags[flagName];
}

/**
 * Invalidate the cached runtime config so it will be re-fetched on next access.
 * Useful for testing or when you know the config has changed.
 */
export function invalidateRuntimeConfig(): void {
  cachedRuntimeConfig = null;
  configFetchPromise = null;
}
