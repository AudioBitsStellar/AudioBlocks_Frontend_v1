import { describe, expect, it } from 'vitest';
import { scrubSensitiveData } from '@/lib/sentryScrub';
import type { Event } from '@sentry/nextjs';

describe('scrubSensitiveData', () => {
  it('redacts auth-looking headers', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer secret',
          Cookie: 'session=abc',
          'X-Token': 'xyz',
          'X-Request-Id': 'keep-me',
        },
      },
    } as Event;

    const result = scrubSensitiveData(event);

    expect(result?.request?.headers).toEqual({
      Authorization: '[REDACTED]',
      Cookie: '[REDACTED]',
      'X-Token': '[REDACTED]',
      'X-Request-Id': 'keep-me',
    });
  });

  it('redacts EVM-looking extra values', () => {
    const event = {
      extra: { walletAddress: '0xabc123', note: 'hello' },
    } as unknown as Event;

    const result = scrubSensitiveData(event);

    expect(result?.extra).toEqual({ walletAddress: '[REDACTED]', note: 'hello' });
  });

  it('redacts Stellar-looking extra values', () => {
    const event = {
      extra: { stellarAccount: 'GABCDEF1234567890' },
    } as unknown as Event;

    const result = scrubSensitiveData(event);

    expect(result?.extra).toEqual({ stellarAccount: '[REDACTED]' });
  });

  it('redacts extra keys named like a signature or wallet even without a matching value shape', () => {
    const event = {
      extra: { signature: 'abc==', walletId: 'internal-123' },
    } as unknown as Event;

    const result = scrubSensitiveData(event);

    expect(result?.extra).toEqual({ signature: '[REDACTED]', walletId: '[REDACTED]' });
  });

  it('leaves non-sensitive extras untouched', () => {
    const event = { extra: { count: 3, label: 'hi' } } as unknown as Event;

    const result = scrubSensitiveData(event);

    expect(result?.extra).toEqual({ count: 3, label: 'hi' });
  });

  it('is a no-op when request/extra are absent', () => {
    const event = { message: 'boom' } as Event;

    expect(scrubSensitiveData(event)).toBe(event);
  });
});
