'use client';

import { useSyncExternalStore } from 'react';
import {
  getAnalyticsConsent,
  subscribeToAnalyticsConsent,
  type AnalyticsConsentState,
} from '@/lib/analyticsConsent';

/**
 * Reactive analytics consent for components (#597).
 *
 * Re-renders when the visitor changes their choice, in this tab or another.
 * Reports 'pending' on the server and during hydration.
 */
export function useAnalyticsConsent(): AnalyticsConsentState {
  return useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsent,
    (): AnalyticsConsentState => 'pending'
  );
}

export default useAnalyticsConsent;
