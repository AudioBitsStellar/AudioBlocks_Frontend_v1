import { describe, it, expect } from 'vitest';
import { formatDuration, formatCount, cn } from '@/lib/utils';

describe('formatDuration', () => {
  it('returns --:-- for non-finite values (NaN, Infinity, -Infinity)', () => {
    expect(formatDuration(NaN)).toBe('--:--');
    expect(formatDuration(Infinity)).toBe('--:--');
    expect(formatDuration(-Infinity)).toBe('--:--');
  });

  it('returns --:-- for negative durations', () => {
    expect(formatDuration(-1)).toBe('--:--');
    expect(formatDuration(-100)).toBe('--:--');
  });

  it('formats zero correctly', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats sub-minute durations', () => {
    expect(formatDuration(59)).toBe('0:59');
  });

  it('formats exactly one hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('formats a 75-minute mix', () => {
    expect(formatDuration(4500)).toBe('1:15:00');
  });
});
