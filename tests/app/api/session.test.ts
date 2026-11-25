import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, verifyAccessToken } from '@/app/api/session/route';
import { AUTH } from '@/lib/constants';

describe('server-verified HttpOnly session (#789)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('validates access tokens against the backend authority', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test/api');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifyAccessToken('signed-token')).resolves.toBe('valid');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/users/profile',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ [AUTH.TOKEN_HEADER]: 'Bearer signed-token' }),
      })
    );
  });

  it('rejects backend-denied tokens without issuing a session', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test/api');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const req = new NextRequest('http://localhost:3000/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'forged-token' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('issues HttpOnly session only after successful backend verification', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test/api');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    const req = new NextRequest('http://localhost:3000/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'signed-token' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${AUTH.SESSION_COOKIE_NAME}=signed-token`);
    expect(cookie.toLowerCase()).toContain('httponly');
  });
});
