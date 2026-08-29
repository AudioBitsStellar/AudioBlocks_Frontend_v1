// #277 — HttpOnly session cookie for route protection.
//
// The `audioblocks_jwt` cookie (set client-side via js-cookie, see
// hooks/useAuth.tsx) is deliberately readable by JS: apiClient.ts reads it
// to attach an `Authorization: Bearer` header on cross-origin requests to
// NEXT_PUBLIC_API_URL, and a cookie can never be both HttpOnly and
// JS-readable — that's a browser-enforced boundary, not a config option.
//
// middleware.ts's job is different: it only needs to know "is this request
// authenticated" to gate /dashboard and /profile. That check doesn't need
// JS-readable access, so it should not run against a cookie an XSS payload
// could read or forge. This route sets a *second*, HttpOnly-only session
// cookie via a real `Set-Cookie` response header (only a server response
// can set HttpOnly — client JS categorically cannot) and middleware.ts
// checks that one instead.
import { NextRequest, NextResponse } from 'next/server';
import { AUTH } from '@/lib/constants';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days — matches typical JWT expiry ceiling

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
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
