/**
 * First-play funnel flag (#839).
 *
 * Mirrors the `audioblocks_onboarding_complete` flag in `lib/onboarding.ts`:
 * a per-browser localStorage flag so the `first_play` analytics event fires
 * exactly once per browser, the first time any track audibly starts
 * playing, rather than on every subsequent play.
 */

const FIRST_PLAY_STORAGE_KEY = 'audioblocks_first_play_complete';

/** True when this browser has already recorded a first play (or state is unknown/SSR). */
export function hasRecordedFirstPlay(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(FIRST_PLAY_STORAGE_KEY) === 'true';
  } catch {
    // Storage can throw in private-mode Safari or when disabled; never block
    // playback on a UX/analytics flag.
    return true;
  }
}

/** Persist that a first play has been recorded in this browser. */
export function markFirstPlayRecorded(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRST_PLAY_STORAGE_KEY, 'true');
  } catch {
    // ignore — best-effort analytics flag
  }
}

/** Clear the flag (used by tests). */
export function resetFirstPlay(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(FIRST_PLAY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
