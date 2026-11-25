'use client';

import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { recordWebVital } from '@/lib/metrics/webVitalsStore';

/**
 * Reports Core Web Vitals per route (#836 — OBS-03). Renders nothing; mounted
 * once in the root layout alongside `AnalyticsScript`.
 */
export default function WebVitalsReporter() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    recordWebVital(pathname || '/', { name: metric.name, value: metric.value });
  });

  return null;
}
