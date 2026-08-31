import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Player from '@/components/common/Player';
import { PlaybackContext, PlaybackContextValue } from '@/context/PlaybackContext';

/**
 * Regression coverage for #39 — Player behaviour when a track's audio fails to
 * load or its cover image is missing. The feature itself landed in PR #60;
 * these tests lock the acceptance criteria in place.
 */

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const createParam = (value: number) => ({ value });
const MockAudioContext = vi.fn().mockImplementation(() => ({
  state: 'running',
  destination: { connect: vi.fn() },
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createMediaElementSource: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() }),
  createDynamicsCompressor: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    threshold: createParam(0),
    knee: createParam(0),
    ratio: createParam(1),
    attack: createParam(0),
    release: createParam(0),
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: createParam(1),
  }),
}));

const COVER_FALLBACK = '/placeholder-cover.svg';

const track = (over: Record<string, unknown> = {}) => ({
  id: 'track-1',
  title: 'Broken Track',
  artist: 'Artist 1',
  cover: '/cover1.jpg',
  url: 'https://audio.example/1.mp3',
  ...over,
});

const createMockContext = (overrides: Partial<PlaybackContextValue> = {}): PlaybackContextValue =>
  ({
    playlist: [track(), track({ id: 'track-2', title: 'Track 2', cover: '/cover2.jpg' })],
    currentIndex: 0,
    isPlaying: false,
    volume: 1,
    isMuted: false,
    shuffle: false,
    repeat: false,
    queue: [],
    trackError: null,
    recentlyPlayed: [],
    autoplayBlocked: false,
    history: [],
    crossfadeDuration: 0,
    isCrossfading: false,
    normalizeAudio: false,
    gapless: false,
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
    setNormalizeAudio: vi.fn(),
    setGapless: vi.fn(),
    ...overrides,
  }) as PlaybackContextValue;

const renderPlayer = (overrides: Partial<PlaybackContextValue> = {}) => {
  const value = createMockContext(overrides);
  const utils = render(
    <PlaybackContext.Provider value={value}>
      <Player />
    </PlaybackContext.Provider>
  );
  return { ...utils, value };
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('webkitAudioContext', MockAudioContext);
  Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Player — track metadata / audio failure (#39)', () => {
  it('shows a dismissible inline error banner without hiding the transport controls', () => {
    const dismissError = vi.fn();
    renderPlayer({ trackError: 'Unable to stream track "Broken Track".', dismissError });

    expect(screen.getByText(/unable to stream track/i)).toBeInTheDocument();

    const dismiss = screen.getByRole('button', { name: /dismiss error/i });
    fireEvent.click(dismiss);
    expect(dismissError).toHaveBeenCalledTimes(1);

    // The error banner does not replace the player — its controls are still
    // in the tree alongside it.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(3);
  });

  it('falls back to the placeholder image when a track has no cover', () => {
    renderPlayer({
      playlist: [track({ cover: undefined })],
    });
    const cover = screen.getAllByAltText('Broken Track')[0] as HTMLImageElement;
    expect(cover.getAttribute('src')).toBe(COVER_FALLBACK);
  });

  it('swaps a broken cover image for the placeholder on error', () => {
    renderPlayer();
    const cover = screen.getAllByAltText('Broken Track')[0] as HTMLImageElement;
    expect(cover.getAttribute('src')).toBe('/cover1.jpg');

    fireEvent.error(cover);

    const refreshed = screen.getAllByAltText('Broken Track')[0] as HTMLImageElement;
    expect(refreshed.getAttribute('src')).toBe(COVER_FALLBACK);
  });

  it('reports an error and auto-skips to the next track when the audio element errors', () => {
    vi.useFakeTimers();
    const setError = vi.fn();
    const next = vi.fn();
    const { container } = renderPlayer({ setError, next });

    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();

    fireEvent.error(audio as HTMLAudioElement);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
