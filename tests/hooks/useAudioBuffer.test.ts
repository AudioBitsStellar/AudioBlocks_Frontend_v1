import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { audioBufferCache } from '@/lib/audioCache';

function makeFakeAudioBuffer(length = 1000, numberOfChannels = 2): AudioBuffer {
  return { length, numberOfChannels, sampleRate: 44100, duration: length / 44100 } as unknown as AudioBuffer;
}

// The hook keeps a module-level AudioContext singleton (mirrors real usage:
// browsers cap concurrent contexts). Reset modules per test so each test's
// AudioContext stub is the one actually picked up.
async function importUseAudioBuffer() {
  vi.resetModules();
  const mod = await import('@/hooks/useAudioBuffer');
  return mod.useAudioBuffer;
}

beforeEach(() => {
  audioBufferCache.clear();

  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response),
    ),
  );

  vi.stubGlobal(
    'AudioContext',
    class {
      decodeAudioData = vi.fn(() => Promise.resolve(makeFakeAudioBuffer()));
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAudioBuffer', () => {
  it('starts with isLoading true and resolves a decoded buffer', async () => {
    const useAudioBuffer = await importUseAudioBuffer();
    const { result } = renderHook(() => useAudioBuffer('/song.mp3'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.buffer).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('caches the decoded buffer so a second mount skips fetch', async () => {
    const useAudioBuffer = await importUseAudioBuffer();
    const { result, unmount } = renderHook(() => useAudioBuffer('/song.mp3'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    unmount();

    const fetchSpy = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchSpy.mockClear();

    const { result: second } = renderHook(() => useAudioBuffer('/song.mp3'));
    expect(second.current.isLoading).toBe(false);
    expect(second.current.buffer).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null buffer and no loading state when url is falsy', async () => {
    const useAudioBuffer = await importUseAudioBuffer();
    const { result } = renderHook(() => useAudioBuffer(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.buffer).toBeNull();
  });

  it('surfaces a decode error', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = vi.fn(() => Promise.reject(new Error('bad data')));
      },
    );

    const useAudioBuffer = await importUseAudioBuffer();
    const { result } = renderHook(() => useAudioBuffer('/broken.mp3'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.buffer).toBeNull();
  });

  it('evicts least-recently-used entries once the cache exceeds 50MB', () => {
    // 4.5M samples * 2 channels * 4 bytes = 36MB per buffer — under the cap alone,
    // but two together exceed it and force eviction of the older one.
    const big = makeFakeAudioBuffer(4_500_000, 2);
    audioBufferCache.set('a', big);
    audioBufferCache.set('b', big);

    expect(audioBufferCache.get('a')).toBeUndefined();
    expect(audioBufferCache.get('b')).not.toBeUndefined();
  });
});
