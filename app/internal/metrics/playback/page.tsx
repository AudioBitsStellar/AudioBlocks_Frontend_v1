'use client';

import { useEffect, useState } from 'react';
import {
  getPlaybackMetricsSummary,
  type PlaybackMetricsSummary,
} from '@/lib/metrics/playbackMetrics';

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border-dark bg-surface p-4">
      <p className="text-xs text-on-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-white mt-1">{value}</p>
      {hint && <p className="text-xs text-on-muted mt-1">{hint}</p>}
    </div>
  );
}

const REFRESH_INTERVAL_MS = 2000;

export default function PlaybackMetricsPage() {
  const [summary, setSummary] = useState<PlaybackMetricsSummary | null>(null);

  useEffect(() => {
    const update = () => setSummary(getPlaybackMetricsSummary());
    update();
    const interval = setInterval(update, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!summary) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Plays started" value={String(summary.totalAttempts)} />
        <StatCard
          hint={`${summary.totalErrors} errors`}
          label="Error rate"
          value={`${(summary.errorRate * 100).toFixed(1)}%`}
        />
        <StatCard
          hint={`avg ${Math.round(summary.avgStartupMs)} ms`}
          label="p75 startup time"
          value={`${Math.round(summary.p75StartupMs)} ms`}
        />
        <StatCard
          hint={`${summary.totalRebufferEvents} stalls`}
          label="Rebuffer ratio"
          value={`${(summary.rebufferRatio * 100).toFixed(1)}%`}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white mb-2">Recent playback errors</h2>
        {summary.recentErrors.length === 0 ? (
          <p className="text-sm text-on-muted">No playback errors recorded this session.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-on-muted border-b border-border-dark">
                <th className="py-2 pr-4">Track</th>
                <th className="py-2 pr-4">Message</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentErrors.map((err, index) => (
                <tr key={`${err.timestamp}-${index}`} className="border-b border-border-dark/50">
                  <td className="py-2 pr-4 font-mono text-xs text-on-muted">{err.trackId}</td>
                  <td className="py-2 pr-4 text-white">{err.message}</td>
                  <td className="py-2 text-on-muted">
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
