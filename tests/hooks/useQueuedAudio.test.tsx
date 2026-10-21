import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
import { useQueuedAudio } from '@/hooks/useQueuedAudio';
import { attachAudioSource } from '@/lib/hlsPlayer';
const { sources } = vi.hoisted(() => ({
  sources: [] as {
    audio: HTMLAudioElement;
    url: string;
    options: { prefetch?: boolean; onReady?: () => void };
    destroy: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    setMaxBitrate: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock('@/lib/hlsPlayer', () => ({
  attachAudioSource: vi.fn((audio, url, options) => {
    audio.src = url;
    const source = {
      audio,
      url,
      options,
      destroy: vi.fn(() => audio.removeAttribute('src')),
      resume: vi.fn(),
      setMaxBitrate: vi.fn(),
    };
    sources.push(source);
    return source;
  }),
}));
function Harness() {
  const { deckARef, deckBRef } = useQueuedAudio();
  const { playTracks, addToQueue, next, playlist, currentIndex } = usePlayback();
  return (
    <>
      <audio ref={deckARef} data-testid="a" />
      <audio ref={deckBRef} data-testid="b" />
      <span>{playlist[currentIndex]?.title}</span>
      <button
        onClick={() => {
          playTracks([{ id: 'one', title: 'One', artist: '', cover: '' }]);
          addToQueue({ id: 'two', title: 'Two', artist: '', cover: '' });
        }}
      >
        Start
      </button>
      <button
        onClick={() => addToQueue({ id: 'three', title: 'Three', artist: '', cover: '' }, 'next')}
      >
        Change queue
      </button>
      <button onClick={next}>Skip</button>
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  sources.length = 0;
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE', 'event');
  vi.stubEnv('NEXT_PUBLIC_PLAYBACK_EVENT_URL', 'https://api.example/plays/:id');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function start() {
  render(
    <PlaybackProvider>
      <Harness />
    </PlaybackProvider>
  );
  fireEvent.click(screen.getByText('Start'));
  const primary = screen.getByTestId('a') as HTMLAudioElement;
  Object.defineProperty(primary, 'duration', { configurable: true, value: 30 });
  Object.defineProperty(primary, 'currentTime', { configurable: true, writable: true, value: 0 });
  return primary;
}
describe('queued audio prefetch', () => {
  it('waits until 20 seconds remain, warms the queue head, and promotes the same element', () => {
    const primary = start();
    fireEvent.loadedMetadata(primary);
    expect(sources.filter((source) => source.options.prefetch)).toHaveLength(0);
    primary.currentTime = 11;
    fireEvent.timeUpdate(primary);
    const warm = sources.find((source) => source.options.prefetch)!;
    expect(warm.url).toContain('/api/song/stream/two');
    act(() => warm.options.onReady?.());
    const loadCount = vi.mocked(attachAudioSource).mock.calls.length;
    fireEvent.ended(primary);
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(warm.resume).toHaveBeenCalledOnce();
    expect(vi.mocked(attachAudioSource).mock.calls.length).toBe(loadCount);
    expect(warm.destroy).not.toHaveBeenCalled();
  });
  it('warms short tracks immediately after metadata and cancels on queue changes and skips', () => {
    const primary = start();
    Object.defineProperty(primary, 'duration', { value: 10 });
    fireEvent.loadedMetadata(primary);
    const warm = sources.find((source) => source.options.prefetch)!;
    fireEvent.click(screen.getByText('Change queue'));
    expect(warm.destroy).toHaveBeenCalled();
    expect(sources.at(-1)?.url).toContain('/three');
    fireEvent.click(screen.getByText('Skip'));
    expect(warm.destroy).toHaveBeenCalled();
  });
  it('does not prefetch with a request-counting backend', () => {
    vi.stubEnv('NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE', 'request');
    const primary = start();
    primary.currentTime = 15;
    fireEvent.timeUpdate(primary);
    expect(sources.some((source) => source.options.prefetch)).toBe(false);
  });
  it('respects application data saver and destroys a warm source on unmount', () => {
    localStorage.setItem('audioblocks_data_saver', 'true');
    const primary = start();
    primary.currentTime = 15;
    fireEvent.timeUpdate(primary);
    expect(sources.some((source) => source.options.prefetch)).toBe(false);
    localStorage.setItem('audioblocks_data_saver', 'false');
    act(() => window.dispatchEvent(new Event('audioblocks:data-saver')));
    expect(sources.some((source) => source.options.prefetch)).toBe(true);
    localStorage.setItem('audioblocks_data_saver', 'true');
    act(() => window.dispatchEvent(new Event('audioblocks:data-saver')));
    expect(
      sources
        .filter((source) => source.options.prefetch)
        .every((source) => source.destroy.mock.calls.length > 0)
    ).toBe(true);
  });
});
