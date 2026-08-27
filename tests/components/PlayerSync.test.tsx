import React, { useState } from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Player from '@/components/common/Player';
import { PlaybackContext, PlaybackContextValue } from '@/context/PlaybackContext';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => {
    const { alt = '', ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...rest} />;
  },
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Player Component - Play/Pause and Track Sync', () => {
  const mockTracks = [
    {
      id: 'track-1',
      title: 'Track 1',
      artist: 'Artist 1',
      cover: '/cover1.jpg',
      url: 'https://audio.example/1.mp3',
    },
    {
      id: 'track-2',
      title: 'Track 2',
      artist: 'Artist 2',
      cover: '/cover2.jpg',
      url: 'https://audio.example/2.mp3',
    },
    {
      id: 'track-3',
      title: 'Track 3',
      artist: 'Artist 3',
      cover: '/cover3.jpg',
      url: 'https://audio.example/3.mp3',
    },
  ];

  let playMock: ReturnType<typeof vi.fn>;
  let pauseMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playMock = vi.fn().mockImplementation(() => Promise.resolve());
    pauseMock = vi.fn();

    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value: playMock,
    });

    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      writable: true,
      value: pauseMock,
    });
  });

  const createMockContext = (
    overrides: Partial<PlaybackContextValue> = {}
  ): PlaybackContextValue => ({
    playlist: mockTracks,
    currentIndex: 0,
    isPlaying: false,
    volume: 1,
    isMuted: false,
    shuffle: false,
    repeat: false,
    trackError: null,
    recentlyPlayed: [],
    autoplayBlocked: false,
    queue: [],
    history: [],
    crossfadeDuration: 0,
    isCrossfading: false,
    normalizeAudio: true,
    gapless: true,
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleShuffle: vi.fn(),
    toggleRepeat: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    clearQueue: vi.fn(),
    reorderQueue: vi.fn(),
    setError: vi.fn(),
    dismissError: vi.fn(),
    addToRecentlyPlayed: vi.fn(),
    setAutoplayBlocked: vi.fn(),
    resumeAudio: vi.fn(),
    setCrossfading: vi.fn(),
    setNormalizeAudio: vi.fn(),
    setGapless: vi.fn(),
    ...overrides,
  });

  it('syncs audio play/pause state when isPlaying changes', () => {
    let setContext: React.Dispatch<React.SetStateAction<PlaybackContextValue>>;

    const Wrapper = () => {
      const [ctx, setCtx] = useState(createMockContext({ isPlaying: false }));
      setContext = setCtx;
      return (
        <PlaybackContext.Provider value={ctx}>
          <Player />
        </PlaybackContext.Provider>
      );
    };

    render(<Wrapper />);
    expect(pauseMock).toHaveBeenCalled();

    // Change to playing
    act(() => {
      setContext(createMockContext({ isPlaying: true }));
    });

    expect(playMock).toHaveBeenCalled();
  });

  it('syncs playback when switching tracks rapidly', () => {
    let setContext: React.Dispatch<React.SetStateAction<PlaybackContextValue>>;

    const Wrapper = () => {
      const [ctx, setCtx] = useState(createMockContext({ isPlaying: true, currentIndex: 0 }));
      setContext = setCtx;
      return (
        <PlaybackContext.Provider value={ctx}>
          <Player />
        </PlaybackContext.Provider>
      );
    };

    render(<Wrapper />);
    expect(playMock).toHaveBeenCalled();

    // Rapid switch to track 1 then track 2
    act(() => {
      setContext(createMockContext({ isPlaying: true, currentIndex: 1 }));
    });

    act(() => {
      setContext(createMockContext({ isPlaying: true, currentIndex: 2 }));
    });

    expect(playMock).toHaveBeenCalled();
  });
});
