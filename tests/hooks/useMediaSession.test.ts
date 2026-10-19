import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMediaSession } from '@/hooks/useMediaSession';

type Handler = ((details: MediaSessionActionDetails) => void) | null;

function createMediaSessionMock() {
  const handlers: Record<string, Handler> = {};
  return {
    metadata: null as unknown,
    playbackState: 'none' as MediaSessionPlaybackState,
    handlers,
    setActionHandler: vi.fn((action: string, handler: Handler) => {
      handlers[action] = handler;
    }),
  };
}

const TRACK = { title: 'Song', artist: 'Artist', cover: 'https://example.com/c.jpg' };

const baseOptions = {
  track: TRACK,
  isPlaying: false,
  duration: 200,
  currentTime: 0,
  onPlay: vi.fn(),
  onPause: vi.fn(),
};

describe('useMediaSession', () => {
  let session: ReturnType<typeof createMediaSessionMock>;

  beforeEach(() => {
    session = createMediaSessionMock();
    Object.defineProperty(navigator, 'mediaSession', {
      value: session,
      configurable: true,
    });
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor(public init: unknown) {}
      },
    );
  });

  afterEach(() => {
    delete (navigator as unknown as { mediaSession?: unknown }).mediaSession;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('sets metadata from the track and playbackState to paused', () => {
    renderHook(() => useMediaSession(baseOptions));

    expect(session.metadata).toMatchObject({
      init: {
        title: 'Song',
        artist: 'Artist',
        artwork: [{ src: TRACK.cover, sizes: '512x512', type: 'image/jpeg' }],
      },
    });
    expect(session.playbackState).toBe('paused');
  });

  it('sets playbackState to playing when isPlaying is true', () => {
    renderHook(() => useMediaSession({ ...baseOptions, isPlaying: true }));
    expect(session.playbackState).toBe('playing');
  });

  it('uses empty artwork when the track has no cover', () => {
    renderHook(() => useMediaSession({ ...baseOptions, track: { ...TRACK, cover: '' } }));
    expect(session.metadata).toMatchObject({ init: { artwork: [] } });
  });

  it('registers play and pause handlers that call the callbacks', () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    renderHook(() => useMediaSession({ ...baseOptions, onPlay, onPause }));

    session.handlers.play?.({ action: 'play' } as MediaSessionActionDetails);
    session.handlers.pause?.({ action: 'pause' } as MediaSessionActionDetails);

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('seek handlers use the seekOffset from the event, defaulting to 10', () => {
    const onSeekBackward = vi.fn();
    const onSeekForward = vi.fn();
    renderHook(() =>
      useMediaSession({ ...baseOptions, onSeekBackward, onSeekForward }),
    );

    session.handlers.seekbackward?.({
      action: 'seekbackward',
      seekOffset: 5,
    } as MediaSessionActionDetails);
    session.handlers.seekforward?.({ action: 'seekforward' } as MediaSessionActionDetails);

    expect(onSeekBackward).toHaveBeenCalledWith(5);
    expect(onSeekForward).toHaveBeenCalledWith(10);
  });

  it('calls onPrevTrack and onNextTrack from their handlers', () => {
    const onPrevTrack = vi.fn();
    const onNextTrack = vi.fn();
    renderHook(() => useMediaSession({ ...baseOptions, onPrevTrack, onNextTrack }));

    session.handlers.previoustrack?.({ action: 'previoustrack' } as MediaSessionActionDetails);
    session.handlers.nexttrack?.({ action: 'nexttrack' } as MediaSessionActionDetails);

    expect(onPrevTrack).toHaveBeenCalledTimes(1);
    expect(onNextTrack).toHaveBeenCalledTimes(1);
  });

  it('seekto calls onSeekTo with the seekTime and ignores a missing seekTime', () => {
    const onSeekTo = vi.fn();
    renderHook(() => useMediaSession({ ...baseOptions, onSeekTo }));

    session.handlers.seekto?.({ action: 'seekto', seekTime: 42 } as MediaSessionActionDetails);
    session.handlers.seekto?.({ action: 'seekto' } as MediaSessionActionDetails);

    expect(onSeekTo).toHaveBeenCalledTimes(1);
    expect(onSeekTo).toHaveBeenCalledWith(42);
  });

  it('clears optional action handlers when their callbacks are not provided', () => {
    renderHook(() => useMediaSession(baseOptions));

    expect(session.handlers.seekbackward).toBeNull();
    expect(session.handlers.seekforward).toBeNull();
    expect(session.handlers.previoustrack).toBeNull();
    expect(session.handlers.nexttrack).toBeNull();
    expect(session.handlers.seekto).toBeNull();
  });

  it('clears all handlers on unmount', () => {
    const { unmount } = renderHook(() =>
      useMediaSession({
        ...baseOptions,
        onSeekBackward: vi.fn(),
        onSeekForward: vi.fn(),
        onPrevTrack: vi.fn(),
        onNextTrack: vi.fn(),
        onSeekTo: vi.fn(),
      }),
    );

    unmount();

    for (const action of [
      'play',
      'pause',
      'seekbackward',
      'seekforward',
      'previoustrack',
      'nexttrack',
      'seekto',
    ]) {
      expect(session.handlers[action]).toBeNull();
    }
  });

  it('does nothing when the Media Session API is unavailable', () => {
    delete (navigator as unknown as { mediaSession?: unknown }).mediaSession;

    expect(() => renderHook(() => useMediaSession(baseOptions))).not.toThrow();
    expect(session.setActionHandler).not.toHaveBeenCalled();
  });
});
