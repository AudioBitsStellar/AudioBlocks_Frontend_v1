'use client';

import Link from 'next/link';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { setAnalyticsConsent } from '@/lib/analyticsConsent';

/**
 * First-visit analytics consent banner (#597).
 *
 * Non-blocking: it is a region pinned to the corner, not a modal, so the
 * player and page stay usable and no focus is stolen on load. It only renders
 * once the visitor has no current choice, so it disappears after accept or
 * reject. Changing the choice later happens in Settings → Privacy & data.
 */
export default function AnalyticsConsentBanner() {
  const consent = useAnalyticsConsent();

  if (consent !== 'unset') return null;

  return (
    <section
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-xl rounded-xl border border-border-dark bg-surface p-4 text-foreground shadow-2xl md:bottom-6 md:inset-x-auto md:right-6"
    >
      <h2 id="analytics-consent-title" className="text-sm font-semibold text-white">
        Help us improve AudioBlocks
      </h2>
      <p className="mt-1 text-xs text-on-muted">
        We&apos;d like to use analytics cookies to understand how the app is used. Nothing is
        tracked until you accept.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="rounded-full bg-[#D2045B] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#b0034c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
          type="button"
          onClick={() => setAnalyticsConsent('accepted')}
        >
          Accept analytics
        </button>
        <button
          className="rounded-full border border-border-dark px-4 py-1.5 text-xs font-medium text-on-muted transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
          type="button"
          onClick={() => setAnalyticsConsent('rejected')}
        >
          Reject
        </button>
        <Link
          className="ml-auto text-xs text-on-muted underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
          href="/dashboard/settings#privacy-data"
        >
          Privacy settings
        </Link>
      </div>
    </section>
  );
}
