/**
 * Load harness for concurrent quality analysis requests.
 *
 * Part of the AI Song Quality Filter initiative: batches of analysis requests
 * are fired at the quality endpoint with a hard concurrency cap, per-request
 * timeouts, and latency percentiles, so a burst of uploads can be validated
 * against explicit pass/fail thresholds. `fetch` and the clock are injectable
 * to keep the harness deterministic under test.
 */

export interface QualityLoadTestOptions {
  /** Endpoint that receives the analysis requests. */
  endpoint: string;
  /** Total number of requests to fire. */
  totalRequests: number;
  /** Maximum simultaneous in-flight requests. */
  concurrency: number;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
  /** Verdict threshold for p95 latency in milliseconds. */
  maxP95Ms?: number;
  /** Minimum acceptable success rate, from 0 to 1. */
  minSuccessRate?: number;
  /** Injectable fetch — defaults to the global fetch. */
  fetchFn?: typeof fetch;
  /** Injectable clock — defaults to Date.now. */
  now?: () => number;
}

export interface QualityLoadTestSummary {
  totalRequests: number;
  succeeded: number;
  failed: number;
  successRate: number;
  latencyMs: { p50: number; p95: number; p99: number };
  maxConcurrencyObserved: number;
  durationMs: number;
  passed: boolean;
  failureExamples: string[];
}

const MAX_FAILURE_EXAMPLES = 5;

/**
 * Returns the nearest-rank percentile of a sample. Latency samples are sorted
 * internally so callers can pass values in arrival order.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1];
}

/**
 * Fires `totalRequests` requests at `endpoint`, never exceeding `concurrency`
 * simultaneous in-flight requests, and returns a summary with latency
 * percentiles and whether the configured thresholds passed.
 */
export async function runQualityLoadTest(
  options: QualityLoadTestOptions
): Promise<QualityLoadTestSummary> {
  const { endpoint, totalRequests, concurrency } = options;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxP95Ms = options.maxP95Ms ?? 5_000;
  const minSuccessRate = options.minSuccessRate ?? 1;

  if (!Number.isFinite(totalRequests) || totalRequests < 1) {
    throw new Error('totalRequests must be at least 1');
  }
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw new Error('concurrency must be at least 1');
  }

  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? (() => Date.now());

  const latencies: number[] = [];
  const failureExamples: string[] = [];
  let succeeded = 0;
  let failed = 0;
  let inFlight = 0;
  let maxInFlight = 0;

  const recordFailure = (message: string) => {
    if (failureExamples.length < MAX_FAILURE_EXAMPLES) failureExamples.push(message);
  };

  const runOne = async (): Promise<void> => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);

    const controller = new AbortController();
    const requestStartedAt = now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const response = await Promise.race([
        fetchFn(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error(`request timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);

      if (response.ok) {
        succeeded += 1;
      } else {
        failed += 1;
        recordFailure(`HTTP ${response.status}`);
      }
    } catch (error: unknown) {
      failed += 1;
      recordFailure(error instanceof Error ? error.message : 'request failed');
    } finally {
      if (timer) clearTimeout(timer);
      inFlight -= 1;
      latencies.push(now() - requestStartedAt);
    }
  };

  const startedAt = now();
  for (let start = 0; start < totalRequests; start += concurrency) {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, totalRequests - start) }, () => runOne())
    );
  }

  const successRate = succeeded / totalRequests;
  const p95 = percentile(latencies, 95);
  const passed = successRate >= minSuccessRate && p95 <= maxP95Ms;

  return {
    totalRequests,
    succeeded,
    failed,
    successRate,
    latencyMs: { p50: percentile(latencies, 50), p95, p99: percentile(latencies, 99) },
    maxConcurrencyObserved: maxInFlight,
    durationMs: now() - startedAt,
    passed,
    failureExamples,
  };
}
