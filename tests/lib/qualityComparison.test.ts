import { describe, expect, it } from 'vitest';
import {
  compareQualityAnalyses,
  getQualityComparisonSummary,
  QUALITY_METRIC_KEYS,
  type QualityAnalysis,
} from '@/lib/qualityComparison';

const buildAnalysis = (
  overrides: Partial<QualityAnalysis> = {}
): QualityAnalysis => ({
  trackId: 'track-1',
  variant: 'original',
  score: 72,
  metrics: { clarity: 80, dynamicRange: 60, noiseFloor: 70, distortion: 90 },
  ...overrides,
});

describe('qualityComparison', () => {
  describe('compareQualityAnalyses', () => {
    it('reports an improvement when the remaster scores higher', () => {
      const comparison = compareQualityAnalyses(
        buildAnalysis(),
        buildAnalysis({ variant: 'remastered', score: 76, metrics: { clarity: 88 } })
      );

      expect(comparison.verdict).toBe('improved');
      expect(comparison.scoreDelta).toBe(4);
      expect(comparison.originalTrackId).toBe('track-1');
      expect(comparison.remasteredTrackId).toBe('track-1');
      expect(comparison.summary).toBe(
        'Remaster improved overall quality by 4 points (72 → 76).'
      );
      expect(comparison.metrics).toHaveLength(QUALITY_METRIC_KEYS.length);
      expect(comparison.metrics.find((m) => m.metric === 'clarity')).toEqual({
        metric: 'clarity',
        original: 80,
        remastered: 88,
        delta: 8,
      });
    });

    it('reports a regression when the remaster scores lower', () => {
      const comparison = compareQualityAnalyses(
        buildAnalysis(),
        buildAnalysis({ variant: 'remastered', score: 60 })
      );

      expect(comparison.verdict).toBe('regressed');
      expect(comparison.scoreDelta).toBe(-12);
      expect(comparison.summary).toBe(
        'Remaster scored 12 points lower than the original upload (72 → 60).'
      );
    });

    it('treats deltas within the tolerance as unchanged', () => {
      const comparison = compareQualityAnalyses(
        buildAnalysis(),
        buildAnalysis({ variant: 'remastered', score: 72.5 })
      );

      expect(comparison.verdict).toBe('unchanged');
      expect(comparison.scoreDelta).toBe(0.5);
      expect(comparison.summary).toBe(
        "Remaster matched the original upload's quality (72 → 72.5)."
      );
    });

    it('uses the unchanged summary copy for a matching score', () => {
      const comparison = compareQualityAnalyses(
        buildAnalysis(),
        buildAnalysis({ variant: 'remastered' })
      );

      expect(comparison.verdict).toBe('unchanged');
      expect(comparison.summary).toBe(
        "Remaster matched the original upload's quality (72 → 72)."
      );
    });

    it('reports null deltas for unknown metrics instead of throwing', () => {
      const comparison = compareQualityAnalyses(
        buildAnalysis({ metrics: {} }),
        buildAnalysis({ variant: 'remastered', metrics: { clarity: 88 } })
      );

      expect(comparison.metrics.find((m) => m.metric === 'clarity')).toEqual({
        metric: 'clarity',
        original: null,
        remastered: 88,
        delta: null,
      });
      expect(comparison.metrics.find((m) => m.metric === 'distortion')).toEqual({
        metric: 'distortion',
        original: null,
        remastered: null,
        delta: null,
      });
    });

    it('clamps malformed scores and flags unavailable comparisons', () => {
      const comparison = compareQualityAnalyses(
        buildAnalysis({ score: Number.NaN, metrics: { clarity: 150 } }),
        buildAnalysis({ variant: 'remastered', score: -5 })
      );

      expect(comparison.scoreDelta).toBeNull();
      expect(comparison.verdict).toBe('unchanged');
      expect(comparison.summary).toBe('Quality scores are unavailable for this comparison.');
      expect(comparison.metrics.find((m) => m.metric === 'clarity')?.original).toBe(100);
      expect(comparison.metrics.find((m) => m.metric === 'clarity')?.remastered).toBe(80);
      expect(comparison.metrics.find((m) => m.metric === 'clarity')?.delta).toBe(-20);
    });
  });

  describe('getQualityComparisonSummary', () => {
    it.each([
      [70, 70, 'unchanged', "Remaster matched the original upload's quality (70 → 70)."],
      [70, 70.4, 'improved', 'Remaster improved overall quality by 0.4 points (70 → 70.4).'],
      [80, 79, 'regressed', 'Remaster scored 1 point lower than the original upload (80 → 79).'],
      [60, 70, 'improved', 'Remaster improved overall quality by 10 points (60 → 70).'],
    ])('builds summary for %o', (before, after, verdict, expected) => {
      expect(getQualityComparisonSummary(before, after, verdict)).toBe(expected);
    });

    it('explains when a score is unavailable', () => {
      expect(getQualityComparisonSummary(null, 70, 'unchanged')).toBe(
        'Quality scores are unavailable for this comparison.'
      );
      expect(getQualityComparisonSummary(70, null, 'unchanged')).toBe(
        'Quality scores are unavailable for this comparison.'
      );
    });
  });
});
