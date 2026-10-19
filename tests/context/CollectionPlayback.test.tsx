import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlaybackProvider, usePlayback, type Track } from '@/context/PlaybackContext';
const tracks: Track[] = ['a', 'b', 'c'].map((id) => ({
  id,
  title: id,
  artist: 'Artist',
  cover: '/cover.svg',
  available: id !== 'b',
}));
describe('collection playback', () => {
  beforeEach(() => localStorage.clear());
  it('preserves release order through successive queue transitions and clears the old queue', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper: PlaybackProvider });
    act(() => result.current.addToQueue({ ...tracks[0], id: 'old' }));
    act(() => result.current.playTracks(tracks));
    expect(result.current.playlist.map((track) => track.id)).toEqual(['a', 'c']);
    expect(result.current.queue.map((track) => track.id)).toEqual(['c']);
    act(() => result.current.next());
    expect(result.current.playlist[result.current.currentIndex].id).toBe('c');
  });
  it('excludes unavailable tracks from shuffle, direct play, and both queue APIs', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper: PlaybackProvider });
    act(() => {
      result.current.playTrack(tracks[1]);
      result.current.enqueueTrack(tracks[1]);
      result.current.addToQueue(tracks[1], 'next');
    });
    expect(result.current.queue).toEqual([]);
    expect(result.current.playlist.some((t) => t.id === 'b')).toBe(false);
    act(() => result.current.playTracks(tracks, true));
    expect(result.current.playlist.map((t) => t.id).sort()).toEqual(['a', 'c']);
  });
  it('never restores an unavailable queued song from storage', () => {
    localStorage.setItem('audioblocks_queue', JSON.stringify(tracks));
    const { result } = renderHook(() => usePlayback(), { wrapper: PlaybackProvider });
    expect(result.current.queue.map((t) => t.id)).toEqual(['a', 'c']);
  });
});
