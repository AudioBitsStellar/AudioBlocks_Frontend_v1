/**
 * Runtime configuration published to the browser (#815).
 *
 * `NEXT_PUBLIC_*` values are inlined into the client bundle at build time, so
 * changing one needs a rebuild. Settings listed here come from server-only
 * variables instead. `app/api/runtime-config/route.ts` reads them on each
 * request and serves them as a script that the root layout loads before the
 * app hydrates, so the first render already sees them.
 *
 * Nothing in this module runs on the server: it only reads `window`.
 */

/** URL of the script that publishes the runtime config. */
export const RUNTIME_CONFIG_SCRIPT_PATH = '/api/runtime-config';

/** `window` property the published script assigns. */
export const RUNTIME_CONFIG_GLOBAL = '__AUDIOBLOCKS_RUNTIME_CONFIG__';

export interface RuntimeConfig {
  /** Raw flag values keyed by flag name. A missing key means "not overridden". */
  featureFlags: Record<string, string>;
}

declare global {
  interface Window {
    __AUDIOBLOCKS_RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Returns the runtime override for a feature flag, or `undefined` when the
 * server did not set one, or when there is no `window` (prerendering).
 */
export function readRuntimeFlagValue(flag: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__AUDIOBLOCKS_RUNTIME_CONFIG__?.featureFlags?.[flag];
}
