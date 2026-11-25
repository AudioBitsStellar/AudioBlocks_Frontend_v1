/**
 * #110: LRU + size-eviction behaviour for the decoded AudioBuffer cache.
 *
 * The module exports a module-level singleton, which these tests clear
 * between cases. Each `fakeBuffer(sampleCount)` builds a stand-in whose
 * `estimateBufferSize` matches `sampleCount * channels * 4` bytes so we can
 * size cases precisely against the 50 MB cap without needing a real
 * Web Audio decoder (unavailable in jsdom).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { audioBufferCache } from '@/lib/audioCache';

const BYTES_PER_SAMPLE = 4;
const MB = 1024 * 1024;

type AudioBufferShape = Pick<AudioBuffer, 'length' | 'numberOfChannels'>;

function fakeBuffer(sizeMb: number, channels = 2): AudioBuffer {
  // Pick a sample count that yields exactly `sizeMb * MB` bytes per the
  // cache's `estimateBufferSize` formula (length * channels * 4).
  const totalBytes = Math.round(sizeMb * MB);
  const length = totalBytes / (channels * BYTES_PER_SAMPLE);
  const shape: AudioBufferShape = { length, numberOfChannels: channels };
  return shape as AudioBuffer;
}

afterEach(() => {
  audioBufferCache.clear();
});

describe('audioBufferCache (#110)', () => {
  it('returns the stored buffer on hit and undefined on miss', () => {
    const buf = fakeBuffer(1);
    audioBufferCache.set('a', buf);
    expect(audioBufferCache.get('a')).toBe(buf);
    expect(audioBufferCache.get('missing')).toBeUndefined();
  });

  it('updates recency on get: the most recently read entry survives eviction', () => {
    audioBufferCache.set('a', fakeBuffer(20));
    audioBufferCache.set('b', fakeBuffer(20));
    // Touch `a` to mark it as more-recently-used than `b`.
    audioBufferCache.get('a');
    // Insert 20 MB more: total 60 MB exceeds the 50 MB cap by 10 MB, so the
    // least-recently-used entry (`b`) is evicted, not `a`.
    audioBufferCache.set('c', fakeBuffer(20));
    expect(audioBufferCache.get('a')).toBeDefined();
    expect(audioBufferCache.get('c')).toBeDefined();
    expect(audioBufferCache.get('b')).toBeUndefined();
  });

  it('evicts oldest entries until the 50 MB cap is respected', () => {
    for (let i = 0; i < 4; i++) audioBufferCache.set(`k${i}`, fakeBuffer(20));
    // 4 x 20 MB = 80 MB. Cap is 50 MB, so at most 2 entries can survive
    // (40 MB fits, 60 MB would exceed).
    expect(audioBufferCache.sizeBytes).toBeLessThanOrEqual(50 * MB);
    expect(audioBufferCache.get('k0')).toBeUndefined();
    expect(audioBufferCache.get('k1')).toBeUndefined();
    expect(audioBufferCache.get('k2')).toBeDefined();
    expect(audioBufferCache.get('k3')).toBeDefined();
  });

  it('replacing an existing key keeps one copy and does not double-count its size', () => {
    audioBufferCache.set('a', fakeBuffer(10));
    audioBufferCache.set('a', fakeBuffer(5));
    expect(audioBufferCache.sizeBytes).toBe(5 * MB);
  });

  it('clear() empties the cache and resets the running byte total', () => {
    audioBufferCache.set('a', fakeBuffer(10));
    audioBufferCache.set('b', fakeBuffer(10));
    audioBufferCache.clear();
    expect(audioBufferCache.sizeBytes).toBe(0);
    expect(audioBufferCache.get('a')).toBeUndefined();
    expect(audioBufferCache.get('b')).toBeUndefined();
  });
});
