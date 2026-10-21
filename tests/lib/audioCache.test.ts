import { beforeEach, describe, expect, it } from 'vitest';
import { audioBufferCache } from '@/lib/audioCache';

/**
 * `lib/audioCache.ts` is a 50MB LRU cache of decoded AudioBuffers. It exports
 * only a shared singleton, so the tests drive it through the public surface
 * (`set`/`get`/`clear`/`sizeBytes`) and reset it between cases. The fake
 * buffer only needs the two fields `estimateBufferSize` reads: `length`
 * (samples) and `numberOfChannels`; each byte budget is 4 bytes/sample/channel.
 */

const BYTES_PER_SAMPLE = 4;

type FakeAudioBuffer = { length: number; numberOfChannels: number };

function bufferOf(length: number, channels = 1): FakeAudioBuffer {
  return { length, numberOfChannels: channels } as unknown as AudioBuffer;
}

function bytesFor(buf: FakeAudioBuffer): number {
  return buf.length * buf.numberOfChannels * BYTES_PER_SAMPLE;
}

// Size presets (bytes), picked against the 50MB (52_428_800) cap.
const S10M = bufferOf(2_500_000); // 10MB
const S20M = bufferOf(5_000_000); // 20MB
const S30M = bufferOf(7_500_000); // 30MB
const S40M = bufferOf(10_000_000); // 40MB
const OVERSIZED = bufferOf(14_000_000); // 56MB — larger than the whole cap

describe('audioBufferCache (LRU)', () => {
  beforeEach(() => {
    audioBufferCache.clear();
  });

  it('returns the stored buffer on a hit and undefined on a miss', () => {
    audioBufferCache.set('x', S10M);
    expect(audioBufferCache.get('x')).toBe(S10M);
    expect(audioBufferCache.get('missing')).toBeUndefined();
  });

  it('tracks total bytes as entries are added', () => {
    audioBufferCache.set('a', S20M);
    expect(audioBufferCache.sizeBytes).toBe(bytesFor(S20M));
    audioBufferCache.set('b', S30M);
    expect(audioBufferCache.sizeBytes).toBe(bytesFor(S20M) + bytesFor(S30M));
  });

  it('evicts the least-recently-used entries first when over the cap', () => {
    // 20 + 20 + 20 = 60MB > 50MB, so the oldest (`a`) must be evicted.
    audioBufferCache.set('a', S20M);
    audioBufferCache.set('b', S20M);
    audioBufferCache.set('c', S20M);

    expect(audioBufferCache.get('a')).toBeUndefined();
    expect(audioBufferCache.get('b')).toBe(S20M);
    expect(audioBufferCache.get('c')).toBe(S20M);
    expect(audioBufferCache.sizeBytes).toBe(bytesFor(S20M) + bytesFor(S20M));
  });

  it('a get() marks the entry as recently used, protecting it from eviction', () => {
    audioBufferCache.set('a', S20M);
    audioBufferCache.set('b', S20M);

    // Touch `a` so `b` becomes the least-recently-used entry.
    expect(audioBufferCache.get('a')).toBe(S20M);

    // 20 + 20 + 20 = 60MB: the LRU entry is now `b`, not `a`.
    audioBufferCache.set('c', S20M);

    expect(audioBufferCache.get('b')).toBeUndefined();
    expect(audioBufferCache.get('a')).toBe(S20M);
    expect(audioBufferCache.get('c')).toBe(S20M);
  });

  it('subtracts the previous size before counting an overwrite of an existing key', () => {
    audioBufferCache.set('k', S40M);
    expect(audioBufferCache.sizeBytes).toBe(bytesFor(S40M));

    // Overwrite the same key with a smaller buffer; total must drop, not grow.
    audioBufferCache.set('k', S10M);
    expect(audioBufferCache.sizeBytes).toBe(bytesFor(S10M));
    expect(audioBufferCache.get('k')).toBe(S10M);
  });

  it('clears every entry and resets sizeBytes', () => {
    audioBufferCache.set('a', S20M);
    audioBufferCache.set('b', S30M);
    expect(audioBufferCache.sizeBytes).toBe(bytesFor(S20M) + bytesFor(S30M));

    audioBufferCache.clear();
    expect(audioBufferCache.sizeBytes).toBe(0);
    expect(audioBufferCache.get('a')).toBeUndefined();
    expect(audioBufferCache.get('b')).toBeUndefined();
  });

  it('immediately evicts a single buffer that is larger than the whole cap', () => {
    // Documented behaviour: an entry that alone exceeds MAX_CACHE_BYTES is
    // inserted and then evicted on the same call, leaving the cache empty.
    // (This is intentional — a buffer bigger than the cache budget is not
    // cacheable at all — and this test pins that decision down.)
    audioBufferCache.set('big', OVERSIZED);
    expect(audioBufferCache.get('big')).toBeUndefined();
    expect(audioBufferCache.sizeBytes).toBe(0);
  });
});
