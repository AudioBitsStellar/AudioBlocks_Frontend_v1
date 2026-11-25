/**
 * Playback quality metrics (#835 — OBS-02): startup time, rebuffer ratio and
 * error rate.
 *
 * Every sample is forwarded through `trackEvent` (see `lib/analytics.ts`) so
 * it reaches whatever analytics destination is configured, and is also kept
 * in a small in-memory ring buffer for the local dashboard at
 * `/internal/metrics/playback`. The buffer is per-session (cleared on a full
 * page reload) — there is no backend to aggregate samples across users, so
 * the dashboard reflects only the current browser session.
 */
import { trackEvent } from '@/lib/analytics';

const MAX_SAMPLES = 200;

interface StartupSample {
  trackId: string;
  ms: number;
  timestamp: number;
}

interface RebufferSample {
  trackId: string;
  bufferedMs: number;
  timestamp: number;
}

interface ErrorSample {
  trackId: string;
  message: string;
  timestamp: number;
}

interface SessionSample {
  trackId: string;
  playedMs: number;
  rebufferedMs: number;
  timestamp: number;
}

const state = {
  startups: [] as StartupSample[],
  rebuffers: [] as RebufferSample[],
  errors: [] as ErrorSample[],
  sessions: [] as SessionSample[],
  attempts: 0,
};

function push<T>(list: T[], sample: T): void {
  list.push(sample);
  if (list.length > MAX_SAMPLES) list.shift();
}

/** Call once per track load, before the first `playing` event is awaited. */
export function recordPlaybackAttempt(trackId: string): void {
  state.attempts += 1;
  trackEvent('playback_attempt', { trackId });
}

/** Time-to-first-frame for a freshly loaded track. */
export function recordPlaybackStartup(trackId: string, ms: number): void {
  push(state.startups, { trackId, ms, timestamp: Date.now() });
  trackEvent('playback_startup_time', { trackId, ms: Math.round(ms) });
}

/** A mid-playback stall (native `waiting` → `playing`), not the initial load. */
export function recordPlaybackRebuffer(trackId: string, bufferedMs: number): void {
  push(state.rebuffers, { trackId, bufferedMs, timestamp: Date.now() });
  trackEvent('playback_rebuffer', { trackId, bufferedMs: Math.round(bufferedMs) });
}

export function recordPlaybackError(trackId: string, message: string): void {
  push(state.errors, { trackId, message, timestamp: Date.now() });
  trackEvent('playback_error', { trackId, message });
}

/**
 * Finalizes a track's watch session: the wall-clock time from its first
 * `playing` event to when it was torn down (track change, pause-to-end, or
 * teardown), and how much of that was spent rebuffering. Used to compute the
 * rebuffer ratio.
 */
export function recordPlaybackSession(
  trackId: string,
  playedMs: number,
  rebufferedMs: number
): void {
  push(state.sessions, { trackId, playedMs, rebufferedMs, timestamp: Date.now() });
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export interface PlaybackMetricsSummary {
  totalAttempts: number;
  totalErrors: number;
  errorRate: number;
  avgStartupMs: number;
  p75StartupMs: number;
  totalRebufferEvents: number;
  rebufferRatio: number;
  recentErrors: ErrorSample[];
}

export function getPlaybackMetricsSummary(): PlaybackMetricsSummary {
  const startupValues = state.startups.map((s) => s.ms);
  const totalPlayedMs = state.sessions.reduce((sum, s) => sum + s.playedMs, 0);
  const totalRebufferedMs = state.sessions.reduce((sum, s) => sum + s.rebufferedMs, 0);
  const watchedMs = totalPlayedMs + totalRebufferedMs;

  return {
    totalAttempts: state.attempts,
    totalErrors: state.errors.length,
    errorRate: state.attempts > 0 ? state.errors.length / state.attempts : 0,
    avgStartupMs: startupValues.length
      ? startupValues.reduce((sum, v) => sum + v, 0) / startupValues.length
      : 0,
    p75StartupMs: percentile(startupValues, 75),
    totalRebufferEvents: state.rebuffers.length,
    rebufferRatio: watchedMs > 0 ? totalRebufferedMs / watchedMs : 0,
    recentErrors: state.errors.slice(-10).reverse(),
  };
}

/** Test-only: clears all in-memory samples. */
export function __resetPlaybackMetricsForTests(): void {
  state.startups = [];
  state.rebuffers = [];
  state.errors = [];
  state.sessions = [];
  state.attempts = 0;
}
