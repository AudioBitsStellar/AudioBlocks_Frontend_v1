import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from '@/lib/analytics';
import {
  __resetWebVitalsForTests,
  getWebVitalsSummary,
  rateVital,
  recordWebVital,
} from '@/lib/metrics/webVitalsStore';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

describe('rateVital', () => {
  it('rates LCP against Core Web Vitals thresholds', () => {
    expect(rateVital('LCP', 1000)).toBe('good');
    expect(rateVital('LCP', 3000)).toBe('needs-improvement');
    expect(rateVital('LCP', 5000)).toBe('poor');
  });

  it('rates CLS on its own (smaller) scale', () => {
    expect(rateVital('CLS', 0.05)).toBe('good');
    expect(rateVital('CLS', 0.2)).toBe('needs-improvement');
    expect(rateVital('CLS', 0.3)).toBe('poor');
  });

  it('defaults unknown metrics to good', () => {
    expect(rateVital('UNKNOWN', 99999)).toBe('good');
  });
});

describe('webVitalsStore', () => {
  beforeEach(() => {
    __resetWebVitalsForTests();
    vi.clearAllMocks();
  });

  it('starts with no routes', () => {
    expect(getWebVitalsSummary()).toEqual([]);
  });

  it('groups samples by route and metric, and tracks p75', () => {
    [1000, 2000, 3000, 4000].forEach((value) =>
      recordWebVital('/dashboard', { name: 'LCP', value })
    );

    const [summary] = getWebVitalsSummary();
    expect(summary.route).toBe('/dashboard');
    expect(summary.metrics.LCP.samples).toBe(4);
    expect(summary.metrics.LCP.p75).toBe(3000);
    expect(summary.metrics.LCP.avg).toBe(2500);
    expect(summary.metrics.LCP.rating).toBe('needs-improvement');
  });

  it('keeps routes separate', () => {
    recordWebVital('/a', { name: 'CLS', value: 0.01 });
    recordWebVital('/b', { name: 'CLS', value: 0.5 });

    const summary = getWebVitalsSummary();
    expect(summary.map((r) => r.route)).toEqual(['/a', '/b']);
    expect(summary[0].metrics.CLS.rating).toBe('good');
    expect(summary[1].metrics.CLS.rating).toBe('poor');
  });

  it('forwards every sample to analytics', () => {
    recordWebVital('/', { name: 'TTFB', value: 500 });

    expect(trackEvent).toHaveBeenCalledWith('web_vital', {
      name: 'TTFB',
      value: 500,
      rating: 'good',
      route: '/',
    });
  });
});
