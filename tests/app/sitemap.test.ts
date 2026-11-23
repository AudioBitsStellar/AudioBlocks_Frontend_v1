import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sitemap (#860)', () => {
  it('only lists public, crawlable pages', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.audioblocks.xyz/api');
    const urls = sitemap().map((entry) => entry.url);

    // robots.txt disallows /dashboard, /onboarding and /login, and /dashboard
    // is also gated by auth middleware, so none of them belong in the sitemap.
    expect(urls).not.toContain('https://audioblocks.xyz/dashboard');
    expect(urls).not.toContain('https://audioblocks.xyz/login');
    expect(urls.some((url) => url.includes('/dashboard'))).toBe(false);
    expect(urls.some((url) => url.includes('/login'))).toBe(false);
  });

  it('includes the real public marketing and discovery pages', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.audioblocks.xyz/api');
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://api.audioblocks.xyz',
        'https://api.audioblocks.xyz/marketPlace',
        'https://api.audioblocks.xyz/artist-hub',
        'https://api.audioblocks.xyz/collective',
        'https://api.audioblocks.xyz/quality-standards',
        'https://api.audioblocks.xyz/help',
      ])
    );
  });

  it('falls back to the production domain when NEXT_PUBLIC_API_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    const urls = sitemap().map((entry) => entry.url);
    expect(urls[0]).toBe('https://audioblocks.xyz');
  });
});
