import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCrossfade } from '@/hooks/player/useCrossfade';
import type { Track } from '@/context/PlaybackContext';

const track1: Track = {
  id: 't1',
  title: 'Track 1',
  artist: 'Artist 1',
  cover: '/cover1.jpg',
  url: 'https://stream.audioblocks.com/t1.mp3',
  duration: 180,
  available: true,
};

const track2: Track = {
  id: 't2',
  title: 'Track 2',
  artist: 'Artist 2',
  cover: '/cover2.jpg',
  url: 'https://stream.audioblocks.com/t2.mp3',
  duration: 200,
  available: true,
};

describe('useCrossfade (#115)', () => {
  let primaryAudio: HTMLAudioElement;
  let mockAudioContext: AudioContext;
  let mockGainNode: GainNode;

  beforeEach(() => {
    vi.useFakeTimers();

    primaryAudio = document.createElement('audio');
    Object.defineProperty(primaryAudio, 'duration', { value: 180, writable: true });
    Object.defineProperty(primaryAudio, 'currentTime', { value: 178, writable: true });

    mockGainNode = {
      gain: { value: 1 } as unknown as AudioParam,
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as GainNode;

    mockAudioContext = {
      state: 'running',
      createMediaElementSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createGain: vi.fn(() => mockGainNode),
      destination: {} as AudioDestinationNode,
      resume: vi.fn().mockResolvedValue(undefined),
    } as unknown as AudioContext;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not trigger crossfade when crossfadeDuration is 0 (disabled)', () => {
    const setCrossfading = vi.fn();
    const next = vi.fn();

    const { result } = renderHook(() =>
      useCrossfade({
        audioRef: { current: primaryAudio },
        normGraphRef: { current: null },
        ensureAudioContext: () => mockAudioContext,
        playlist: [track1, track2],
        currentIndex: 0,
        isPlaying: true,
        level: 1,
        isMuted: false,
        shuffle: false,
        repeat: false,
        queueLength: 0,
        crossfadeDuration: 0,
        gapless: false,
        next,
        setCrossfading,
      })
    );

    expect(result.current.crossfadeActiveRef.current).toBe(false);
    expect(setCrossfading).not.toHaveBeenCalled();
  });

  it('manages cleanup correctly when discarding incoming audio element', () => {
    const setCrossfading = vi.fn();
    const next = vi.fn();

    const { result } = renderHook(() =>
      useCrossfade({
        audioRef: { current: primaryAudio },
        normGraphRef: { current: null },
        ensureAudioContext: () => mockAudioContext,
        playlist: [track1, track2],
        currentIndex: 0,
        isPlaying: true,
        level: 1,
        isMuted: false,
        shuffle: false,
        repeat: false,
        queueLength: 0,
        crossfadeDuration: 3,
        gapless: false,
        next,
        setCrossfading,
      })
    );

    // Call cleanupIncoming
    act(() => {
      result.current.cleanupIncoming();
    });

    expect(result.current.crossfadeActiveRef.current).toBe(false);
    expect(setCrossfading).toHaveBeenCalledWith(false);
    expect(result.current.incomingUrl).toBeNull();
  });

  it('handles pause during crossfade by pausing incoming audio', () => {
    const setCrossfading = vi.fn();
    const next = vi.fn();

    const incomingAudio = document.createElement('audio');
    const pauseSpy = vi.spyOn(incomingAudio, 'pause');

    const { result, rerender } = renderHook(
      ({ isPlaying }) =>
        useCrossfade({
          audioRef: { current: primaryAudio },
          normGraphRef: { current: null },
          ensureAudioContext: () => mockAudioContext,
          playlist: [track1, track2],
          currentIndex: 0,
          isPlaying,
          level: 1,
          isMuted: false,
          shuffle: false,
          repeat: false,
          queueLength: 0,
          crossfadeDuration: 3,
          gapless: false,
          next,
          setCrossfading,
        }),
      { initialProps: { isPlaying: true } }
    );

    result.current.incomingAudioRef.current = incomingAudio;
    result.current.crossfadeActiveRef.current = true;

    // Transition to paused
    rerender({ isPlaying: false });

    expect(pauseSpy).toHaveBeenCalled();
  });

  it('handles seeking outside crossfade window by aborting crossfade and restoring volume', () => {
    const setCrossfading = vi.fn();
    const next = vi.fn();

    const { result } = renderHook(() =>
      useCrossfade({
        audioRef: { current: primaryAudio },
        normGraphRef: { current: null },
        ensureAudioContext: () => mockAudioContext,
        playlist: [track1, track2],
        currentIndex: 0,
        isPlaying: true,
        level: 0.8,
        isMuted: false,
        shuffle: false,
        repeat: false,
        queueLength: 0,
        crossfadeDuration: 3,
        gapless: false,
        next,
        setCrossfading,
      })
    );

    result.current.crossfadeActiveRef.current = true;

    // Simulate seeking back to beginning of track (currentTime = 10, remaining = 170 > 3)
    primaryAudio.currentTime = 10;
    act(() => {
      primaryAudio.dispatchEvent(new Event('seeking'));
    });

    expect(result.current.crossfadeActiveRef.current).toBe(false);
    expect(setCrossfading).toHaveBeenCalledWith(false);
    expect(primaryAudio.volume).toBe(0.8);
  });
});
