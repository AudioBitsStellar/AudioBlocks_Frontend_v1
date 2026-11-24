// #789 — server-verified HttpOnly session used by middleware route protection.
import { NextRequest, NextResponse } from 'next/server';
import { AUTH } from '@/lib/constants';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const VERIFY_TIMEOUT_MS = 5000;

export type SessionVerification = 'valid' | 'invalid' | 'unavailable';

function profileVerificationUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) return null;
  const base = configured.replace(/\/api\/?$/, '');
  return `${base}/api/users/profile`;
}

export async function verifyAccessToken(token: string): Promise<SessionVerification> {
  const url = profileVerificationUrl();
  if (!url) return 'unavailable';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        [AUTH.TOKEN_HEADER]: `${AUTH.TOKEN_PREFIX} ${token}`,
      },
    });
    if (response.status === 401 || response.status === 403) return 'invalid';
    return response.ok ? 'valid' : 'unavailable';
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const verification = await verifyAccessToken(token);
  if (verification === 'invalid') {
    return NextResponse.json({ error: 'invalid session token' }, { status: 401 });
  }
  if (verification === 'unavailable') {
    return NextResponse.json({ error: 'session verification unavailable' }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH.SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
}
