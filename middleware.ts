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
//  • #858 — when `MAINTENANCE_MODE` is on, every route (besides the
//    maintenance page itself, `/api`, and static assets) rewrites to
//    `/maintenance` before the auth check below ever runs.

import { NextRequest, NextResponse } from 'next/server';
import { AUTH } from '@/lib/constants';
import { isMaintenanceModeEnabled } from '@/lib/maintenance';

const PROTECTED_PREFIXES = ['/dashboard', '/profile', '/onboarding'];
const LOGIN_PATH = '/';
const MAINTENANCE_PATH = '/maintenance';
const EMBED_PREFIX = '/embed';
const STATIC_ASSET_PATTERN =
  /\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|map|json|txt|xml|webmanifest|woff2?)$/i;

function bypassesMaintenance(pathname: string): boolean {
  return (
    pathname === MAINTENANCE_PATH ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    STATIC_ASSET_PATTERN.test(pathname)
  );
}

function applyFramePolicy(response: NextResponse, pathname: string): NextResponse {
  const isEmbed = pathname === EMBED_PREFIX || pathname.startsWith(`${EMBED_PREFIX}/`);
  response.headers.set(
    'Content-Security-Policy',
    isEmbed ? 'frame-ancestors *' : "frame-ancestors 'none'"
  );
  if (!isEmbed) response.headers.set('X-Frame-Options', 'DENY');
  else response.headers.delete('X-Frame-Options');
  return response;
}

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

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isMaintenanceModeEnabled() && !bypassesMaintenance(pathname)) {
    return applyFramePolicy(NextResponse.rewrite(new URL(MAINTENANCE_PATH, req.url)), pathname);
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return applyFramePolicy(NextResponse.next(), pathname);

  // #789 — protected routes trust only the HttpOnly AudioBlocks session.
  // Client-readable JWT/Privy cookies are not authorization evidence here:
  // /api/session verifies the backend token before this cookie is issued.
  const sessionCookie = req.cookies.get(AUTH.SESSION_COOKIE_NAME);
  const isAuthenticated = !!(sessionCookie && !isExpiredJwt(sessionCookie.value));

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    const returnTarget = `${pathname}${req.nextUrl.search || ''}`;
    loginUrl.searchParams.set('returnTo', returnTarget);
    loginUrl.searchParams.set('auth', 'login');
    return applyFramePolicy(NextResponse.redirect(loginUrl), pathname);
  }

  return applyFramePolicy(NextResponse.next(), pathname);
}

export const config = {
  // Literal array required — Next.js extracts this at build time (#138).
  // #858 — broadened from the dashboard/profile/onboarding prefixes to every
  // route (static assets and `_next` excluded) so maintenance mode can gate
  // the whole site; `bypassesMaintenance` + `PROTECTED_PREFIXES` still decide
  // what each request actually does once it reaches the function.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
