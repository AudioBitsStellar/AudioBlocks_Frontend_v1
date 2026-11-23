'use client';

import { useEffect, useState } from 'react';
import { getMaintenanceBannerMessage } from '@/lib/maintenance';

const DISMISSED_KEY = 'ab_maintenance_banner_dismissed';

/**
 * Planned-maintenance banner (#858).
 *
 * Non-blocking: announces an upcoming or in-progress maintenance window set
 * via `NEXT_PUBLIC_MAINTENANCE_BANNER_MESSAGE` without locking the app down
 * the way `MAINTENANCE_MODE` (see `middleware.ts`) does. Dismissing it is
 * remembered per browser (sessionStorage) and keyed to the message itself, so
 * a new message reappears even if an old one was dismissed.
 */
export default function MaintenanceBanner() {
  const message = getMaintenanceBannerMessage();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!message) return;
    try {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY) === message);
    } catch {
      setDismissed(false);
    }
  }, [message]);

  if (!message || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, message);
    } catch {
      // sessionStorage can throw in private browsing; dismissal just won't persist.
    }
  };

  return (
    <div
      className="relative z-50 flex items-center justify-center gap-4 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-black md:text-sm"
      role="status"
    >
      <span>{message}</span>
      <button
        aria-label="Dismiss maintenance notice"
        className="shrink-0 rounded-full px-2 py-0.5 font-semibold hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        type="button"
        onClick={handleDismiss}
      >
        &times;
      </button>
    </div>
  );
}
