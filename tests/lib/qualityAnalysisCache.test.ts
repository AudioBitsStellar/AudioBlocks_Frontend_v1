/**
 * Unit tests for Quality Analysis Cache (#422, #428)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  QualityAnalysisCache,
  getQualityCache,
  resetQualityCache,
} from '../../lib/qualityAnalysisCache';
import { type SongQualityAssessment } from '../../lib/songQualityFilter';

describe('QualityAnalysisCache', () => {
  let cache: QualityAnalysisCache;

  beforeEach(() => {
    cache = new QualityAnalysisCache({ maxSize: 5, ttlMs: 1000 });
  });

  describe('basic operations', () => {
    it('should store and retrieve assessment results', () => {
      const assessment: SongQualityAssessment = {
        score: 85,
        verdict: 'approved',
        reasons: ['Good quality'],
        model: 'test-model',
      };

      cache.set('track-1', assessment);
      const result = cache.get('track-1');

      expect(result).toEqual(assessment);
    });

    it('should return null for non-existent entries', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should support metadata hash in cache key', () => {
      const assessment: SongQualityAssessment = {
        score: 90,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      };

      cache.set('track-1', assessment, 'hash-123');
      
      expect(cache.get('track-1', 'hash-123')).toEqual(assessment);
      expect(cache.get('track-1', 'hash-456')).toBeNull();
      expect(cache.get('track-1')).toBeNull();
    });

    it('should check if entry exists without retrieving it', () => {
      const assessment: SongQualityAssessment = {
        score: 75,
        verdict: 'review',
        reasons: [],
        model: 'test',
      };

      cache.set('track-1', assessment);

      expect(cache.has('track-1')).toBe(true);
      expect(cache.has('track-2')).toBe(false);
    });

    it('should delete specific entries', () => {
      const assessment: SongQualityAssessment = {
        score: 80,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      };

      cache.set('track-1', assessment);
      expect(cache.has('track-1')).toBe(true);

      const deleted = cache.delete('track-1');
      expect(deleted).toBe(true);
      expect(cache.has('track-1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('track-1', { score: 80, verdict: 'approved', reasons: [], model: 'test' });
      cache.set('track-2', { score: 85, verdict: 'approved', reasons: [], model: 'test' });

      cache.clear();

      expect(cache.get('track-1')).toBeNull();
      expect(cache.get('track-2')).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxSize is reached', () => {
      for (let i = 1; i <= 6; i++) {
        cache.set(`track-${i}`, {
          score: 80 + i,
          verdict: 'approved',
          reasons: [],
          model: 'test',
        });
      }

      // First entry should be evicted
      expect(cache.get('track-1')).toBeNull();
      expect(cache.get('track-6')).not.toBeNull();
      expect(cache.getStats().size).toBe(5);
    });

    it('should move accessed entries to end (most recent)', () => {
      // Fill cache
      for (let i = 1; i <= 5; i++) {
        cache.set(`track-${i}`, {
          score: 80,
          verdict: 'approved',
          reasons: [],
          model: 'test',
        });
      }

      // Access track-1 (moves it to end)
      cache.get('track-1');

      // Add new entry (should evict track-2, not track-1)
      cache.set('track-6', {
        score: 85,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      });

      expect(cache.get('track-1')).not.toBeNull();
      expect(cache.get('track-2')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return null for expired entries', () => {
      const assessment: SongQualityAssessment = {
        score: 85,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      };

      cache.set('track-1', assessment);
      expect(cache.get('track-1')).toEqual(assessment);

      // Advance time beyond TTL
      vi.advanceTimersByTime(1500);

      expect(cache.get('track-1')).toBeNull();
    });

    it('should remove expired entries during has() check', () => {
      cache.set('track-1', {
        score: 85,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      });

      expect(cache.has('track-1')).toBe(true);

      vi.advanceTimersByTime(1500);

      expect(cache.has('track-1')).toBe(false);
    });

    it('should prune expired entries', () => {
      cache.set('track-1', { score: 80, verdict: 'approved', reasons: [], model: 'test' });
      
      vi.advanceTimersByTime(500);
      cache.set('track-2', { score: 85, verdict: 'approved', reasons: [], model: 'test' });

      vi.advanceTimersByTime(600); // track-1 expired, track-2 not expired

      const pruned = cache.prune();
      expect(pruned).toBe(1);
      expect(cache.has('track-1')).toBe(false);
      expect(cache.has('track-2')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('track-1', {
        score: 85,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      });

      cache.get('track-1'); // hit
      cache.get('track-1'); // hit
      cache.get('track-2'); // miss
      cache.get('track-3'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(50);
    });

    it('should report cache size and max size', () => {
      cache.set('track-1', { score: 80, verdict: 'approved', reasons: [], model: 'test' });
      cache.set('track-2', { score: 85, verdict: 'approved', reasons: [], model: 'test' });

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });

    it('should calculate correct hit rate', () => {
      cache.set('track-1', { score: 80, verdict: 'approved', reasons: [], model: 'test' });

      for (let i = 0; i < 7; i++) {
        cache.get('track-1'); // 7 hits
      }

      for (let i = 0; i < 3; i++) {
        cache.get('track-unknown'); // 3 misses
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(70);
    });

    it('should reset stats after clear', () => {
      cache.set('track-1', { score: 80, verdict: 'approved', reasons: [], model: 'test' });
      cache.get('track-1');
      cache.get('track-2');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('global cache singleton', () => {
    beforeEach(() => {
      resetQualityCache();
    });

    it('should return the same instance on multiple calls', () => {
      const cache1 = getQualityCache();
      const cache2 = getQualityCache();

      expect(cache1).toBe(cache2);
    });

    it('should persist data across getInstance calls', () => {
      const cache1 = getQualityCache();
      cache1.set('track-1', {
        score: 85,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      });

      const cache2 = getQualityCache();
      const result = cache2.get('track-1');

      expect(result).not.toBeNull();
      expect(result?.score).toBe(85);
    });

    it('should reset global instance', () => {
      const cache1 = getQualityCache();
      cache1.set('track-1', {
        score: 85,
        verdict: 'approved',
        reasons: [],
        model: 'test',
      });

      resetQualityCache();

      const cache2 = getQualityCache();
      expect(cache2).not.toBe(cache1);
      expect(cache2.get('track-1')).toBeNull();
    });

    it('should accept custom options on first initialization', () => {
      const cache = getQualityCache({ maxSize: 100, ttlMs: 5000 });
      const stats = cache.getStats();

      expect(stats.maxSize).toBe(100);
    });
  });
});
