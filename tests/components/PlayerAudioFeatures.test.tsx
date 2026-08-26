import { fireEvent, render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Player from '@/components/common/Player';
import { PlaybackContext, PlaybackContextValue } from '@/context/PlaybackContext';

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

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const createParam = (value: number) => ({ value });

const MockAudioContext = vi.fn().mockImplementation(function () {
  return {
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
  };
});

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
  queue: [],
  trackError: null,
  recentlyPlayed: [],
  autoplayBlocked: false,
  history: [],
  crossfadeDuration: 0,
  isCrossfading: false,
  normalizeAudio: true,
  gapless: true,
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
});

const renderWithContext = (overrides: Partial<PlaybackContextValue> = {}) => {
  const value = createMockContext(overrides);
  return render(
    <PlaybackContext.Provider value={value}>
      <Player />
    </PlaybackContext.Provider>
  );
};

const mockMediaElement = () => {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => Promise.resolve()),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
};

describe('Player — audio normalization (#328)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);
    mockMediaElement();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('routes the primary element through a compressor when enabled', () => {
    renderWithContext({ isPlaying: true });

    const ctx = MockAudioContext.mock.results[0]?.value;
    expect(ctx).toBeDefined();
    expect(ctx.createMediaElementSource).toHaveBeenCalled();
    expect(ctx.createDynamicsCompressor).toHaveBeenCalled();

    const compressor = ctx.createDynamicsCompressor.mock.results[0].value;
    // Normalizing parameters applied (dB threshold, ratio, fast attack).
    expect(compressor.threshold.value).toBe(-24);
    expect(compressor.ratio.value).toBe(12);
  });

  it('does not build the normalization graph when disabled', () => {
    renderWithContext({ normalizeAudio: false });

    expect(MockAudioContext).not.toHaveBeenCalled();
  });
});

describe('Player — gapless playback (#329)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);
    mockMediaElement();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('preloads the next track while playing', () => {
    renderWithContext({ isPlaying: true, currentIndex: 0 });

    const audios = document.querySelectorAll('audio');
    expect(audios.length).toBe(2);
    expect(audios[1].getAttribute('src')).toContain('/2.mp3');
  });

  it('hands off to the preloaded track on ended without a gap', () => {
    const nextMock = vi.fn();
    renderWithContext({ isPlaying: true, currentIndex: 0, next: nextMock });

    const [primary, incoming] = document.querySelectorAll('audio');
    expect(incoming.getAttribute('src')).toContain('/2.mp3');

    // The incoming element becomes ready to play once buffered.
    fireEvent.canPlay(incoming);

    fireEvent.ended(primary);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(primary.getAttribute('src')).toContain('/2.mp3');
    // The preload element is cleaned up after the handoff.
    expect(document.querySelectorAll('audio').length).toBe(1);
  });

  it('falls back to the normal next() when the preload is not ready', () => {
    const nextMock = vi.fn();
    renderWithContext({ isPlaying: true, currentIndex: 0, next: nextMock });

    const [primary] = document.querySelectorAll('audio');
    fireEvent.ended(primary);

    expect(nextMock).toHaveBeenCalledTimes(1);
  });

  it('does not preload when gapless is disabled', () => {
    renderWithContext({ isPlaying: true, currentIndex: 0, gapless: false });

    expect(document.querySelectorAll('audio').length).toBe(1);
  });
});

describe('Player — seeking with preview (#330)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);
    mockMediaElement();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const setupSeekHarness = () => {
    const { container, baseElement } = renderWithContext({ isPlaying: true, currentIndex: 0 });

    const primary = baseElement.querySelector('audio') as HTMLAudioElement;
    const input = container.querySelector('input[role="slider"]') as HTMLInputElement;

    let currentTime = 0;
    let volume = 1;
    Object.defineProperty(primary, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (v: number) => {
        currentTime = v;
      },
    });
    Object.defineProperty(primary, 'volume', {
      configurable: true,
      get: () => volume,
      set: (v: number) => {
        volume = v;
      },
    });
    Object.defineProperty(primary, 'duration', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(primary, 'muted', {
      configurable: true,
      get: () => false,
      set: () => {},
    });

    // Let the player know the track metadata (drives the duration state).
    fireEvent.loadedMetadata(primary);

    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 100,
      top: 0,
      bottom: 0,
      width: 100,
      height: 4,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const scrubber = container.querySelector('div.relative.flex-1') as HTMLDivElement;
    return { container, primary, input, scrubber, getState: () => ({ currentTime, volume }) };
  };

  it('shows a time preview tooltip while hovering the bar', () => {
    const { scrubber, container } = setupSeekHarness();

    fireEvent.pointerMove(scrubber, { clientX: 50 });

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toBe('1:40');
  });

  it('previews the audio position while scrubbing and restores volume on release', () => {
    const { input, scrubber, getState } = setupSeekHarness();

    fireEvent.pointerDown(scrubber, { clientX: 30 });
    // Volume is ducked while previewing.
    expect(getState().volume).toBe(0.35);

    fireEvent.change(input, { target: { value: '60' } });
    expect(getState().currentTime).toBe(60);

    fireEvent.pointerUp(scrubber, { clientX: 60 });
    // Original volume restored, position committed.
    expect(getState().volume).toBe(1);
    expect(getState().currentTime).toBe(60);
  });

  it('hides the tooltip when the pointer leaves the bar', () => {
    const { scrubber, container } = setupSeekHarness();

    fireEvent.pointerMove(scrubber, { clientX: 50 });
    expect(container.querySelector('[role="tooltip"]')).not.toBeNull();

    fireEvent.pointerLeave(scrubber);
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });
});
