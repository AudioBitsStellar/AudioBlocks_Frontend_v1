import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Player from '@/components/common/Player';
import { PlaybackContextValue } from '@/context/PlaybackContext';
import * as PlaybackContextModule from '@/context/PlaybackContext';

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

describe('PlayerBar Visual Regression (DOM Snapshots)', () => {
  const mockTrack = {
    id: 'track-1',
    title: 'Test Track',
    artist: 'Test Artist',
    cover: '/test-cover.jpg',
  };

  const defaultContext: PlaybackContextValue = {
    playlist: [mockTrack],
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
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    setCurrentIndex: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleShuffle: vi.fn(),
    toggleRepeat: vi.fn(),
    playTrack: vi.fn(),
    enqueueTrack: vi.fn(),
    setError: vi.fn(),
    dismissError: vi.fn(),
    addToRecentlyPlayed: vi.fn(),
    clearRecentlyPlayed: vi.fn(),
    setAutoplayBlocked: vi.fn(),
    resumeAudio: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    reorderQueue: vi.fn(),
    clearQueue: vi.fn(),
    advanceQueue: vi.fn(),
    recordPlay: vi.fn(),
    clearHistory: vi.fn(),
    getRecentlyPlayed: vi.fn(() => []),
    setCrossfadeDuration: vi.fn(),
    setCrossfading: vi.fn(),
  };

  const setViewport = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  };

  const renderWithContext = (contextOverride: Partial<PlaybackContextValue> = {}) => {
    const value = { ...defaultContext, ...contextOverride };
    vi.spyOn(PlaybackContextModule, 'usePlayback').mockReturnValue(value);
    return render(<Player />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const breakpoints = [
    { name: 'Mobile', width: 375 },
    { name: 'Tablet', width: 768 },
    { name: 'Desktop', width: 1440 },
  ];

  breakpoints.forEach(({ name, width }) => {
    describe(`Breakpoint: ${name} (${width}px)`, () => {
      beforeEach(() => {
        setViewport(width);
      });

      it('renders paused state correctly', () => {
        const { container } = renderWithContext({ isPlaying: false });
        expect(container).toMatchSnapshot();
      });

      it('renders playing state correctly', () => {
        const { container } = renderWithContext({ isPlaying: true });
        expect(container).toMatchSnapshot();
      });

      it('renders loading (buffering) state correctly', () => {
        const { container, baseElement } = renderWithContext({ isPlaying: true });
        const audio = baseElement.querySelector('audio');
        if (audio) {
          const event = new Event('waiting');
          audio.dispatchEvent(event);
        }
        expect(container).toMatchSnapshot();
      });
    });
  });
});
