import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/runtime-config/route';

const RUNTIME_VARS = [
  'RUNTIME_FEATURE_MERCH',
  'RUNTIME_FEATURE_EVENTS',
  'RUNTIME_FEATURE_COMMUNITY_VOTING',
  'RUNTIME_FEATURE_ARTIST_PERKS',
];

beforeEach(() => {
  // Blank values count as unset, so every runtime variable starts unset.
  for (const name of RUNTIME_VARS) vi.stubEnv(name, '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/runtime-config (#815)', () => {
  it('serves JavaScript that browsers and caches must not store', () => {
    const response = GET();

    expect(response.headers.get('Content-Type')).toContain('application/javascript');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('publishes only the runtime variables that are set', async () => {
    vi.stubEnv('RUNTIME_FEATURE_MERCH', 'false');

    const script = await GET().text();

    expect(script).toBe(
      'window.__AUDIOBLOCKS_RUNTIME_CONFIG__ = {"featureFlags":{"merch":"false"}};\n'
    );
  });

  it('trims values and publishes an empty object when nothing is set', async () => {
    vi.stubEnv('RUNTIME_FEATURE_ARTIST_PERKS', '  on  ');
    expect(await GET().text()).toContain('{"featureFlags":{"artistPerks":"on"}}');

    vi.stubEnv('RUNTIME_FEATURE_ARTIST_PERKS', '');
    expect(await GET().text()).toBe(
      'window.__AUDIOBLOCKS_RUNTIME_CONFIG__ = {"featureFlags":{}};\n'
    );
  });
});
