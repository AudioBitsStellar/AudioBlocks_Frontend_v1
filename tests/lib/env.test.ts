import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateEnv } from '@/lib/env';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('validateEnv', () => {
  it('returns trimmed values when every required variable is set', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', ' http://localhost:4000 ');
    vi.stubEnv('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID', ' env-123 ');

    expect(validateEnv()).toEqual({
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: 'env-123',
    });
  });

  it('requires the Dynamic environment ID', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000');
    vi.stubEnv('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID/);
  });

  it('treats a whitespace-only value as missing', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '   ');
    vi.stubEnv('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID', 'env-123');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
