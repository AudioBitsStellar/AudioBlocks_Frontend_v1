/**
 * Remembers where a long track was left, so reopening it resumes close to that
 * point (#588). Entries are kept in one localStorage list ordered from least to
 * most recently saved, and the oldest are dropped past `RESUME_MAX_ENTRIES`.
 */

/** Tracks shorter than this always start from 0:00. */
export const RESUME_MIN_DURATION_S = 10 * 60;
/** Positions this close to the end count as finished and are forgotten. */
export const RESUME_END_MARGIN_S = 30;
/** Resume a few seconds before the saved point so the listener keeps context. */
export const RESUME_REWIND_S = 3;
export const RESUME_MAX_ENTRIES = 50;
/** Minimum gap between position writes while a track plays. */
export const RESUME_SAVE_INTERVAL_MS = 5000;
export const RESUME_STORAGE_KEY = 'audioblocks_resume_positions';

export interface ResumeEntry {
  trackId: string;
  position: number;
  savedAt: number;
}

/** Minimal storage surface, so tests can pass a Map-backed fake. */
export type ResumeStorage = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): ResumeStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function isEntry(value: unknown): value is ResumeEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.trackId === 'string' &&
    typeof entry.position === 'number' &&
    Number.isFinite(entry.position) &&
    typeof entry.savedAt === 'number'
  );
}

/** Reads the stored list. Corrupt or unavailable storage yields an empty list. */
export function readResumeEntries(storage: ResumeStorage | undefined = defaultStorage()) {
  try {
    const raw = storage?.getItem(RESUME_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function writeResumeEntries(entries: ResumeEntry[], storage: ResumeStorage | undefined) {
  try {
    storage?.setItem(RESUME_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* Storage full or blocked: resuming is a convenience, so drop the write. */
  }
}

/** The saved position for a track, or `null` when there is nothing to resume. */
export function getResumePosition(
  trackId: string,
  storage: ResumeStorage | undefined = defaultStorage()
): number | null {
  const entry = readResumeEntries(storage).find((item) => item.trackId === trackId);
  return entry ? entry.position : null;
}

/** Removes a track's saved position, e.g. after it finishes or the listener starts over. */
export function clearResumePosition(
  trackId: string,
  storage: ResumeStorage | undefined = defaultStorage()
): void {
  const entries = readResumeEntries(storage);
  if (!entries.some((item) => item.trackId === trackId)) return;
  writeResumeEntries(entries.filter((item) => item.trackId !== trackId), storage);
}

/**
 * Records the listener's position in a track. Short tracks are ignored, and a
 * position within `RESUME_END_MARGIN_S` of the end clears the entry instead.
 */
export function saveResumePosition(
  trackId: string,
  position: number,
  duration: number,
  storage: ResumeStorage | undefined = defaultStorage(),
  now: number = Date.now()
): void {
  if (!Number.isFinite(duration) || duration < RESUME_MIN_DURATION_S) return;
  if (!Number.isFinite(position) || position < 0) return;
  if (position >= duration - RESUME_END_MARGIN_S) {
    clearResumePosition(trackId, storage);
    return;
  }
  const others = readResumeEntries(storage).filter((item) => item.trackId !== trackId);
  const entries = [...others, { trackId, position, savedAt: now }];
  writeResumeEntries(entries.slice(-RESUME_MAX_ENTRIES), storage);
}

/** Where playback should start for a saved position: a few seconds earlier, never negative. */
export function resumeStartTime(position: number): number {
  return Math.max(0, position - RESUME_REWIND_S);
}

/** Whether a saved position should be restored for a track of this length. */
export function shouldRestorePosition(
  position: number | null,
  duration: number
): position is number {
  return (
    position !== null &&
    Number.isFinite(duration) &&
    duration >= RESUME_MIN_DURATION_S &&
    position > 0 &&
    position < duration - RESUME_END_MARGIN_S
  );
}

/** Formats seconds as m:ss, or h:mm:ss for tracks longer than an hour. */
export function formatResumeTime(seconds: number): string {
  const total = Math.floor(Math.max(0, seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}
