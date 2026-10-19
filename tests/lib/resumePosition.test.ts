import { describe, expect, it } from 'vitest';
import {
  clearResumePosition,
  formatResumeTime,
  getResumePosition,
  readResumeEntries,
  RESUME_MAX_ENTRIES,
  RESUME_STORAGE_KEY,
  resumeStartTime,
  type ResumeStorage,
  saveResumePosition,
  shouldRestorePosition,
} from '@/lib/resumePosition';

/** Map-backed storage, so the tests never touch the jsdom localStorage shim. */
function memoryStorage(): ResumeStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const HOUR = 3600;

describe('saving and reading resume positions', () => {
  it('remembers a position in a long track and returns it later', () => {
    const storage = memoryStorage();
    saveResumePosition('mix', 754, HOUR, storage);
    expect(getResumePosition('mix', storage)).toBe(754);
  });

  it('ignores tracks shorter than ten minutes', () => {
    const storage = memoryStorage();
    saveResumePosition('short', 120, 300, storage);
    expect(getResumePosition('short', storage)).toBeNull();
  });

  it('clears the entry once the listener is within 30 seconds of the end', () => {
    const storage = memoryStorage();
    saveResumePosition('mix', 600, HOUR, storage);
    saveResumePosition('mix', HOUR - 20, HOUR, storage);
    expect(getResumePosition('mix', storage)).toBeNull();
  });

  it('keeps a single entry per track, replacing the older position', () => {
    const storage = memoryStorage();
    saveResumePosition('mix', 100, HOUR, storage, 1);
    saveResumePosition('mix', 900, HOUR, storage, 2);
    expect(readResumeEntries(storage)).toEqual([{ trackId: 'mix', position: 900, savedAt: 2 }]);
  });

  it('drops the least recently saved tracks past the cap', () => {
    const storage = memoryStorage();
    for (let i = 0; i <= RESUME_MAX_ENTRIES; i++) {
      saveResumePosition(`track-${i}`, 100, HOUR, storage, i);
    }
    const entries = readResumeEntries(storage);
    expect(entries).toHaveLength(RESUME_MAX_ENTRIES);
    expect(getResumePosition('track-0', storage)).toBeNull();
    expect(getResumePosition(`track-${RESUME_MAX_ENTRIES}`, storage)).toBe(100);
  });

  it('treats corrupt storage as empty instead of throwing', () => {
    const storage = memoryStorage();
    storage.setItem(RESUME_STORAGE_KEY, '{not json');
    expect(getResumePosition('mix', storage)).toBeNull();
    saveResumePosition('mix', 300, HOUR, storage);
    expect(getResumePosition('mix', storage)).toBe(300);
  });

  it('skips malformed entries in the stored list', () => {
    const storage = memoryStorage();
    storage.setItem(
      RESUME_STORAGE_KEY,
      JSON.stringify([{ trackId: 'ok', position: 5, savedAt: 1 }, { trackId: 3 }, null])
    );
    expect(readResumeEntries(storage)).toEqual([{ trackId: 'ok', position: 5, savedAt: 1 }]);
  });
});

describe('clearing resume positions', () => {
  it('removes only the requested track', () => {
    const storage = memoryStorage();
    saveResumePosition('a', 100, HOUR, storage);
    saveResumePosition('b', 200, HOUR, storage);
    clearResumePosition('a', storage);
    expect(getResumePosition('a', storage)).toBeNull();
    expect(getResumePosition('b', storage)).toBe(200);
  });
});

describe('restoring resume positions', () => {
  it('restores a few seconds before the saved point, never before 0:00', () => {
    expect(resumeStartTime(754)).toBe(751);
    expect(resumeStartTime(2)).toBe(0);
  });

  it('only restores positions that are inside a long track and not near its end', () => {
    expect(shouldRestorePosition(754, HOUR)).toBe(true);
    expect(shouldRestorePosition(null, HOUR)).toBe(false);
    expect(shouldRestorePosition(0, HOUR)).toBe(false);
    expect(shouldRestorePosition(120, 300)).toBe(false);
    expect(shouldRestorePosition(HOUR - 10, HOUR)).toBe(false);
    expect(shouldRestorePosition(120, Number.NaN)).toBe(false);
  });

  it('formats times as m:ss or h:mm:ss', () => {
    expect(formatResumeTime(754)).toBe('12:34');
    expect(formatResumeTime(3723)).toBe('1:02:03');
    expect(formatResumeTime(-5)).toBe('0:00');
  });
});
