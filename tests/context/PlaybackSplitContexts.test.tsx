import { type ReactNode, useRef } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PlaybackContext,
  PlaybackProvider,
  usePlayback,
  usePlaybackActions,
  usePlaybackSelector,
  usePlaybackState,
  type PlaybackContextValue,
} from '@/context/PlaybackContext';

beforeEach(() => {
  localStorage.clear();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <PlaybackProvider>{children}</PlaybackProvider>
);

describe('usePlaybackActions', () => {
  it('returns every action with a stable identity across state changes', () => {
    const { result } = renderHook(() => usePlaybackActions(), { wrapper });
    const first = result.current;
    const firstFns = { ...first };

    act(() => first.setVolume(0.4));
    act(() => first.play());
    act(() => first.toggleShuffle());

    expect(result.current).toBe(first);
    for (const [name, fn] of Object.entries(firstFns)) {
      expect((result.current as unknown as Record<string, unknown>)[name]).toBe(fn);
    }
    expect(typeof first.reorderQueue).toBe('function');
    expect(typeof first.getRecentlyPlayed).toBe('function');
  });

  it('keeps usePlayback() action identities stable too', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    const { play, setVolume, reorderQueue } = result.current;

    act(() => setVolume(0.2));

    expect(result.current.play).toBe(play);
    expect(result.current.setVolume).toBe(setVolume);
    expect(result.current.reorderQueue).toBe(reorderQueue);
    expect(result.current.volume).toBe(0.2);
  });

  it('getRecentlyPlayed stays stable but reads the latest history', () => {
    const { result } = renderHook(
      () => ({ actions: usePlaybackActions(), state: usePlaybackState() }),
      {
        wrapper,
      }
    );
    const { getRecentlyPlayed, recordPlay } = result.current.actions;
    expect(getRecentlyPlayed()).toEqual([]);

    act(() => recordPlay('track-1', 30));

    expect(result.current.actions.getRecentlyPlayed).toBe(getRecentlyPlayed);
    expect(getRecentlyPlayed().map((e) => e.trackId)).toEqual(['track-1']);
  });
});

describe('usePlaybackState', () => {
  it('reflects reducer state and updates on change', () => {
    const { result } = renderHook(
      () => ({ state: usePlaybackState(), actions: usePlaybackActions() }),
      { wrapper }
    );
    expect(result.current.state.isPlaying).toBe(false);

    act(() => result.current.actions.play());

    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.state).not.toHaveProperty('play');
  });
});

describe('usePlaybackSelector', () => {
  it('returns the selected slice and follows changes', () => {
    const { result } = renderHook(
      () => ({ volume: usePlaybackSelector((s) => s.volume), actions: usePlaybackActions() }),
      { wrapper }
    );
    expect(result.current.volume).toBe(1);

    act(() => result.current.actions.setVolume(0.5));

    expect(result.current.volume).toBe(0.5);
  });

  it('does not re-render when an unrelated slice changes', () => {
    const renders = { selector: 0, actionsOnly: 0, full: 0 };

    function SelectorConsumer() {
      renders.selector += 1;
      const isPlaying = usePlaybackSelector((s) => s.isPlaying);
      return <span data-testid="playing">{String(isPlaying)}</span>;
    }
    function ActionsConsumer() {
      renders.actionsOnly += 1;
      usePlaybackActions();
      return null;
    }
    function FullConsumer() {
      renders.full += 1;
      usePlayback();
      return null;
    }
    let setVolume!: (v: number) => void;
    let play!: () => void;
    function Controls() {
      const actions = usePlaybackActions();
      setVolume = actions.setVolume;
      play = actions.play;
      return null;
    }

    render(
      <PlaybackProvider>
        <Controls />
        <SelectorConsumer />
        <ActionsConsumer />
        <FullConsumer />
      </PlaybackProvider>
    );
    const initial = { ...renders };

    // Dragging a volume slider: ten steps.
    for (let i = 1; i <= 10; i += 1) act(() => setVolume(1 - i / 20));

    expect(renders.selector).toBe(initial.selector);
    expect(renders.actionsOnly).toBe(initial.actionsOnly);
    expect(renders.full).toBe(initial.full + 10);

    act(() => play());
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
    expect(renders.selector).toBe(initial.selector + 1);
    expect(renders.actionsOnly).toBe(initial.actionsOnly);
  });

  it('lets a memoised child that only needs actions bail out of parent renders', () => {
    let childRenders = 0;
    function Child() {
      childRenders += 1;
      const { playTrack } = usePlaybackActions();
      return <button onClick={() => playTrack({ id: 'x', title: 't', artist: 'a', cover: '' })} />;
    }
    function Parent() {
      const volume = usePlaybackSelector((s) => s.volume);
      const stable = useRef(<Child />);
      return <div data-volume={volume}>{stable.current}</div>;
    }
    let setVolume!: (v: number) => void;
    function Controls() {
      setVolume = usePlaybackActions().setVolume;
      return null;
    }
    render(
      <PlaybackProvider>
        <Controls />
        <Parent />
      </PlaybackProvider>
    );
    const before = childRenders;

    act(() => setVolume(0.3));
    act(() => setVolume(0.6));

    expect(childRenders).toBe(before);
  });
});

describe('without the split providers (bare PlaybackContext.Provider)', () => {
  const legacyValue = {
    isPlaying: true,
    volume: 0.7,
    queue: [],
    play: vi.fn(),
    playTrack: vi.fn(),
  } as unknown as PlaybackContextValue;

  const legacyWrapper = ({ children }: { children: ReactNode }) => (
    <PlaybackContext.Provider value={legacyValue}>{children}</PlaybackContext.Provider>
  );

  it('still serves state, actions and selectors from the provided value', () => {
    const { result } = renderHook(
      () => ({
        state: usePlaybackState(),
        actions: usePlaybackActions(),
        selected: usePlaybackSelector((s) => s.volume),
        full: usePlayback(),
      }),
      { wrapper: legacyWrapper }
    );

    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.actions.playTrack).toBe(legacyValue.playTrack);
    expect(result.current.selected).toBe(0.7);
    expect(result.current.full).toBe(legacyValue);
  });
});

describe('outside a provider', () => {
  it.each([
    ['usePlayback', usePlayback],
    ['usePlaybackState', usePlaybackState],
    ['usePlaybackActions', usePlaybackActions],
    ['usePlaybackSelector', () => usePlaybackSelector((s) => s.volume)],
  ])('%s throws a clear error', (name, hook) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(hook)).toThrow(`${name} must be used inside PlaybackProvider`);

    error.mockRestore();
  });
});
