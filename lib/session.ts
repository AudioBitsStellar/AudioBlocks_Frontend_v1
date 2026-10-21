import Cookies from 'js-cookie';
import { AUTH } from './constants';

/**
 * Whether the browser holds an AudioBlocks auth cookie. This only checks that a
 * session exists locally; the API still decides whether the token is valid.
 */
export function hasAuthSession(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(Cookies.get(AUTH.COOKIE_NAME) || Cookies.get(AUTH.SESSION_COOKIE_NAME));
}

/**
 * Reads the `exp` claim from a JWT without verifying it. Verification is the
 * API's job — the client only needs the expiry to warn the user before the
 * session lapses.
 *
 * @param token - Encoded JWT (header.payload.signature).
 * @returns Expiry as a millisecond epoch, or null if the token has no
 * readable `exp` claim.
 */
export function getTokenExpiry(token: string | undefined | null): number | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const { exp } = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Formats a remaining duration as `m:ss` for countdown display.
 *
 * @param ms - Remaining time in milliseconds; negative values clamp to zero.
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
