import { beforeEach, describe, it, expect } from 'vitest';
import {
  getQualityCheckStats,
  recordQualityCheckResult,
  resetQualityAnalytics,
} from '@/lib/qualityAnalytics';

/** Analytics tracking for quality check pass/fail rates (#439). */

describe('getQualityCheckStats', () => {
  beforeEach(() => {
    resetQualityAnalytics();
  });

  it('returns zeroed stats when nothing is recorded', () => {
    expect(getQualityCheckStats()).toEqual({
      total: 0,
      passed: 0,
      failed: 0,
      timeouts: 0,
      passRate: 0,
      failRate: 0,
      timeoutRate: 0,
      averageScore: null,
    });
  });

  it('computes pass/fail rates excluding timeouts, and timeout rate over total', () => {
    recordQualityCheckResult({ trackId: 'a', outcome: 'passed' });
    recordQualityCheckResult({ trackId: 'b', outcome: 'passed' });
    recordQualityCheckResult({ trackId: 'c', outcome: 'passed' });
    recordQualityCheckResult({ trackId: 'd', outcome: 'failed' });
    recordQualityCheckResult({ trackId: 'e', outcome: 'timeout' });

    const stats = getQualityCheckStats();
    expect(stats.total).toBe(5);
    expect(stats.passRate).toBeCloseTo(0.75);
    expect(stats.failRate).toBeCloseTo(0.25);
    expect(stats.timeoutRate).toBeCloseTo(0.2);
  });

  it('averages only the events that carry a score', () => {
    recordQualityCheckResult({ trackId: 'a', outcome: 'passed', score: 0.9 });
    recordQualityCheckResult({ trackId: 'b', outcome: 'failed', score: 0.5 });
    recordQualityCheckResult({ trackId: 'c', outcome: 'timeout' });

    expect(getQualityCheckStats().averageScore).toBeCloseTo(0.7);
  });

  it('scopes stats to a model version', () => {
    recordQualityCheckResult({ trackId: 'a', outcome: 'passed', modelVersion: 'v1' });
    recordQualityCheckResult({ trackId: 'b', outcome: 'failed', modelVersion: 'v1' });
    recordQualityCheckResult({ trackId: 'c', outcome: 'passed', modelVersion: 'v2' });

    expect(getQualityCheckStats('v1').passRate).toBeCloseTo(0.5);
    expect(getQualityCheckStats('v2').passRate).toBe(1);
    expect(getQualityCheckStats('v3').total).toBe(0);
  });

  it('evicts the oldest events past the cap', () => {
    for (let i = 0; i < 5001; i++) {
      recordQualityCheckResult({ trackId: `t${i}`, outcome: i === 0 ? 'failed' : 'passed' });
    }
    const stats = getQualityCheckStats();
    expect(stats.total).toBe(5000);
    expect(stats.failed).toBe(0); // the lone early failure was evicted
  });
});
