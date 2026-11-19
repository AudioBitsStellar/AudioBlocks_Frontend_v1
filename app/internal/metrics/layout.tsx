import Link from 'next/link';
import { parseFlagValue } from '@/lib/featureFlags';
import type { Metadata } from 'next';

/**
 * Internal metrics dashboards (#835 — OBS-02, #836 — OBS-03).
 *
 * These pages read in-memory, per-session samples only — there is no backend
 * to aggregate playback/vitals metrics across visitors, so this is a local
 * verification view, not a production BI dashboard. The real, durable output
 * of both features is the events sent through `trackEvent` (see
 * `lib/analytics.ts`), which reach whatever analytics destination is
 * configured (Segment/GA).
 *
 * Gated behind `NEXT_PUBLIC_ENABLE_DEVTOOLS` (already used for other local
 * dev affordances) so it isn't reachable by default in production.
 */
export const metadata: Metadata = {
  title: 'Internal metrics',
  robots: { index: false, follow: false },
};

export default function InternalMetricsLayout({ children }: { children: React.ReactNode }) {
  const enabled = parseFlagValue(process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS, false);

  if (!enabled) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-white mb-2">Internal metrics disabled</h1>
        <p className="text-sm text-on-muted">
          Set <code className="font-mono">NEXT_PUBLIC_ENABLE_DEVTOOLS=true</code> locally to view
          the playback-quality and Web Vitals dashboards.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-white mb-1">Internal metrics</h1>
      <p className="text-sm text-on-muted mb-6">
        Current browser session only. Not persisted or shared across visitors.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-border-dark pb-4 text-sm">
        <Link className="text-on-muted hover:text-white transition-colors" href="/internal/metrics/playback">
          Playback quality
        </Link>
        <Link
          className="text-on-muted hover:text-white transition-colors"
          href="/internal/metrics/web-vitals"
        >
          Web Vitals
        </Link>
      </nav>
      {children}
    </div>
  );
}
