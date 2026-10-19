import { describe, expect, it } from 'vitest';
import {
  DATA_SAVER_CAP_KBPS,
  describeStreamQuality,
  normalizeAudioQuality,
  resolveBitrateCap,
} from '@/lib/streamQuality';

describe('normalizeAudioQuality', () => {
  it.each([
    ['auto', 'auto'],
    ['data-saver', 'data-saver'],
    ['normal', 'normal'],
    ['high', 'high'],
  ])('keeps %s', (value, expected) => {
    expect(normalizeAudioQuality(value)).toBe(expected);
  });

  it('maps values saved before #590 to their closest setting', () => {
    expect(normalizeAudioQuality('low')).toBe('data-saver');
    expect(normalizeAudioQuality('medium')).toBe('normal');
  });

  it('falls back to auto for anything unknown', () => {
    expect(normalizeAudioQuality(undefined)).toBe('auto');
    expect(normalizeAudioQuality(42)).toBe('auto');
    expect(normalizeAudioQuality('ultra')).toBe('auto');
  });
});

describe('resolveBitrateCap', () => {
  it('caps each fixed setting at its ceiling regardless of data saver', () => {
    expect(resolveBitrateCap('data-saver', false)).toBe(64);
    expect(resolveBitrateCap('normal', true)).toBe(128);
    expect(resolveBitrateCap('high', false)).toBe(256);
  });

  it('leaves Auto uncapped unless data saver is on', () => {
    expect(resolveBitrateCap('auto', false)).toBeUndefined();
    expect(resolveBitrateCap('auto', true)).toBe(DATA_SAVER_CAP_KBPS);
  });
});

describe('describeStreamQuality', () => {
  it('describes the effective ceiling for the player menu', () => {
    expect(describeStreamQuality('normal', false)).toBe('Normal · up to 128 kbps');
    expect(describeStreamQuality('auto', false)).toBe('Auto · adaptive');
    expect(describeStreamQuality('auto', true)).toBe('Auto · data saver · up to 64 kbps');
  });
});
