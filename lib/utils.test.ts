import { describe, it, expect } from 'vitest';
import { cn, formatCount } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('resolves conflicting tailwind classes to the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('px-2', false && 'hidden', undefined, null, 'py-1')).toBe('px-2 py-1');
  });
});

describe('formatCount', () => {
  it('returns 0 for zero', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('formats numbers under 1000 as-is', () => {
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with k suffix', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(25000)).toBe('25k');
    expect(formatCount(999900)).toBe('999.9k');
  });

  it('formats millions with M suffix', () => {
    expect(formatCount(1000000)).toBe('1M');
    expect(formatCount(1500000)).toBe('1.5M');
    expect(formatCount(25000000)).toBe('25M');
  });

  it('strips trailing .0 from formatted values', () => {
    expect(formatCount(2000)).toBe('2k');
    expect(formatCount(3000000)).toBe('3M');
  });
});
