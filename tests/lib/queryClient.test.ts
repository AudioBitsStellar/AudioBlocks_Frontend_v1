import { describe, it, expect } from 'vitest';
import { createQueryClient } from '@/lib/queryClient';
import { ApiShapeError } from '@/lib/api/unwrap';

describe('createQueryClient', () => {
  it('uses a 30s staleTime and 5m gcTime by default', () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions().queries;

    expect(defaults?.staleTime).toBe(30_000);
    expect(defaults?.gcTime).toBe(5 * 60 * 1000);
  });

  it('retries failed queries 3 times, but never an ApiShapeError (#564)', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry as (n: number, e: Error) => boolean;
    expect(retry(0, new Error('x'))).toBe(true);
    expect(retry(2, new Error('x'))).toBe(true);
    expect(retry(3, new Error('x'))).toBe(false);
    expect(retry(0, new ApiShapeError('bad', { data: [] }))).toBe(false);
  });

  it('throws only ApiShapeError to error boundaries (#564)', () => {
    const throwOnError = createQueryClient().getDefaultOptions().queries?.throwOnError as (
      e: Error
    ) => boolean;
    expect(throwOnError(new ApiShapeError('bad', { data: [] }))).toBe(true);
    expect(throwOnError(new Error('network'))).toBe(false);
  });

  it('uses exponential backoff for retryDelay', () => {
    const client = createQueryClient();
    const retryDelay = client.getDefaultOptions().queries?.retryDelay;

    expect(typeof retryDelay).toBe('function');
    if (typeof retryDelay === 'function') {
      expect(retryDelay(0, new Error('x'))).toBe(1000);
      expect(retryDelay(1, new Error('x'))).toBe(2000);
      expect(retryDelay(2, new Error('x'))).toBe(4000);
      expect(retryDelay(10, new Error('x'))).toBe(30_000);
    }
  });

  it('does not retry mutations by default', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(0);
  });
});
