/**
 * Analytics consent state (#597).
 *
 * Non-essential tracking must not load before the visitor opts in. The choice
 * lives in localStorage as a versioned record: bumping
 * `ANALYTICS_CONSENT_VERSION` invalidates older choices and re-prompts everyone.
 *
 * Resolution order:
 *  1. A stored record for the current version wins ('accepted' | 'rejected').
 *  2. Otherwise, `navigator.globalPrivacyControl` defaults to 'rejected'.
 *  3. Otherwise the visitor has not decided yet ('unset') and sees the banner.
 *
 * The server never sees the choice, so no cookie is written. The client-only
 * 'pending' state is what `getServerSnapshot` returns during hydration, so the
 * banner never flashes for visitors who already decided.
 */

export const ANALYTICS_CONSENT_VERSION = 1;

const STORAGE_KEY = 'audioblocks_analytics_consent';
const CHANGE_EVENT = 'audioblocks:analytics-consent-change';

export type AnalyticsConsentStatus = 'accepted' | 'rejected';

/** What `useAnalyticsConsent` reports. 'pending' only exists during SSR and hydration. */
export type AnalyticsConsentState = AnalyticsConsentStatus | 'unset' | 'pending';

export interface AnalyticsConsentRecord {
  version: number;
  status: AnalyticsConsentStatus;
  updatedAt: string;
}

/**
 * Holds the choice when localStorage is unavailable (private mode, blocked
 * storage), so an accept still applies for the current page session.
 */
let memoryRecord: AnalyticsConsentRecord | null = null;

/** True when the browser sends Global Privacy Control (GPC). */
export function isGlobalPrivacyControlEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true;
}

/** The stored choice for the current consent version, or null when there is none. */
export function getAnalyticsConsentRecord(): AnalyticsConsentRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AnalyticsConsentRecord>;
      const isCurrent =
        parsed.version === ANALYTICS_CONSENT_VERSION &&
        (parsed.status === 'accepted' || parsed.status === 'rejected');
      if (isCurrent) return parsed as AnalyticsConsentRecord;
    }
  } catch {
    // Corrupt JSON or blocked storage: fall through to the in-memory choice.
  }

  return memoryRecord?.version === ANALYTICS_CONSENT_VERSION ? memoryRecord : null;
}

/** Resolves the visitor's current analytics consent. */
export function getAnalyticsConsent(): AnalyticsConsentStatus | 'unset' {
  const record = getAnalyticsConsentRecord();
  if (record) return record.status;
  if (isGlobalPrivacyControlEnabled()) return 'rejected';
  return 'unset';
}

/** True only when analytics are explicitly accepted. Unset and GPC both mean no tracking. */
export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'accepted';
}

/**
 * Stores the visitor's choice and notifies subscribers. Rejecting also asks an
 * already-loaded Segment snippet to drop its identity, so tracking stops
 * immediately rather than on the next visit.
 */
export function setAnalyticsConsent(status: AnalyticsConsentStatus): void {
  if (typeof window === 'undefined') return;

  const record: AnalyticsConsentRecord = {
    version: ANALYTICS_CONSENT_VERSION,
    status,
    updatedAt: new Date().toISOString(),
  };
  memoryRecord = record;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Best-effort persistence; the in-memory record still applies this session.
  }

  if (status === 'rejected') {
    const w = window as Window & { analytics?: { reset?: () => void } };
    w.analytics?.reset?.();
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribes to consent changes made in this tab or in other tabs. Returns an unsubscribe fn. */
export function subscribeToAnalyticsConsent(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Test helper: forgets the in-memory choice. Storage is cleared separately. */
export function resetAnalyticsConsentMemory(): void {
  memoryRecord = null;
}
