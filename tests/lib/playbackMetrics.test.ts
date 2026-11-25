import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from '@/lib/analytics';
import {
  __resetPlaybackMetricsForTests,
  getPlaybackMetricsSummary,
  recordPlaybackAttempt,
  recordPlaybackError,
  recordPlaybackRebuffer,
  recordPlaybackSession,
  recordPlaybackStartup,
} from '@/lib/metrics/playbackMetrics';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

describe('playbackMetrics', () => {
  beforeEach(() => {
    __resetPlaybackMetricsForTests();
    vi.clearAllMocks();
  });

  it('starts with an empty summary', () => {
    const summary = getPlaybackMetricsSummary();
    expect(summary).toEqual({
      totalAttempts: 0,
      totalErrors: 0,
      errorRate: 0,
      avgStartupMs: 0,
      p75StartupMs: 0,
      totalRebufferEvents: 0,
      rebufferRatio: 0,
      recentErrors: [],
    });
  });

  it('computes error rate from attempts and errors', () => {
    recordPlaybackAttempt('track-1');
    recordPlaybackAttempt('track-2');
    recordPlaybackAttempt('track-3');
    recordPlaybackAttempt('track-4');
    recordPlaybackError('track-2', 'This track is unavailable.');

    const summary = getPlaybackMetricsSummary();
    expect(summary.totalAttempts).toBe(4);
    expect(summary.totalErrors).toBe(1);
    expect(summary.errorRate).toBe(0.25);
    expect(trackEvent).toHaveBeenCalledWith('playback_error', {
      trackId: 'track-2',
      message: 'This track is unavailable.',
    });
  });

  it('computes average and p75 startup time', () => {
    [100, 200, 300, 400].forEach((ms) => recordPlaybackStartup('t', ms));

    const summary = getPlaybackMetricsSummary();
    expect(summary.avgStartupMs).toBe(250);
    expect(summary.p75StartupMs).toBe(300);
  });

  it('computes rebuffer ratio from session play/rebuffer time', () => {
    recordPlaybackRebuffer('t1', 500);
    recordPlaybackSession('t1', 9500, 500); // 500ms rebuffered out of 10s watched

    const summary = getPlaybackMetricsSummary();
    expect(summary.totalRebufferEvents).toBe(1);
    expect(summary.rebufferRatio).toBeCloseTo(0.05);
  });

  it('keeps only the 10 most recent errors, newest first', () => {
    for (let i = 0; i < 12; i++) recordPlaybackError('t', `error-${i}`);

    const summary = getPlaybackMetricsSummary();
    expect(summary.recentErrors).toHaveLength(10);
    expect(summary.recentErrors[0].message).toBe('error-11');
  });
});
