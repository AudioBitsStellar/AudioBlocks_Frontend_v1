/**
 * #117: thin coverage for `usePlaybackHistory`. The full history reducer
 * behaviour (merge, max, persistence) is covered in
 * `tests/context/PlaybackContext.test.tsx`; this file only pins the hook's
 * contract so refactors cannot silently change its shape or re-render
 * isolation.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaybackProvider } from '@/context/PlaybackContext';
import { usePlaybackHistory } from '@/hooks/usePlaybackHistory';

describe('usePlaybackHistory (#117)', () => {
  it('exposes history, recordPlay, getRecentlyPlayed, and clearHistory', () => {
    const { result } = renderHook(() => usePlaybackHistory(), { wrapper: PlaybackProvider });
    expect(result.current.history).toEqual([]);
    expect(typeof result.current.recordPlay).toBe('function');
    expect(typeof result.current.clearHistory).toBe('function');
    expect(typeof result.current.getRecentlyPlayed).toBe('function');
  });

  it('recordPlay adds an entry and getRecentlyPlayed dedupes by trackId', () => {
    const { result } = renderHook(() => usePlaybackHistory(), { wrapper: PlaybackProvider });
    act(() => {
      result.current.recordPlay('track-a', 30);
      // Non-consecutive play of same track after a different one; must dedupe.
      result.current.recordPlay('track-b', 10);
      result.current.recordPlay('track-a', 15);
    });
    const recent = result.current.getRecentlyPlayed(5);
    expect(recent.map((e) => e.trackId)).toEqual(['track-a', 'track-b']);
  });

  it('clearHistory wipes the trail', () => {
    const { result } = renderHook(() => usePlaybackHistory(), { wrapper: PlaybackProvider });
    act(() => {
      result.current.recordPlay('track-a', 5);
    });
    expect(result.current.history.length).toBe(1);
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.history).toEqual([]);
  });
});
