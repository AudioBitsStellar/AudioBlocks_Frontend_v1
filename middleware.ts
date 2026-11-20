// #138 — Middleware guards all dashboard and profile routes.
// Previous version only checked /dashboard and redirected to / with no return
// URL, meaning users had to navigate back manually after login.
//
// Fixes:
//  • /profile routes are now protected (added to matcher and check)
//  • Redirect target is /login (not /) so the login page receives the intent
//  • `returnTo` query param preserves the original URL for post-login redirect
//  • Expired JWTs are detected by checking the `exp` claim in the cookie value
//    so stale tokens don't grant access to protected pages
//  • #478 — /onboarding is also gated so only authenticated users reach it;
//    guests are sent to the landing page with a returnTo back to onboarding.

import { NextRequest, NextResponse } from 'next/server';
import { AUTH } from '@/lib/constants';

const PROTECTED_PREFIXES = ['/dashboard', '/profile', '/onboarding'];
const LOGIN_PATH = '/';

function isExpiredJwt(tokenValue: string): boolean {
  try {
    const parts = tokenValue.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.exp !== 'number') return false;
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.split(':')[0];
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * #847 — the canonical host (e.g. `www.` vs apex, or a stray preview domain)
 * is derived from `NEXT_PUBLIC_SITE_URL` — the same env var `app/layout.tsx`
 * already uses for `metadataBase` — so there's one source of truth for "the
 * domain" instead of a second hardcoded one. Unset or still pointing at the
 * `.env.example` loopback default (local dev, and every CI job, which never
 * sets this var) means there's no real domain yet to enforce, so redirects
 * are skipped entirely rather than guessed at.
 */
function canonicalHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw?.trim()) return null;
  try {
    const host = new URL(raw).host;
    return isLoopbackHost(host) ? null : host;
  } catch {
    return null;
  }
}

/** Redirects a non-canonical host or a plain-HTTP request to the canonical, HTTPS URL. */
function enforceCanonicalOrigin(req: NextRequest): NextResponse | null {
  const host = canonicalHost();
  if (!host) return null;

  const requestHost = req.headers.get('host') ?? req.nextUrl.host;
  // Behind a proxy/CDN that terminates TLS, the original scheme only
  // survives as this header — `req.nextUrl.protocol` would say `http:` for
  // every request. Its absence (no proxy in front) is treated as HTTPS
  // rather than forced into a redirect loop.
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';

  if (requestHost === host && proto === 'https') return null;

  const canonicalUrl = new URL(`https://${host}${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(canonicalUrl, 308);
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const originRedirect = enforceCanonicalOrigin(req);
  if (originRedirect) return originRedirect;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  // #277, #470 — read HttpOnly session cookie, fallback to client JWT cookie,
  // or Privy authentication cookies.
  const sessionCookie = req.cookies.get(AUTH.SESSION_COOKIE_NAME);
  const jwtCookie = req.cookies.get(AUTH.COOKIE_NAME);
  const privyCookie =
    req.cookies.get('privy-token') ||
    req.cookies.get('privy-id-token') ||
    req.cookies.get('privy-session');

  const hasValidSession = !!(sessionCookie && !isExpiredJwt(sessionCookie.value));
  const hasValidJwt = !!(jwtCookie && !isExpiredJwt(jwtCookie.value));
  const hasPrivyAuth = !!privyCookie;

  const isAuthenticated = hasValidSession || hasValidJwt || hasPrivyAuth;

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    const returnTarget = `${pathname}${req.nextUrl.search || ''}`;
    loginUrl.searchParams.set('returnTo', returnTarget);
    loginUrl.searchParams.set('auth', 'login');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Literal array required — Next.js extracts this at build time (#138).
  // #847 — broadened from the protected-route prefixes alone so the
  // canonical-host/HTTPS check above runs on every page request; static
  // build output and the files handled by their own `next.config.ts`
  // cache rules are excluded since a redirect there would only add latency.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)'],
};
