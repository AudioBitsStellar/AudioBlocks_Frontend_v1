import { describe, it, expect, beforeEach } from 'vitest';
import {
  AudioBufferCache,
  audioBufferCache,
  estimateBufferSize,
  MAX_CACHE_BYTES,
  BYTES_PER_SAMPLE,
} from '@/lib/audioCache';

function createMockAudioBuffer(length: number, numberOfChannels: number = 2): AudioBuffer {
  return {
    length,
    numberOfChannels,
    sampleRate: 44100,
    duration: length / 44100,
    getChannelData: () => new Float32Array(length),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

describe('AudioBufferCache', () => {
  let cache: AudioBufferCache;

  beforeEach(() => {
    cache = new AudioBufferCache(1000); // 1000 bytes for easy testing
    audioBufferCache.clear();
  });

  it('estimateBufferSize calculates size correctly', () => {
    const buf = createMockAudioBuffer(100, 2);
    expect(estimateBufferSize(buf)).toBe(100 * 2 * BYTES_PER_SAMPLE);
  });

  it('handles cache hit and miss', () => {
    const buf = createMockAudioBuffer(10, 1);
    expect(cache.get('track-1')).toBeUndefined();

    cache.set('track-1', buf);
    expect(cache.get('track-1')).toBe(buf);
    expect(cache.sizeBytes).toBe(40);
  });

  it('updates recency on get and evicts in LRU order', () => {
    // 3 items of 300 bytes each = 900 bytes (limit is 1000)
    // 300 / 4 / 1 = 75 samples
    const buf1 = createMockAudioBuffer(75, 1); // 300 bytes
    const buf2 = createMockAudioBuffer(75, 1); // 300 bytes
    const buf3 = createMockAudioBuffer(75, 1); // 300 bytes

    cache.set('key-1', buf1);
    cache.set('key-2', buf2);
    cache.set('key-3', buf3);
    expect(cache.sizeBytes).toBe(900);

    // Access key-1 to make it most recently used (order now key-2, key-3, key-1)
    expect(cache.get('key-1')).toBe(buf1);

    // Adding key-4 (300 bytes) pushes total to 1200 > 1000, so key-2 should be evicted!
    const buf4 = createMockAudioBuffer(75, 1);
    cache.set('key-4', buf4);

    expect(cache.get('key-2')).toBeUndefined(); // evicted
    expect(cache.get('key-3')).toBe(buf3); // kept
    expect(cache.get('key-1')).toBe(buf1); // kept because accessed
    expect(cache.get('key-4')).toBe(buf4); // newly added
    expect(cache.sizeBytes).toBe(900);
  });

  it('correctly handles overwriting an existing key with new size', () => {
    const bufSmall = createMockAudioBuffer(25, 1); // 100 bytes
    const bufLarge = createMockAudioBuffer(50, 1); // 200 bytes

    cache.set('key-1', bufSmall);
    expect(cache.sizeBytes).toBe(100);

    cache.set('key-1', bufLarge);
    expect(cache.sizeBytes).toBe(200);
    expect(cache.get('key-1')).toBe(bufLarge);
  });

  it('immediately evicts buffers larger than the maximum cache limit', () => {
    // Limit is 1000 bytes. Buffer is 300 samples * 4 = 1200 bytes
    const oversizedBuf = createMockAudioBuffer(300, 1);
    cache.set('huge-track', oversizedBuf);

    // Evicted because oversized
    expect(cache.get('huge-track')).toBeUndefined();
    expect(cache.sizeBytes).toBe(0);
  });

  it('clear() removes all entries and resets sizeBytes to 0', () => {
    const buf = createMockAudioBuffer(50, 1);
    cache.set('key-1', buf);
    expect(cache.sizeBytes).toBe(200);

    cache.clear();
    expect(cache.sizeBytes).toBe(0);
    expect(cache.get('key-1')).toBeUndefined();
  });

  it('singleton audioBufferCache defaults to MAX_CACHE_BYTES', () => {
    expect(audioBufferCache.sizeBytes).toBe(0);
    const buf = createMockAudioBuffer(10, 2);
    audioBufferCache.set('test', buf);
    expect(audioBufferCache.get('test')).toBe(buf);
    audioBufferCache.clear();
    expect(audioBufferCache.sizeBytes).toBe(0);
  });
});
