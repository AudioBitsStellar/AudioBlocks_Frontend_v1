import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
import { SleepTimerMenu } from '@/components/player/SleepTimerMenu';

const track = { id: 'one', title: 'One', artist: 'Artist', cover: '' };
const wrapper = ({ children }: { children: ReactNode }) => (
  <PlaybackProvider>{children}</PlaybackProvider>
);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sleep timer in PlaybackContext (#589)', () => {
  it('fades the volume over the last ten seconds, then pauses', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    act(() => result.current.playTracks([track]));
    act(() => result.current.setSleepTimer({ kind: 'duration', minutes: 1 }));

    act(() => vi.advanceTimersByTime(55_000));
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.sleepFade).toBeCloseTo(0.5, 1);

    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.sleepTimer).toBeNull();
    expect(result.current.sleepFade).toBe(1);
  });

  it('keeps full volume until the fade window starts', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    act(() => result.current.playTracks([track]));
    act(() => result.current.setSleepTimer({ kind: 'duration', minutes: 15 }));
    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(result.current.sleepFade).toBe(1);
    expect(result.current.sleepTimer).toMatchObject({ kind: 'duration' });
  });

  it('cancelling restores volume and leaves playback running', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    act(() => result.current.playTracks([track]));
    act(() => result.current.setSleepTimer({ kind: 'duration', minutes: 1 }));
    act(() => vi.advanceTimersByTime(55_000));
    act(() => result.current.cancelSleepTimer());
    expect(result.current.sleepTimer).toBeNull();
    expect(result.current.sleepFade).toBe(1);

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.isPlaying).toBe(true);
  });

  it('"End of track" waits for the engine to call expireSleepTimer', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    act(() => result.current.playTracks([track]));
    act(() => result.current.setSleepTimer({ kind: 'end-of-track' }));

    act(() => vi.advanceTimersByTime(60 * 60_000));
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.sleepTimer).toEqual({ kind: 'end-of-track' });

    act(() => result.current.expireSleepTimer());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.sleepTimer).toBeNull();
  });

  it('does not persist the timer across a reload', () => {
    const { result } = renderHook(() => usePlayback(), { wrapper });
    act(() => result.current.setSleepTimer({ kind: 'duration', minutes: 30 }));
    const stored = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.getItem(localStorage.key(index) ?? '')
    );
    expect(stored.join('')).not.toContain('endsAt');
  });
});

describe('SleepTimerMenu', () => {
  it('reports the chosen option', () => {
    const onSelect = vi.fn();
    render(<SleepTimerMenu sleepTimer={null} onCancel={vi.fn()} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '30 minutes' }));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'duration', minutes: 30 });
  });

  it('shows the countdown for an active timer and can cancel it', () => {
    const onCancel = vi.fn();
    render(
      <SleepTimerMenu
        sleepTimer={{ kind: 'duration', endsAt: Date.now() + 15 * 60_000 }}
        onCancel={onCancel}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('Stops in 15:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('describes an end-of-track timer', () => {
    render(
      <SleepTimerMenu sleepTimer={{ kind: 'end-of-track' }} onCancel={vi.fn()} onSelect={vi.fn()} />
    );
    expect(screen.getByText('Stops at the end of this track')).toBeInTheDocument();
  });
});
