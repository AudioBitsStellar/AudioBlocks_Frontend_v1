import { describe, it, expect } from 'vitest';
import { formatCountdown, getTokenExpiry } from '@/lib/session';

const encode = (payload: object) =>
  btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('getTokenExpiry', () => {
  it('returns exp in milliseconds', () => {
    expect(getTokenExpiry(`h.${encode({ exp: 1_700_000_000 })}.s`)).toBe(1_700_000_000_000);
  });

  it('handles base64url payloads that need padding', () => {
    const token = `h.${encode({ exp: 1_700_000_000, sub: 'user?>~' })}.s`;
    expect(getTokenExpiry(token)).toBe(1_700_000_000_000);
  });

  it.each([undefined, null, '', 'not-a-jwt', 'h.%%%.s', `h.${encode({ sub: 'x' })}.s`])(
    'returns null for %s',
    (token) => {
      expect(getTokenExpiry(token)).toBeNull();
    }
  );
});

describe('formatCountdown', () => {
  it.each([
    [120_000, '2:00'],
    [65_000, '1:05'],
    [900, '0:01'],
    [0, '0:00'],
    [-5_000, '0:00'],
  ])('formats %d ms as %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
