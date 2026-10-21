import { describe, expect, it } from 'vitest';
import {
  createSleepTimer,
  formatSleepRemaining,
  SLEEP_FADE_MS,
  SLEEP_TIMER_OPTIONS,
  sleepFadeFactor,
} from '@/lib/sleepTimer';

describe('createSleepTimer', () => {
  it('ends the chosen number of minutes after now', () => {
    expect(createSleepTimer({ kind: 'duration', minutes: 15 }, 1_000)).toEqual({
      kind: 'duration',
      endsAt: 1_000 + 15 * 60_000,
    });
  });

  it('marks "End of track" without a deadline', () => {
    expect(createSleepTimer({ kind: 'end-of-track' }, 1_000)).toEqual({ kind: 'end-of-track' });
  });

  it('offers 15, 30, 45 and 60 minutes plus end of track', () => {
    expect(SLEEP_TIMER_OPTIONS.map((item) => item.label)).toEqual([
      '15 minutes',
      '30 minutes',
      '45 minutes',
      '60 minutes',
      'End of track',
    ]);
  });
});

describe('sleepFadeFactor', () => {
  it('leaves volume alone until the fade window starts', () => {
    expect(sleepFadeFactor(SLEEP_FADE_MS + 1)).toBe(1);
    expect(sleepFadeFactor(SLEEP_FADE_MS)).toBe(1);
  });

  it('falls linearly to silence over the final ten seconds', () => {
    expect(sleepFadeFactor(SLEEP_FADE_MS / 2)).toBeCloseTo(0.5);
    expect(sleepFadeFactor(0)).toBe(0);
    expect(sleepFadeFactor(-500)).toBe(0);
  });
});

describe('formatSleepRemaining', () => {
  it('rounds up so the countdown never shows 0:00 early', () => {
    expect(formatSleepRemaining(15 * 60_000)).toBe('15:00');
    expect(formatSleepRemaining(899_400)).toBe('15:00');
    expect(formatSleepRemaining(9_100)).toBe('0:10');
    expect(formatSleepRemaining(0)).toBe('0:00');
  });
});
