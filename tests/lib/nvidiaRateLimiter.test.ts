import { describe, expect, it } from 'vitest';
import { NvidiaRateLimiter, RateLimitExceededError } from '@/lib/nvidiaRateLimiter';

describe('NvidiaRateLimiter', () => {
  it('allows requests up to the configured limit', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 2, windowMs: 1000 });
    expect(limiter.tryAcquire(0)).toMatchObject({ allowed: true, used: 1, remaining: 1 });
    expect(limiter.tryAcquire(10)).toMatchObject({ allowed: true, used: 2, remaining: 0 });
  });

  it('denies a request once the window is full', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.tryAcquire(0);
    const decision = limiter.tryAcquire(100);
    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(decision.retryAfterMs).toBe(900);
  });

  it('does not count a denied request toward the window', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.tryAcquire(0);
    limiter.tryAcquire(100); // denied
    expect(limiter.peek(200)).toEqual({ used: 1, remaining: 0 });
  });

  it('frees a slot once the oldest request ages out of the window', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.tryAcquire(0);
    expect(limiter.tryAcquire(999).allowed).toBe(false);
    expect(limiter.tryAcquire(1000).allowed).toBe(true);
  });

  it('peek reports usage without consuming a slot', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 3, windowMs: 1000 });
    limiter.tryAcquire(0);
    expect(limiter.peek(0)).toEqual({ used: 1, remaining: 2 });
    expect(limiter.peek(0)).toEqual({ used: 1, remaining: 2 });
  });

  it('acquireOrThrow throws RateLimitExceededError with the retry delay once denied', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 1, windowMs: 500 });
    limiter.acquireOrThrow(0);
    expect(() => limiter.acquireOrThrow(100)).toThrow(RateLimitExceededError);
    try {
      limiter.acquireOrThrow(100);
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitExceededError);
      expect((err as RateLimitExceededError).retryAfterMs).toBe(400);
    }
  });

  it('reset clears all recorded requests', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.tryAcquire(0);
    limiter.reset();
    expect(limiter.tryAcquire(1).allowed).toBe(true);
  });

  it('rejects a non-positive maxRequests or windowMs', () => {
    expect(() => new NvidiaRateLimiter({ maxRequests: 0, windowMs: 1000 })).toThrow();
    expect(() => new NvidiaRateLimiter({ maxRequests: 1, windowMs: 0 })).toThrow();
  });

  it('handles a burst of requests spread across a sliding window correctly', () => {
    const limiter = new NvidiaRateLimiter({ maxRequests: 2, windowMs: 100 });
    expect(limiter.tryAcquire(0).allowed).toBe(true);
    expect(limiter.tryAcquire(50).allowed).toBe(true);
    expect(limiter.tryAcquire(60).allowed).toBe(false); // both still in window
    expect(limiter.tryAcquire(101).allowed).toBe(true); // first (t=0) aged out
    expect(limiter.tryAcquire(102).allowed).toBe(false); // t=50 and t=101 both in window
  });
});
