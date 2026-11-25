/**
 * #106: `lib/errors.ts` - typed API error hierarchy. These tests pin the
 * shape consumer hooks catch on so a rename or status mix-up is caught at
 * build time.
 */

import { describe, expect, it } from 'vitest';
import {
  ApiError,
  AuthError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServerError,
  errorFromResponse,
  parseRetryAfter,
} from '@/lib/errors';

describe('error hierarchy (#106)', () => {
  it('each error type carries the documented status and retryable flag', () => {
    expect(new NetworkError().status).toBe(0);
    expect(new NetworkError().retryable).toBe(true);
    expect(new AuthError().status).toBe(401);
    expect(new AuthError().retryable).toBe(false);
    expect(new AuthError().shouldRedirect).toBe(true);
    expect(new NotFoundError().status).toBe(404);
    expect(new NotFoundError().retryable).toBe(false);
    expect(new RateLimitError().status).toBe(429);
    expect(new RateLimitError().retryable).toBe(true);
    const server = new ServerError('boom', 503);
    expect([server.status, server.retryable]).toEqual([503, true]);
    const api = new ApiError('x', 418);
    // 4xx that is not covered above → not retryable.
    expect([api.status, api.retryable]).toEqual([418, false]);
  });

  it('NetworkError.offline reflects navigator.onLine at construction', () => {
    expect(new NetworkError('x', undefined, true).offline).toBe(true);
    expect(new NetworkError('x', undefined, false).offline).toBe(false);
  });

  it('error names are the class names for runtime discrimination', () => {
    expect(new AuthError().name).toBe('AuthError');
    expect(new RateLimitError().name).toBe('RateLimitError');
  });
});

describe('parseRetryAfter (#106)', () => {
  it('parses integer seconds into milliseconds', () => {
    expect(parseRetryAfter('30')).toBe(30_000);
    expect(parseRetryAfter('0')).toBe(0);
  });

  it('parses HTTP-dates relative to `now` and clamps past values to 0', () => {
    const now = new Date('2026-11-24T12:00:00Z');
    expect(parseRetryAfter('Tue, 24 Nov 2026 12:00:30 GMT', now)).toBe(30_000);
    expect(parseRetryAfter('Tue, 24 Nov 2026 11:59:00 GMT', now)).toBe(0);
  });

  it('returns null for unparseable or absent headers', () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('')).toBeNull();
    expect(parseRetryAfter('not-a-date-or-number')).toBeNull();
  });
});

describe('errorFromResponse (#106)', () => {
  const mkResp = (status: number, headers: Record<string, string> = {}): Response =>
    new Response(null, { status, headers });

  it('builds AuthError for 401, NotFoundError for 404', () => {
    expect(errorFromResponse(mkResp(401))).toBeInstanceOf(AuthError);
    expect(errorFromResponse(mkResp(404))).toBeInstanceOf(NotFoundError);
  });

  it('builds RateLimitError for 429 with parsed Retry-After', () => {
    const err = errorFromResponse(mkResp(429, { 'Retry-After': '15' }));
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBe(15_000);
  });

  it('builds ServerError for 5xx, ApiError for anything else', () => {
    expect(errorFromResponse(mkResp(503))).toBeInstanceOf(ServerError);
    expect(errorFromResponse(mkResp(418))).toBeInstanceOf(ApiError);
  });
});
