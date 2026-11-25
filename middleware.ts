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
// How does it work

import { NextRequest, NextResponse } from 'next/server';
import { AUTH } from '@/lib/constants';
import { isMaintenanceModeEnabled } from '@/lib/maintenance';

const PROTECTED_PREFIXES = ['/dashboard', '/profile', '/onboarding'];
const LOGIN_PATH = '/';
const MAINTENANCE_PATH = '/maintenance';
const EMBED_PREFIX = '/embed';
const STATIC_ASSET_PATTERN =
  /\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|map|json|txt|xml|webmanifest|woff2?)$/i;

/**
 * #786 (SEC-04): generate a fresh base64 nonce for every HTML request and
 * build a Content-Security-Policy that whitelists inline scripts / styles
 * only when they carry that nonce. The policy is attached as
 * `Content-Security-Policy-Report-Only` so any genuine violation is logged
 * without breaking the page while the rollout stabilises; once logs are
 * clean this becomes `Content-Security-Policy` in one line change.
 *
 * The nonce is also forwarded to the app via the `x-csp-nonce` request
 * header so server components can read it with
 * `headers().get('x-csp-nonce')` and attach it to any inline `<script
 * nonce>` they emit (Next.js's own framework scripts honour this
 * automatically when the header is present).
 *
 * Static assets and API routes are skipped because they are either served
 * directly from the CDN (no HTML execution context) or return JSON.
 */
function buildCsp(nonce: string): string {
  const parts = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];
  return parts.join('; ');
}

function cspReportHeader(req: NextRequest): [string, string] | null {
  if (STATIC_ASSET_PATTERN.test(req.nextUrl.pathname)) return null;
  if (req.nextUrl.pathname.startsWith('/api')) return null;
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  // base64url - safe inside an HTTP header and a CSP attribute without escaping.
  const nonce = Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return [nonce, buildCsp(nonce)];
}

function applySecurity(res: NextResponse, req: NextRequest, nonce?: string, csp?: string): NextResponse {
  if (nonce) {
    // Expose the nonce to Server Components / the Next runtime.
    res.headers.set('x-csp-nonce', nonce);
  }
  if (csp) {
    // Start report-only so the first week of logs shape the final policy.
    // Swap this header name to `Content-Security-Policy` to enforce.
    res.headers.set('Content-Security-Policy-Report-Only', csp);
  }
  return res;
}

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

  // #786: generate the per-request CSP nonce once at the top so every branch
  // below applies it. Returns null for static assets and /api routes.
  const csp = cspReportHeader(req);
  const [nonce, policy] = csp ?? [undefined, undefined];

  // Forward the nonce on the *request* so server components can read it
  // via `headers().get('x-csp-nonce')` on this request's render cycle.
  const requestHeaders = new Headers(req.headers);
  if (nonce) requestHeaders.set('x-csp-nonce', nonce);
  const nextOptions = { request: { headers: requestHeaders } };

  if (isMaintenanceModeEnabled() && !bypassesMaintenance(pathname)) {
    return applySecurity(
      NextResponse.rewrite(new URL(MAINTENANCE_PATH, req.url), nextOptions),
      req,
      nonce,
      policy
    );
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return applySecurity(NextResponse.next(nextOptions), req, nonce, policy);

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
    return applySecurity(NextResponse.redirect(loginUrl), req, nonce, policy);
  }

  return applySecurity(NextResponse.next(nextOptions), req, nonce, policy);
}

export const config = {
  // Literal array required — Next.js extracts this at build time (#138).
  // #858 — broadened from the dashboard/profile/onboarding prefixes to every
  // route (static assets and `_next` excluded) so maintenance mode can gate
  // the whole site; `bypassesMaintenance` + `PROTECTED_PREFIXES` still decide
  // what each request actually does once it reaches the function.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
