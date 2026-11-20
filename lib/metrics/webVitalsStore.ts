/**
 * Web Vitals per route (#836 — OBS-03): collects Core Web Vitals reported by
 * `next/web-vitals`'s `useReportWebVitals` (see `components/WebVitalsReporter.tsx`),
 * groups them by route, and tracks p75 — the percentile Google's Core Web
 * Vitals thresholds are measured against.
 *
 * Like `lib/metrics/playbackMetrics.ts`, samples live in memory for the
 * current session only; there is no backend to aggregate across visitors.
 */
import { trackEvent } from '@/lib/analytics';

const MAX_SAMPLES_PER_ROUTE_METRIC = 100;

export type VitalRating = 'good' | 'needs-improvement' | 'poor';

interface VitalSample {
  value: number;
  timestamp: number;
}

/** Google's published Core Web Vitals thresholds, `[good, needs-improvement]`. */
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

export function rateVital(name: string, value: number): VitalRating {
  const thresholds = THRESHOLDS[name];
  if (!thresholds) return 'good';
  const [good, needsImprovement] = thresholds;
  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
}

// route -> metric name -> samples
const byRoute = new Map<string, Map<string, VitalSample[]>>();

export interface ReportedVital {
  name: string;
  value: number;
}

export function recordWebVital(route: string, metric: ReportedVital): void {
  const metrics = byRoute.get(route) ?? new Map<string, VitalSample[]>();
  byRoute.set(route, metrics);
  const samples = metrics.get(metric.name) ?? [];
  metrics.set(metric.name, samples);
  samples.push({ value: metric.value, timestamp: Date.now() });
  if (samples.length > MAX_SAMPLES_PER_ROUTE_METRIC) samples.shift();

  const rating = rateVital(metric.name, metric.value);
  trackEvent('web_vital', { name: metric.name, value: Math.round(metric.value), rating, route });
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export interface RouteVitalSummary {
  p75: number;
  avg: number;
  rating: VitalRating;
  samples: number;
}

export interface RouteVitalsSummary {
  route: string;
  metrics: Record<string, RouteVitalSummary>;
}

export function getWebVitalsSummary(): RouteVitalsSummary[] {
  return [...byRoute.entries()]
    .map(([route, metrics]) => {
      const summary: Record<string, RouteVitalSummary> = {};
      for (const [name, samples] of metrics) {
        const values = samples.map((s) => s.value);
        const p75 = percentile(values, 75);
        summary[name] = {
          p75,
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          rating: rateVital(name, p75),
          samples: values.length,
        };
      }
      return { route, metrics: summary };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}

/** Test-only: clears all in-memory samples. */
export function __resetWebVitalsForTests(): void {
  byRoute.clear();
}
