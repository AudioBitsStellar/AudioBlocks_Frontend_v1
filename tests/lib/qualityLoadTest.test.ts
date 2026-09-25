import { describe, expect, it } from 'vitest';
import { percentile, runQualityLoadTest } from '@/lib/qualityLoadTest';

const okResponse = () => ({ ok: true, status: 200 }) as Response;
const serverErrorResponse = () => ({ ok: false, status: 500 }) as Response;

describe('qualityLoadTest', () => {
  describe('percentile', () => {
    it('returns 0 for an empty sample', () => {
      expect(percentile([], 95)).toBe(0);
    });

    it('picks the nearest-rank value from an unsorted sample', () => {
      expect(percentile([20, 5, 15, 10], 50)).toBe(10);
      expect(percentile([20, 5, 15, 10], 95)).toBe(20);
    });

    it('returns the only value for a single-sample distribution', () => {
      expect(percentile([7], 99)).toBe(7);
    });
  });

  describe('runQualityLoadTest', () => {
    it('reports latency percentiles for successful requests', async () => {
      const clock = { value: 0 };
      const result = await runQualityLoadTest({
        endpoint: 'http://localhost:4000/quality/analysis',
        totalRequests: 4,
        concurrency: 2,
        fetchFn: async () => {
          clock.value += 5;
          return okResponse();
        },
        now: () => clock.value,
      });

      expect(result.totalRequests).toBe(4);
      expect(result.succeeded).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.successRate).toBe(1);
      expect(result.latencyMs).toEqual({ p50: 5, p95: 5, p99: 5 });
      expect(result.maxConcurrencyObserved).toBe(2);
      expect(result.durationMs).toBe(20);
      expect(result.passed).toBe(true);
      expect(result.failureExamples).toEqual([]);
    });

    it('never exceeds the configured concurrency', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      const result = await runQualityLoadTest({
        endpoint: 'http://localhost:4000/quality/analysis',
        totalRequests: 10,
        concurrency: 5,
        fetchFn: async () => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          return okResponse();
        },
        now: () => 0,
      });

      expect(result.succeeded).toBe(10);
      expect(maxInFlight).toBe(5);
      expect(result.maxConcurrencyObserved).toBe(5);
    });

    it('counts failed responses and records failure examples', async () => {
      const result = await runQualityLoadTest({
        endpoint: 'http://localhost:4000/quality/analysis',
        totalRequests: 3,
        concurrency: 3,
        fetchFn: async () => serverErrorResponse(),
        now: () => 0,
      });

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.successRate).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.failureExamples[0]).toContain('HTTP 500');
    });

    it('times out requests that never respond', async () => {
      const result = await runQualityLoadTest({
        endpoint: 'http://localhost:4000/quality/analysis',
        totalRequests: 1,
        concurrency: 1,
        timeoutMs: 10,
        fetchFn: () => new Promise<Response>(() => undefined),
        now: () => 0,
      });

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.passed).toBe(false);
      expect(result.failureExamples[0]).toContain('timed out');
    });

    it('fails the verdict when p95 exceeds the threshold', async () => {
      const clock = { value: 0 };
      const result = await runQualityLoadTest({
        endpoint: 'http://localhost:4000/quality/analysis',
        totalRequests: 2,
        concurrency: 2,
        maxP95Ms: 10,
        fetchFn: async () => {
          clock.value += 20;
          return okResponse();
        },
        now: () => clock.value,
      });

      expect(result.latencyMs.p95).toBe(40);
      expect(result.passed).toBe(false);
    });

    it('rejects invalid options', async () => {
      await expect(
        runQualityLoadTest({ endpoint: 'http://localhost', totalRequests: 0, concurrency: 1 })
      ).rejects.toThrow('totalRequests must be at least 1');
      await expect(
        runQualityLoadTest({ endpoint: 'http://localhost', totalRequests: 1, concurrency: 0 })
      ).rejects.toThrow('concurrency must be at least 1');
    });
  });
});
