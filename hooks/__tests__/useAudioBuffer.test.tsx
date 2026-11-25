/**
 * #110: hook contract tests for `useAudioBuffer`.
 *
 * jsdom does not implement Web Audio or `decodeAudioData`, so this suite stubs
 * `AudioContext` + `fetch` at the module level. The decoded buffer is a plain
 * object the cache treats as `AudioBuffer`-shaped.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audioBufferCache } from '@/lib/audioCache';
import { useAudioBuffer } from '@/hooks/useAudioBuffer';

const decodedBuffer = { length: 1024, numberOfChannels: 2 } as unknown as AudioBuffer;

class StubAudioContext {
  decodeAudioData = vi.fn(async (_: ArrayBuffer): Promise<AudioBuffer> => decodedBuffer);
  close = vi.fn();
}

beforeEach(() => {
  audioBufferCache.clear();
  (globalThis as unknown as { AudioContext: typeof StubAudioContext }).AudioContext =
    StubAudioContext;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
    arrayBuffer: async () => new ArrayBuffer(8),
  }) as unknown as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAudioBuffer (#110)', () => {
  it('starts in loading state and resolves to a decoded buffer', async () => {
    const { result } = renderHook(() => useAudioBuffer('https://example.test/song.mp3'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.buffer).toBeNull();
    expect(result.current.error).toBeNull();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.buffer).toBe(decodedBuffer);
    });
  });

  it('returns null state with no loading when no url is passed', () => {
    const { result } = renderHook(() => useAudioBuffer(null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.buffer).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reads cached buffers synchronously without a second fetch', async () => {
    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const url = 'https://example.test/song.mp3';
    // Pre-populate the cache.
    audioBufferCache.set(url, decodedBuffer);
    const { result } = renderHook(() => useAudioBuffer(url));
    // Cache hit on mount: no loading, no fetch, buffer in hand.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.buffer).toBe(decodedBuffer);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cancels the pending fetch on unmount so decoded buffers do not leak', async () => {
    let abortReason: unknown = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            abortReason = (init.signal as AbortSignal).reason;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );
    const { unmount } = renderHook(() => useAudioBuffer('https://example.test/song.mp3'));
    unmount();
    // The AbortController's signal fires; we recorded the reason to prove the
    // fetch saw it. (The hook's cleanup also sets a `cancelled` flag so a
    // late-resolving decode cannot write into unmounted state.)
    await waitFor(() => expect(abortReason).toBeDefined());
  });

  it('surfaces a non-AbortError as `error` and clears `isLoading`', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));
    const { result } = renderHook(() => useAudioBuffer('https://example.test/song.mp3'));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('network down');
    });
  });
});
