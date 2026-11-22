'use client';

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiOutage } from '@/hooks/useApiOutage';

/** First automatic retry while in outage mode, and the cap for its doubling backoff. */
const AUTO_RETRY_BASE_MS = 5_000;
const AUTO_RETRY_MAX_MS = 60_000;

/**
 * API-outage notice (#816).
 *
 * Shown after the API fails to answer several requests in a row. It does not
 * block the app: the shell, navigation and player keep working, and queries
 * keep the data they already have. While the notice is up, active queries are
 * retried with a doubling backoff, and "Retry now" retries straight away. The
 * notice clears on the first reachable response.
 */
export default function ApiOutageBanner() {
  const { active } = useApiOutage();
  const queryClient = useQueryClient();

  const retryNow = useCallback(() => {
    void queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let delay = AUTO_RETRY_BASE_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = () => {
      timer = setTimeout(() => {
        void queryClient.refetchQueries({ type: 'active' }).finally(() => {
          if (cancelled) return;
          delay = Math.min(delay * 2, AUTO_RETRY_MAX_MS);
          scheduleRetry();
        });
      }, delay);
    };

    scheduleRetry();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, queryClient]);

  if (!active) return null;

  return (
    <div
      aria-live="polite"
      className="relative z-50 flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-black md:text-sm"
      role="status"
    >
      <span>
        AudioBlocks cannot reach its servers right now. Saved content is shown where available,
        and we keep retrying.
      </span>
      <button
        className="rounded-full px-3 py-0.5 font-semibold underline hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        type="button"
        onClick={retryNow}
      >
        Retry now
      </button>
    </div>
  );
}
