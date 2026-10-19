const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Formats a timestamp relative to `now`, e.g. "5 minutes ago" or "yesterday".
 * Used by notifications (#574) and song comments (#576). O(1).
 *
 * @returns The relative label, or an empty string for an invalid date.
 */
export function formatRelativeTime(value: string | Date, now: number = Date.now()): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';

  const seconds = Math.round((time - now) / 1000);
  if (Math.abs(seconds) < 60) return 'just now';

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.trunc(seconds / size), unit);
  }
  return 'just now';
}
