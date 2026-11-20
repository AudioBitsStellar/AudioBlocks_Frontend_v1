'use client';

import { useEffect, useState } from 'react';
import { getWebVitalsSummary, type RouteVitalsSummary } from '@/lib/metrics/webVitalsStore';
import { cn } from '@/lib/utils';

const METRIC_ORDER = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];

const RATING_CLASSES: Record<string, string> = {
  good: 'text-green-400',
  'needs-improvement': 'text-yellow-400',
  poor: 'text-red-400',
};

function formatValue(name: string, value: number): string {
  return name === 'CLS' ? value.toFixed(3) : `${Math.round(value)} ms`;
}

const REFRESH_INTERVAL_MS = 2000;

export default function WebVitalsMetricsPage() {
  const [routes, setRoutes] = useState<RouteVitalsSummary[]>([]);

  useEffect(() => {
    const update = () => setRoutes(getWebVitalsSummary());
    update();
    const interval = setInterval(update, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (routes.length === 0) {
    return (
      <p className="text-sm text-on-muted">
        No Web Vitals reported yet. Navigate around the app, then come back to this page.
      </p>
    );
  }

  return (
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="text-on-muted border-b border-border-dark">
          <th className="py-2 pr-4">Route</th>
          {METRIC_ORDER.map((name) => (
            <th key={name} className="py-2 pr-4">
              {name} (p75)
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {routes.map(({ route, metrics }) => (
          <tr key={route} className="border-b border-border-dark/50">
            <td className="py-2 pr-4 font-mono text-xs text-white">{route}</td>
            {METRIC_ORDER.map((name) => {
              const metric = metrics[name];
              return (
                <td key={name} className="py-2 pr-4">
                  {metric ? (
                    <span className={cn(RATING_CLASSES[metric.rating])}>
                      {formatValue(name, metric.p75)}
                    </span>
                  ) : (
                    <span className="text-on-muted">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
