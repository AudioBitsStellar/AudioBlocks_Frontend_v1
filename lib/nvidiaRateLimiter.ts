/**
 * Client-side rate limiting for NVIDIA API calls (#423).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA): a burst of
 * uploads (a batch import, a stem upload fanning out one call per stem) can
 * otherwise hit the NVIDIA API faster than its own limits allow, wasting
 * calls on 429s the caller could have avoided. This is a sliding-window
 * limiter callers check *before* making a request, so `analyzeSongQuality`
 * (`lib/songQualityFilter.ts`) can refuse locally instead of spending an HTTP
 * round trip on a request that would be rejected anyway.
 *
 * Storage-agnostic and in-memory, like `lib/analysisQueueMonitor.ts`: one
 * instance per process/worker. Nothing here talks to the network.
 */

export interface NvidiaRateLimiterOptions {
  /** Maximum requests allowed in any rolling window. */
  maxRequests: number;
  /** Window size in ms the limit applies over. */
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Requests already counted in the current window (post-decision). */
  used: number;
  /** Requests still available in the current window. */
  remaining: number;
  /**
   * Milliseconds until the oldest request in the window ages out and a slot
   * frees up. Present only when `allowed` is false.
   */
  retryAfterMs?: number;
}

/** Raised when a caller has already exceeded the configured limit. */
export class RateLimitExceededError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`NVIDIA API rate limit exceeded; retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitExceededError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Sliding-window request limiter. Call `tryAcquire()` immediately before
 * each NVIDIA API request; only a call that returns `allowed: true` should
 * proceed, and that call already counts toward the window.
 */
export class NvidiaRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private timestamps: number[] = [];

  constructor(options: NvidiaRateLimiterOptions) {
    if (options.maxRequests <= 0) {
      throw new Error('NvidiaRateLimiter: maxRequests must be positive');
    }
    if (options.windowMs <= 0) {
      throw new Error('NvidiaRateLimiter: windowMs must be positive');
    }
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  private evictExpired(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] <= cutoff) {
      this.timestamps.shift();
    }
  }

  /**
   * Attempts to reserve one request slot. Records the request and returns
   * `allowed: true` when under the limit; otherwise leaves state untouched
   * and returns `allowed: false` with `retryAfterMs`.
   */
  tryAcquire(now: number = Date.now()): RateLimitDecision {
    this.evictExpired(now);

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      return {
        allowed: false,
        used: this.timestamps.length,
        remaining: 0,
        retryAfterMs: Math.max(0, oldest + this.windowMs - now),
      };
    }

    this.timestamps.push(now);
    return {
      allowed: true,
      used: this.timestamps.length,
      remaining: this.maxRequests - this.timestamps.length,
    };
  }

  /** Same as `tryAcquire`, but throws `RateLimitExceededError` when denied. */
  acquireOrThrow(now: number = Date.now()): void {
    const decision = this.tryAcquire(now);
    if (!decision.allowed) {
      throw new RateLimitExceededError(decision.retryAfterMs ?? this.windowMs);
    }
  }

  /** Current usage without consuming a slot. */
  peek(now: number = Date.now()): { used: number; remaining: number } {
    this.evictExpired(now);
    return {
      used: this.timestamps.length,
      remaining: Math.max(0, this.maxRequests - this.timestamps.length),
    };
  }

  /** Clears all recorded requests (tests / process restart). */
  reset(): void {
    this.timestamps = [];
  }
}
