import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FEATURE_FLAGS,
  defaultFlagValue,
  filterEnabledByFlag,
  isFeatureEnabled,
  parseFlagValue,
  type FeatureFlagName,
} from '@/lib/featureFlags';

const ALL_FLAGS = Object.keys(FEATURE_FLAGS) as FeatureFlagName[];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseFlagValue', () => {
  it.each([
    ['true', true],
    ['TRUE', true],
    [' 1 ', true],
    ['on', true],
    ['yes', true],
    ['false', false],
    ['False', false],
    ['0', false],
    ['off', false],
    ['no', false],
  ])('parses %j as %s', (value, expected) => {
    expect(parseFlagValue(value, !expected)).toBe(expected);
  });

  it('falls back when the value is missing, empty or unrecognized', () => {
    expect(parseFlagValue(undefined, true)).toBe(true);
    expect(parseFlagValue(undefined, false)).toBe(false);
    expect(parseFlagValue('   ', false)).toBe(false);
    expect(parseFlagValue('maybe', true)).toBe(true);
  });
});

describe('defaultFlagValue', () => {
  it('is off in production so unimplemented features never ship', () => {
    expect(defaultFlagValue('production')).toBe(false);
  });

  it.each(['development', 'test', undefined])('is on outside production (%s)', (nodeEnv) => {
    expect(defaultFlagValue(nodeEnv)).toBe(true);
  });
});

describe('isFeatureEnabled', () => {
  it.each(ALL_FLAGS)('reads the %s flag from its environment variable', (flag) => {
    vi.stubEnv(FEATURE_FLAGS[flag].envVar, 'true');
    expect(isFeatureEnabled(flag)).toBe(true);

    vi.stubEnv(FEATURE_FLAGS[flag].envVar, 'false');
    expect(isFeatureEnabled(flag)).toBe(false);
  });

  it('defaults to off in production and on in development when unset', () => {
    for (const flag of ALL_FLAGS) {
      expect(isFeatureEnabled(flag, { value: '', nodeEnv: 'production' })).toBe(false);
      expect(isFeatureEnabled(flag, { value: '', nodeEnv: 'development' })).toBe(true);
    }
  });

  it('treats unrecognized values as unset', () => {
    expect(isFeatureEnabled('merch', { value: 'sometimes', nodeEnv: 'production' })).toBe(false);
    expect(isFeatureEnabled('merch', { value: 'sometimes', nodeEnv: 'development' })).toBe(true);
  });
});

describe('FEATURE_FLAGS', () => {
  it('uses NEXT_PUBLIC_FEATURE_* env vars so client bundles can read them', () => {
    for (const flag of ALL_FLAGS) {
      expect(FEATURE_FLAGS[flag].envVar).toMatch(/^NEXT_PUBLIC_FEATURE_[A-Z_]+$/);
      expect(FEATURE_FLAGS[flag].pendingEndpoints.length).toBeGreaterThan(0);
    }
  });

  it('declares each environment variable exactly once', () => {
    const envVars = ALL_FLAGS.map((flag) => FEATURE_FLAGS[flag].envVar);
    expect(new Set(envVars).size).toBe(envVars.length);
  });
});

describe('filterEnabledByFlag', () => {
  const items = [
    { name: 'Explore' },
    { name: 'Merch', featureFlag: 'merch' as const },
    { name: 'Community', featureFlag: 'communityVoting' as const },
  ];

  it('keeps ungated items and drops items whose flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MERCH', 'false');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING', 'false');

    expect(filterEnabledByFlag(items).map((item) => item.name)).toEqual(['Explore']);
  });

  it('restores gated items when their flag is on', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MERCH', 'true');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING', 'true');

    expect(filterEnabledByFlag(items).map((item) => item.name)).toEqual([
      'Explore',
      'Merch',
      'Community',
    ]);
  });
});
