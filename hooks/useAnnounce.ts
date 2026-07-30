'use client';

import { useCallback } from 'react';

export type AnnouncementPriority = 'polite' | 'assertive';

export const ANNOUNCEMENT_EVENT = 'audioblocks:announcement';

export interface AnnouncementDetail {
  message: string;
  priority: AnnouncementPriority;
}

/**
 * Announces dynamic content changes through the application's live regions.
 * The hook is safe to call during server rendering; announcements are only
 * dispatched in a browser environment.
 */
export function useAnnounce() {
  return useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    if (typeof window === 'undefined' || !message.trim()) return;

    window.dispatchEvent(
      new CustomEvent<AnnouncementDetail>(ANNOUNCEMENT_EVENT, {
        detail: { message, priority },
      }),
    );
  }, []);
}
