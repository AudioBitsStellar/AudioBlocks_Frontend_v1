export const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50MB
export const BYTES_PER_SAMPLE = 4; // Float32 per channel sample

export interface CacheEntry {
  buffer: AudioBuffer;
  size: number;
}

export function estimateBufferSize(buffer: AudioBuffer): number {
  return buffer.length * buffer.numberOfChannels * BYTES_PER_SAMPLE;
}

/**
 * LRU cache for decoded AudioBuffers, capped at 50MB total. Insertion order
 * in the underlying Map doubles as recency order: `get` re-inserts the hit
 * key at the end, so the least-recently-used entry is always first.
 *
 * Oversized-entry behaviour:
 * Buffers whose estimated size strictly exceeds `maxCacheBytes` are immediately
 * evicted in `evictUntilWithinLimit`, so they are not retained in the cache.
 */
export class AudioBufferCache {
  private cache = new Map<string, CacheEntry>();
  private totalBytes = 0;
  private maxBytes: number;

  constructor(maxBytes: number = MAX_CACHE_BYTES) {
    this.maxBytes = maxBytes;
  }

  get(key: string): AudioBuffer | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.buffer;
  }

  set(key: string, buffer: AudioBuffer): void {
    const existing = this.cache.get(key);
    if (existing) {
      this.totalBytes -= existing.size;
      this.cache.delete(key);
    }

    const size = estimateBufferSize(buffer);
    this.cache.set(key, { buffer, size });
    this.totalBytes += size;

    this.evictUntilWithinLimit();
  }

  private evictUntilWithinLimit(): void {
    for (const key of this.cache.keys()) {
      if (this.totalBytes <= this.maxBytes) break;
      const entry = this.cache.get(key);
      if (!entry) continue;
      this.cache.delete(key);
      this.totalBytes -= entry.size;
    }
  }

  clear(): void {
    this.cache.clear();
    this.totalBytes = 0;
  }

  get sizeBytes(): number {
    return this.totalBytes;
  }
}

export const audioBufferCache = new AudioBufferCache();
