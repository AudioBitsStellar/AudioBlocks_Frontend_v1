/**
 * First-time onboarding state (#478, #596, #712).
 *
 * Backend is the source of truth for onboarding completion (user profile/accountType).
 * The localStorage flag is kept only as a client-side cache keyed by user id
 * to avoid a flash before the profile query resolves.
 *
 * All accessors are SSR-safe: they treat unknown state as "onboarding done" so
 * server rendering never triggers a redirect — the redirect decision is made
 * client-side in `components/auth/OnboardingRedirect.tsx` once Dynamic has
 * rehydrated the user.
 */

const BASE_ONBOARDING_KEY = 'audioblocks_onboarding_complete';

export function getOnboardingStorageKey(userId?: string | null): string {
  return userId ? `${BASE_ONBOARDING_KEY}:${encodeURIComponent(userId)}` : BASE_ONBOARDING_KEY;
}

/**
 * True when the user (or current browser) has cached completion in localStorage.
 * When userId is provided, checks the user-scoped key; returns false if not cached.
 */
export function hasCompletedOnboarding(userId?: string | null): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (userId) {
      const userScoped = window.localStorage.getItem(getOnboardingStorageKey(userId));
      if (userScoped !== null) return userScoped === 'true';
      return false;
    }
    return window.localStorage.getItem(BASE_ONBOARDING_KEY) === 'true';
  } catch {
    // Storage can throw in private-mode Safari or when disabled; never block
    // the app on a UX flag.
    return true;
  }
}

/** Persist that onboarding has been completed for this user in this browser. */
export function markOnboardingComplete(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      window.localStorage.setItem(getOnboardingStorageKey(userId), 'true');
    }
    window.localStorage.setItem(BASE_ONBOARDING_KEY, 'true');
  } catch {
    // ignore — best-effort UX flag
  }
}

/** Clear the flag (used on logout, tests, and any future "replay onboarding" action). */
export function resetOnboarding(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      window.localStorage.removeItem(getOnboardingStorageKey(userId));
    }
    window.localStorage.removeItem(BASE_ONBOARDING_KEY);
  } catch {
    // ignore
  }
}
