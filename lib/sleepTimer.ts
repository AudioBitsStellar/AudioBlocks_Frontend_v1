/**
 * Sleep timer rules (#589). The timer lives in `PlaybackContext`, so it survives
 * route changes but not a page reload.
 */

/** Volume fades from full to silent over this window before the timer pauses playback. */
export const SLEEP_FADE_MS = 10_000;

export type SleepTimer = { kind: 'duration'; endsAt: number } | { kind: 'end-of-track' };

export type SleepTimerOption = { kind: 'duration'; minutes: number } | { kind: 'end-of-track' };

export const SLEEP_TIMER_OPTIONS: { option: SleepTimerOption; label: string }[] = [
  { option: { kind: 'duration', minutes: 15 }, label: '15 minutes' },
  { option: { kind: 'duration', minutes: 30 }, label: '30 minutes' },
  { option: { kind: 'duration', minutes: 45 }, label: '45 minutes' },
  { option: { kind: 'duration', minutes: 60 }, label: '60 minutes' },
  { option: { kind: 'end-of-track' }, label: 'End of track' },
];

/** Turns a menu choice into timer state. Durations are measured from `now`. */
export function createSleepTimer(option: SleepTimerOption, now: number): SleepTimer {
  if (option.kind === 'end-of-track') return { kind: 'end-of-track' };
  return { kind: 'duration', endsAt: now + option.minutes * 60_000 };
}

/** Volume multiplier from 1 down to 0 during the final `SLEEP_FADE_MS` of the timer. */
export function sleepFadeFactor(remainingMs: number): number {
  if (!Number.isFinite(remainingMs) || remainingMs >= SLEEP_FADE_MS) return 1;
  return Math.min(1, Math.max(0, remainingMs / SLEEP_FADE_MS));
}

/** Remaining time as m:ss, rounded up so the display never shows 0:00 before the stop. */
export function formatSleepRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
