/**
 * Feature flags for sections that are visible in the UI but not yet backed by
 * the AudioBlock API (#637).
 *
 * Merch, Events and Community voting all call endpoints that do not exist on
 * the backend yet, so they default to OFF in production and ON everywhere else
 * (local development, tests). Set the matching `NEXT_PUBLIC_FEATURE_*`
 * variable to override either default.
 *
 * Values are read from `process.env` through literal property accesses (see
 * `readFlagValue`) rather than `process.env[someVariable]`, because Next.js
 * only inlines statically-referenced `NEXT_PUBLIC_*` variables into the client
 * bundle.
 */

/** Names of the flags understood by the app. */
export type FeatureFlagName = 'merch' | 'events' | 'communityVoting' | 'artistPerks';

/** Static metadata for a single feature flag. */
export interface FeatureFlagDefinition {
  /** Environment variable that overrides the flag's default. */
  readonly envVar: `NEXT_PUBLIC_${string}`;
  /** Human-readable description used in docs and diagnostics. */
  readonly description: string;
  /** Endpoint(s) the feature depends on, none of which are implemented yet. */
  readonly pendingEndpoints: readonly string[];
}

/** Every feature flag, keyed by its `FeatureFlagName`. */
export const FEATURE_FLAGS: Record<FeatureFlagName, FeatureFlagDefinition> = {
  merch: {
    envVar: 'NEXT_PUBLIC_FEATURE_MERCH',
    description: 'Merch section on the Explore page',
    pendingEndpoints: ['/api/merch'],
  },
  events: {
    envVar: 'NEXT_PUBLIC_FEATURE_EVENTS',
    description: 'Events section on the Explore page',
    pendingEndpoints: ['/api/events'],
  },
  communityVoting: {
    envVar: 'NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING',
    description: 'Community voting and leaderboard page',
    pendingEndpoints: [
      '/api/community/leaderboard',
      '/api/community/vote',
      '/api/community/votes/me',
    ],
  },
  artistPerks: {
    envVar: 'NEXT_PUBLIC_FEATURE_ARTIST_PERKS',
    description: 'Fan perks section on the public artist page (#586)',
    pendingEndpoints: ['/api/artists/:artistId/perks'],
  },
};

const TRUTHY_VALUES = new Set(['true', '1', 'on', 'yes']);
const FALSY_VALUES = new Set(['false', '0', 'off', 'no']);

/**
 * Reads the raw environment value for a flag.
 *
 * Each branch deliberately references a literal `process.env.NEXT_PUBLIC_*`
 * property so the value survives Next.js' compile-time env inlining.
 */
function readFlagValue(flag: FeatureFlagName): string | undefined {
  switch (flag) {
    case 'merch':
      return process.env.NEXT_PUBLIC_FEATURE_MERCH;
    case 'events':
      return process.env.NEXT_PUBLIC_FEATURE_EVENTS;
    case 'communityVoting':
      return process.env.NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING;
    case 'artistPerks':
      return process.env.NEXT_PUBLIC_FEATURE_ARTIST_PERKS;
  }
}

/**
 * Default flag state when no (or an unparseable) environment value is set.
 *
 * Off in production so unimplemented features never ship by accident; on in
 * every other environment so contributors can see the sections locally.
 */
export function defaultFlagValue(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== 'production';
}

/**
 * Normalizes an environment string into a boolean.
 *
 * Accepts `true/false`, `1/0`, `on/off` and `yes/no` (case-insensitive, trimmed).
 * Anything else falls back to `fallback`.
 */
export function parseFlagValue(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') return fallback;

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) return true;
  if (FALSY_VALUES.has(normalized)) return false;
  return fallback;
}

export interface FeatureFlagOptions {
  /** Override the environment value (mostly useful in tests). */
  value?: string;
  /** Override the environment name used to compute the default. */
  nodeEnv?: string;
}

/**
 * Returns whether a feature flag is enabled.
 *
 * @example
 * if (isFeatureEnabled('merch')) { ... }
 */
export function isFeatureEnabled(flag: FeatureFlagName, options: FeatureFlagOptions = {}): boolean {
  const rawValue = options.value ?? readFlagValue(flag);
  return parseFlagValue(rawValue, defaultFlagValue(options.nodeEnv));
}

/**
 * Returns the subset of `items` that is allowed to render.
 *
 * Items without a flag are always visible.
 */
export function filterEnabledByFlag<T extends { featureFlag?: FeatureFlagName }>(items: T[]): T[] {
  return items.filter((item) => !item.featureFlag || isFeatureEnabled(item.featureFlag));
}
