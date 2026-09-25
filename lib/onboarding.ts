/**
 * First-time onboarding state (#478).
 *
 * A "first-time" user is an authenticated Dynamic user who has never finished
 * the onboarding step. The flag lives in localStorage (not a cookie) because:
 *  - it is per-browser UX state, not an auth credential;
 *  - middleware only needs the JWT session cookie (see middleware.ts), and
 *    adding a second server-readable cookie for UX would widen the cookie
 *    surface for no security benefit.
 *
 * All accessors are SSR-safe: they treat unknown state as "onboarding done" so
 * server rendering never triggers a redirect — the redirect decision is made
 * client-side in `components/auth/OnboardingRedirect.tsx` once Dynamic has
 * rehydrated the user.
 */

const ONBOARDING_STORAGE_KEY = 'audioblocks_onboarding_complete';

/** True when the current browser has completed onboarding (or state is unknown/SSR). */
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    // Storage can throw in private-mode Safari or when disabled; never block
    // the app on a UX flag.
    return true;
  }
}

/** Persist that onboarding has been completed in this browser. */
export function markOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {
    // ignore — best-effort UX flag
  }
}

/** Clear the flag (used by tests and any future "replay onboarding" action). */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // ignore
  }
}
