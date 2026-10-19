import type { SyntheticEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioEngine, type UseAudioEngineOptions } from '@/hooks/player/useAudioEngine';
import type { Track } from '@/context/PlaybackContext';

const param = (value: number) => ({ value });
const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });

let ctx: {
  state: string;
  destination: object;
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  createMediaElementSource: ReturnType<typeof vi.fn>;
  createDynamicsCompressor: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
};

const MockAudioContext = vi.fn(function () {
  ctx = {
    state: 'running',
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createMediaElementSource: vi.fn(() => node()),
    createDynamicsCompressor: vi.fn(() => ({
      ...node(),
      threshold: param(0),
      knee: param(0),
      ratio: param(1),
      attack: param(0),
      release: param(0),
    })),
    createGain: vi.fn(() => ({ ...node(), gain: param(1) })),
  };
  return ctx;
});

const tracks: Track[] = [
  { id: '1', title: 'Song 1', artist: 'Artist 1', cover: '', url: 'https://cdn.example/1.mp3' },
  { id: '2', title: 'Song 2', artist: 'Artist 2', cover: '' },
];

function createOptions(overrides: Partial<UseAudioEngineOptions> = {}): UseAudioEngineOptions {
  return {
    playlist: tracks,
    currentIndex: 0,
    isPlaying: false,
    volume: 0.8,
    isMuted: false,
    shuffle: false,
    repeat: false,
    queue: [],
    crossfadeDuration: 0,
    normalizeAudio: false,
    gapless: false,
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    setError: vi.fn(),
    addToRecentlyPlayed: vi.fn(),
    setAutoplayBlocked: vi.fn(),
    setCrossfading: vi.fn(),
    ...overrides,
  };
}

function renderEngine(options: UseAudioEngineOptions) {
  return renderHook((props: UseAudioEngineOptions) => useAudioEngine(props), {
    initialProps: options,
  });
}

describe('useAudioEngine', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    MockAudioContext.mockClear();
  });

  it('resolves the stream URL from the track url, falling back to the backend endpoint', () => {
    const options = createOptions();
    const { result, rerender } = renderEngine(options);
    expect(result.current.streamUrl).toBe('https://cdn.example/1.mp3');

    rerender({ ...options, currentIndex: 1 });
    expect(result.current.streamUrl).toBe(`${process.env.NEXT_PUBLIC_API_URL || ''}/stream/2`);
  });

  it('records the current track as recently played', () => {
    const options = createOptions();
    renderEngine(options);
    expect(options.addToRecentlyPlayed).toHaveBeenCalledWith(tracks[0]);
  });

  it('toggles play and pause through the context callbacks', () => {
    const options = createOptions();
    const { result, rerender } = renderEngine(options);

    act(() => result.current.togglePlay());
    expect(options.play).toHaveBeenCalledTimes(1);

    rerender({ ...options, isPlaying: true });
    act(() => result.current.togglePlay());
    expect(options.pause).toHaveBeenCalledTimes(1);
  });

  it('ignores play toggles while buffering', () => {
    const options = createOptions();
    const { result } = renderEngine(options);

    act(() => result.current.primaryHandlers.onWaiting());
    act(() => result.current.togglePlay());

    expect(result.current.isBuffering).toBe(true);
    expect(options.play).not.toHaveBeenCalled();
  });

  it('routes the primary element through the compressor when normalization is enabled', () => {
    const options = createOptions();
    const { result, rerender } = renderEngine(options);
    result.current.audioRef.current = document.createElement('audio');

    rerender({ ...options, normalizeAudio: true });

    expect(MockAudioContext).toHaveBeenCalledTimes(1);
    expect(ctx.createDynamicsCompressor).toHaveBeenCalledTimes(1);
    const compressor = ctx.createDynamicsCompressor.mock.results[0].value;
    expect(compressor.ratio.value).toBe(12);
    expect(compressor.threshold.value).toBe(-24);

    rerender({ ...options, normalizeAudio: false });
    expect(compressor.ratio.value).toBe(1);
    expect(compressor.threshold.value).toBe(0);
  });

  it('applies the muted volume to the normalization gain', () => {
    const options = createOptions({ normalizeAudio: true });
    const { result, rerender } = renderEngine(options);
    result.current.audioRef.current = document.createElement('audio');

    rerender({ ...options, volume: 0.5 });
    const gain = ctx.createGain.mock.results[0].value;
    expect(gain.gain.value).toBe(0.5);

    rerender({ ...options, volume: 0.5, isMuted: true });
    expect(gain.gain.value).toBe(0);
  });

  it('reports a stream error and skips to the next track after 3 seconds', () => {
    vi.useFakeTimers();
    const options = createOptions();
    const { result } = renderEngine(options);

    act(() => result.current.primaryHandlers.onError());
    expect(options.setError).toHaveBeenCalledWith(
      expect.stringContaining('Unable to stream track "Song 1"')
    );
    expect(options.next).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(3000));
    expect(options.next).toHaveBeenCalledTimes(1);
  });

  it('advances on ended, or replays the track when repeat is on', () => {
    const options = createOptions();
    const { result, rerender } = renderEngine(options);

    act(() => result.current.primaryHandlers.onEnded());
    expect(options.next).toHaveBeenCalledTimes(1);

    rerender({ ...options, repeat: true });
    const audio = document.createElement('audio');
    result.current.audioRef.current = audio;
    act(() => result.current.primaryHandlers.onEnded());
    expect(options.next).toHaveBeenCalledTimes(1);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('preloads the next track for gapless playback and hands off on ended', () => {
    const options = createOptions({ gapless: true, isPlaying: true });
    const { result } = renderEngine(options);
    expect(result.current.incomingUrl).toBe(`${process.env.NEXT_PUBLIC_API_URL || ''}/stream/2`);

    const primary = document.createElement('audio');
    const incoming = document.createElement('audio');
    incoming.src = 'https://cdn.example/2.mp3';
    result.current.audioRef.current = primary;
    result.current.incomingAudioRef.current = incoming;

    act(() => result.current.incomingHandlers.onCanPlay());
    act(() => result.current.primaryHandlers.onEnded());

    expect(primary.src).toBe('https://cdn.example/2.mp3');
    expect(options.next).toHaveBeenCalledTimes(1);
    expect(result.current.incomingUrl).toBeNull();
  });

  it('does not preload while shuffling, because the next track is chosen at transition time', () => {
    const { result } = renderEngine(
      createOptions({ gapless: true, isPlaying: true, shuffle: true })
    );
    expect(result.current.incomingUrl).toBeNull();
  });

  it('applies the playback speed to the audio element', () => {
    const { result } = renderEngine(createOptions());
    const audio = document.createElement('audio');
    result.current.audioRef.current = audio;

    act(() => result.current.setPlaybackSpeed(1.5));

    expect(result.current.playbackSpeed).toBe(1.5);
    expect(audio.playbackRate).toBe(1.5);
  });

  it('releases audio resources and closes the context on unmount', () => {
    const options = createOptions({ normalizeAudio: true });
    const { result, rerender, unmount } = renderEngine(options);
    result.current.audioRef.current = document.createElement('audio');
    rerender({ ...options, volume: 0.7 });

    unmount();

    expect(ctx.close).toHaveBeenCalledTimes(1);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('accepts the onLoadedMetadata event to expose the duration', () => {
    const { result } = renderEngine(createOptions());
    act(() =>
      result.current.primaryHandlers.onLoadedMetadata({
        currentTarget: { duration: 215 },
      } as unknown as SyntheticEvent<HTMLAudioElement>)
    );
    expect(result.current.duration).toBe(215);
  });
});
