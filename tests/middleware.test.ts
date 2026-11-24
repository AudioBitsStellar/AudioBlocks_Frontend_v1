import { afterEach, describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '@/middleware';
import { AUTH } from '@/lib/constants';

function createMockRequest(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(url, 'http://localhost:3000'), {
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  });
  return req;
}

const createFakeJwt = (expInSecondsFromNow: number) => {
  const exp = Math.floor(Date.now() / 1000) + expInSecondsFromNow;
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp, sub: 'user_123' }));
  return `${header}.${payload}.signature`;
};

describe('middleware redirect-to-login (#470)', () => {
  it('allows public routes without authentication', () => {
    const req = createMockRequest('http://localhost:3000/');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated users from /dashboard to / with returnTo', () => {
    const req = createMockRequest('http://localhost:3000/dashboard');
    const res = middleware(req);

    expect(res.status).toBe(307);
    const redirectLocation = res.headers.get('location');
    expect(redirectLocation).toBeDefined();
    const url = new URL(redirectLocation!);
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard');
    expect(url.searchParams.get('auth')).toBe('login');
  });

  it('redirects unauthenticated users from /profile with deep query params preserved', () => {
    const req = createMockRequest('http://localhost:3000/profile/edit?tab=settings');
    const res = middleware(req);

    expect(res.status).toBe(307);
    const redirectLocation = res.headers.get('location');
    const url = new URL(redirectLocation!);
    expect(url.searchParams.get('returnTo')).toBe('/profile/edit?tab=settings');
  });

  it('allows access to protected routes when valid session cookie is present', () => {
    const validToken = createFakeJwt(3600);
    const req = createMockRequest('http://localhost:3000/dashboard', {
      [AUTH.SESSION_COOKIE_NAME]: validToken,
    });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('does not trust a client-readable JWT cookie for route authorization', () => {
    const validToken = createFakeJwt(3600);
    const req = createMockRequest('http://localhost:3000/dashboard', {
      [AUTH.COOKIE_NAME]: validToken,
    });
    const res = middleware(req);
    expect(res.status).toBe(307);
  });

  it('does not trust an unverified Privy cookie for route authorization', () => {
    const req = createMockRequest('http://localhost:3000/dashboard', {
      'privy-token': 'privy_session_token_example',
    });
    const res = middleware(req);
    expect(res.status).toBe(307);
  });

  it('redirects when session token is expired', () => {
    const expiredToken = createFakeJwt(-3600);
    const req = createMockRequest('http://localhost:3000/dashboard', {
      [AUTH.SESSION_COOKIE_NAME]: expiredToken,
    });
    const res = middleware(req);
    expect(res.status).toBe(307);
  });
});

describe('middleware maintenance mode (#858)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('leaves every route alone when MAINTENANCE_MODE is off', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'false');
    const res = middleware(createMockRequest('http://localhost:3000/'));
    expect(res.status).toBe(200);
  });

  it('rewrites an ordinary page to /maintenance when MAINTENANCE_MODE is on', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    const res = middleware(createMockRequest('http://localhost:3000/marketPlace'));
    expect(res.headers.get('x-middleware-rewrite')).toBe('http://localhost:3000/maintenance');
  });

  it('does not rewrite the maintenance page itself, avoiding a redirect loop', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    const res = middleware(createMockRequest('http://localhost:3000/maintenance'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('does not rewrite API routes', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    const res = middleware(createMockRequest('http://localhost:3000/api/session'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('still applies the auth check once maintenance mode is off again', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    vi.stubEnv('MAINTENANCE_MODE', 'false');
    const res = middleware(createMockRequest('http://localhost:3000/dashboard'));
    expect(res.status).toBe(307);
  });
});


describe('middleware frame policy (#788)', () => {
  it('denies framing on ordinary routes', () => {
    const res = middleware(createMockRequest('http://localhost:3000/'));
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('allows framing only for embed routes', () => {
    const res = middleware(createMockRequest('http://localhost:3000/embed/song/123'));
    expect(res.headers.get('content-security-policy')).toContain('frame-ancestors *');
    expect(res.headers.get('x-frame-options')).toBeNull();
  });
});
