import { describe, it, expect } from 'vitest';
import { createQueryClient } from '@/lib/queryClient';

describe('createQueryClient', () => {
  it('uses a 30s staleTime and 5m gcTime by default', () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions().queries;

    expect(defaults?.staleTime).toBe(30_000);
    expect(defaults?.gcTime).toBe(5 * 60 * 1000);
  });

  it('retries failed queries 3 times', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.retry).toBe(3);
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
