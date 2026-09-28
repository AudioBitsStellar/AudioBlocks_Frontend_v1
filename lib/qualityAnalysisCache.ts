/**
 * Quality Analysis Result Cache (#422)
 *
 * Caches quality analysis results per track to avoid redundant NVIDIA API calls.
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative for AudioBlock.
 *
 * Features:
 * - In-memory LRU-style cache with configurable size
 * - TTL-based expiration for stale results
 * - Track-based keying for reliable lookups
 * - Cache statistics for monitoring
 */

import { type SongQualityAssessment } from './songQualityFilter';

export interface CachedQualityResult {
  /** The quality assessment result */
  assessment: SongQualityAssessment;
  /** When this result was cached (milliseconds since epoch) */
  cachedAt: number;
  /** Track identifier used as cache key */
  trackId: string;
  /** Optional metadata hash for additional validation */
  metadataHash?: string;
}

export interface QualityCacheOptions {
  /** Maximum number of entries to keep in cache (default: 1000) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 24 hours) */
  ttlMs?: number;
}

export interface QualityCacheStats {
  /** Total cache hit count */
  hits: number;
  /** Total cache miss count */
  misses: number;
  /** Current number of cached entries */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Hit rate percentage */
  hitRate: number;
}

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * In-memory cache for quality analysis results.
 * Uses LRU eviction when the cache exceeds maxSize.
 */
export class QualityAnalysisCache {
  private cache: Map<string, CachedQualityResult>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private hits: number;
  private misses: number;

  constructor(options: QualityCacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate a cache key from track metadata.
   * Uses trackId and optional metadata hash for uniqueness.
   */
  private generateKey(trackId: string, metadataHash?: string): string {
    return metadataHash ? `${trackId}:${metadataHash}` : trackId;
  }

  /**
   * Check if a cached result is still valid (not expired).
   */
  private isValid(result: CachedQualityResult): boolean {
    const age = Date.now() - result.cachedAt;
    return age < this.ttlMs;
  }

  /**
   * Evict the oldest entry when cache is at capacity.
   * Map maintains insertion order, so the first entry is the oldest.
   */
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * Get a cached quality assessment result.
   * Returns null if not found or expired.
   */
  get(trackId: string, metadataHash?: string): SongQualityAssessment | null {
    const key = this.generateKey(trackId, metadataHash);
    const cached = this.cache.get(key);

    if (!cached) {
      this.misses++;
      return null;
    }

    if (!this.isValid(cached)) {
      // Expired entry, remove it
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (LRU: most recently accessed)
    this.cache.delete(key);
    this.cache.set(key, cached);
    this.hits++;

    return cached.assessment;
  }

  /**
   * Store a quality assessment result in the cache.
   */
  set(trackId: string, assessment: SongQualityAssessment, metadataHash?: string): void {
    const key = this.generateKey(trackId, metadataHash);

    // Remove old entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const cached: CachedQualityResult = {
      assessment,
      cachedAt: Date.now(),
      trackId,
      metadataHash,
    };

    this.cache.set(key, cached);
  }

  /**
   * Check if a result exists in the cache (without retrieving it).
   */
  has(trackId: string, metadataHash?: string): boolean {
    const key = this.generateKey(trackId, metadataHash);
    const cached = this.cache.get(key);
    return cached != null && this.isValid(cached);
  }

  /**
   * Remove a specific entry from the cache.
   */
  delete(trackId: string, metadataHash?: string): boolean {
    const key = this.generateKey(trackId, metadataHash);
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): QualityCacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Remove all expired entries from the cache.
   * Useful for periodic cleanup.
   */
  prune(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [key, result] of this.cache.entries()) {
      const age = now - result.cachedAt;
      if (age >= this.ttlMs) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

// Singleton instance for application-wide use
let globalCache: QualityAnalysisCache | null = null;

/**
 * Get or create the global quality analysis cache instance.
 */
export function getQualityCache(options?: QualityCacheOptions): QualityAnalysisCache {
  if (!globalCache) {
    globalCache = new QualityAnalysisCache(options);
  }
  return globalCache;
}

/**
 * Reset the global cache instance (primarily for testing).
 */
export function resetQualityCache(): void {
  globalCache = null;
}
