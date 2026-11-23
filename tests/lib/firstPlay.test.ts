import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasRecordedFirstPlay, markFirstPlayRecorded, resetFirstPlay } from '@/lib/firstPlay';

describe('first-play flag (#839)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('treats a missing flag as not-yet-recorded', () => {
    expect(hasRecordedFirstPlay()).toBe(false);
  });

  it('persists the recorded flag until reset', () => {
    expect(hasRecordedFirstPlay()).toBe(false);
    markFirstPlayRecorded();
    expect(hasRecordedFirstPlay()).toBe(true);
    resetFirstPlay();
    expect(hasRecordedFirstPlay()).toBe(false);
  });

  it('treats storage failures as already-recorded instead of throwing', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(hasRecordedFirstPlay()).toBe(true);
    getItem.mockRestore();
  });
});
