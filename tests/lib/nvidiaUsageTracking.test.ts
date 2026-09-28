import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_NVIDIA_PRICING,
  FALLBACK_PRICING,
  estimateCost,
  getNvidiaUsageStats,
  recordNvidiaUsage,
  resetNvidiaUsageTracking,
} from '@/lib/nvidiaUsageTracking';

const MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';

describe('nvidiaUsageTracking', () => {
  beforeEach(() => {
    resetNvidiaUsageTracking();
  });

  describe('estimateCost', () => {
    it('computes cost from prompt and completion tokens using the model rate', () => {
      const rates = DEFAULT_NVIDIA_PRICING[MODEL];
      const cost = estimateCost(
        { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
        MODEL
      );
      expect(cost).toBeCloseTo(rates.promptPer1kUsd + rates.completionPer1kUsd * 0.5, 10);
    });

    it('falls back to FALLBACK_PRICING for an unknown model', () => {
      const cost = estimateCost(
        { promptTokens: 1000, completionTokens: 0, totalTokens: 1000 },
        'some/unknown-model'
      );
      expect(cost).toBeCloseTo(FALLBACK_PRICING.promptPer1kUsd, 10);
    });

    it('accepts a custom pricing table', () => {
      const cost = estimateCost(
        { promptTokens: 1000, completionTokens: 1000, totalTokens: 2000 },
        MODEL,
        { [MODEL]: { promptPer1kUsd: 1, completionPer1kUsd: 2 } }
      );
      expect(cost).toBe(3);
    });

    it('returns 0 cost for 0 tokens', () => {
      expect(
        estimateCost({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }, MODEL)
      ).toBe(0);
    });
  });

  describe('recordNvidiaUsage / getNvidiaUsageStats', () => {
    it('aggregates tokens and cost across recorded events', () => {
      recordNvidiaUsage({ model: MODEL, promptTokens: 100, completionTokens: 50, totalTokens: 150 });
      recordNvidiaUsage({ model: MODEL, promptTokens: 200, completionTokens: 100, totalTokens: 300 });

      const stats = getNvidiaUsageStats();
      expect(stats.requests).toBe(2);
      expect(stats.promptTokens).toBe(300);
      expect(stats.completionTokens).toBe(150);
      expect(stats.totalTokens).toBe(450);
      expect(stats.estimatedCostUsd).toBeGreaterThan(0);
      expect(stats.averageCostPerRequestUsd).toBeCloseTo(stats.estimatedCostUsd / 2, 10);
    });

    it('scopes stats to one model when requested', () => {
      recordNvidiaUsage({ model: MODEL, promptTokens: 100, completionTokens: 0, totalTokens: 100 });
      recordNvidiaUsage({ model: 'other-model', promptTokens: 100, completionTokens: 0, totalTokens: 100 });

      expect(getNvidiaUsageStats(MODEL).requests).toBe(1);
      expect(getNvidiaUsageStats('other-model').requests).toBe(1);
      expect(getNvidiaUsageStats().requests).toBe(2);
    });

    it('returns all-zero stats when nothing has been recorded', () => {
      expect(getNvidiaUsageStats()).toEqual({
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        averageCostPerRequestUsd: 0,
      });
    });

    it('tracks a trackId when supplied, without requiring one', () => {
      recordNvidiaUsage({
        trackId: 'track-1',
        model: MODEL,
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
      expect(getNvidiaUsageStats().requests).toBe(1);
    });

    it('evicts the oldest event once the store cap is reached', () => {
      // MAX_EVENTS is 5000; recording 5001 events must not grow the store
      // without bound, and the aggregate request count must reflect the cap.
      for (let i = 0; i < 5001; i++) {
        recordNvidiaUsage({ model: MODEL, promptTokens: 1, completionTokens: 1, totalTokens: 2 });
      }
      expect(getNvidiaUsageStats().requests).toBe(5000);
    });

    it('resetNvidiaUsageTracking clears all recorded events', () => {
      recordNvidiaUsage({ model: MODEL, promptTokens: 1, completionTokens: 1, totalTokens: 2 });
      resetNvidiaUsageTracking();
      expect(getNvidiaUsageStats().requests).toBe(0);
    });
  });
});
