/**
 * Quality comparison between original and remastered uploads.
 *
 * Part of the AI Song Quality Filter initiative: when a track is remastered,
 * both uploads are analysed and the results are compared so the dashboard can
 * show whether the remaster actually improved the audio quality. All metric
 * and score values are quality points on a 0–100 scale where higher is better.
 */

export type QualityMetricKey = 'clarity' | 'dynamicRange' | 'noiseFloor' | 'distortion';

export const QUALITY_METRIC_KEYS: readonly QualityMetricKey[] = [
  'clarity',
  'dynamicRange',
  'noiseFloor',
  'distortion',
];

export type QualityVariant = 'original' | 'remastered';

export interface QualityAnalysis {
  trackId: string;
  variant: QualityVariant;
  /** Overall quality score, 0–100. */
  score: number;
  /** Per-metric quality scores, 0–100. Missing metrics are unknown. */
  metrics: Partial<Record<QualityMetricKey, number>>;
}

export interface QualityMetricComparison {
  metric: QualityMetricKey;
  original: number | null;
  remastered: number | null;
  delta: number | null;
}

export type QualityComparisonVerdict = 'improved' | 'unchanged' | 'regressed';

export interface QualityComparison {
  originalTrackId: string;
  remasteredTrackId: string;
  /** Change in overall score, or null when a score is unavailable. */
  scoreDelta: number | null;
  metrics: QualityMetricComparison[];
  verdict: QualityComparisonVerdict;
  summary: string;
}

/** Deltas within this tolerance are treated as measurement noise, not change. */
const VERDICT_TOLERANCE = 1;

function clampScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Builds user-facing copy for a comparison so raw score details never leak
 * into the interface without context.
 */
export function getQualityComparisonSummary(
  before: number | null,
  after: number | null,
  verdict: QualityComparisonVerdict
): string {
  if (before === null || after === null) {
    return 'Quality scores are unavailable for this comparison.';
  }

  const delta = roundScore(after - before);
  const deltaLabel = `${Math.abs(delta)} point${Math.abs(delta) === 1 ? '' : 's'}`;
  const scores = `(${roundScore(before)} → ${roundScore(after)})`;

  if (verdict === 'improved') {
    return `Remaster improved overall quality by ${deltaLabel} ${scores}.`;
  }
  if (verdict === 'regressed') {
    return `Remaster scored ${deltaLabel} lower than the original upload ${scores}.`;
  }
  return `Remaster matched the original upload's quality ${scores}.`;
}

/**
 * Compares the analyses of an original upload and its remaster, producing
 * per-metric deltas, an overall verdict, and user-facing summary copy.
 * Unknown or malformed scores are reported as null instead of throwing.
 */
export function compareQualityAnalyses(
  original: QualityAnalysis,
  remastered: QualityAnalysis
): QualityComparison {
  const metrics: QualityMetricComparison[] = QUALITY_METRIC_KEYS.map((metric) => {
    const before = clampScore(original.metrics?.[metric]);
    const after = clampScore(remastered.metrics?.[metric]);
    return {
      metric,
      original: before,
      remastered: after,
      delta: before === null || after === null ? null : roundScore(after - before),
    };
  });

  const before = clampScore(original.score);
  const after = clampScore(remastered.score);
  const scoreDelta = before === null || after === null ? null : roundScore(after - before);
  const verdict: QualityComparisonVerdict =
    scoreDelta === null || Math.abs(scoreDelta) <= VERDICT_TOLERANCE
      ? 'unchanged'
      : scoreDelta > 0
        ? 'improved'
        : 'regressed';

  return {
    originalTrackId: original.trackId,
    remasteredTrackId: remastered.trackId,
    scoreDelta,
    metrics,
    verdict,
    summary: getQualityComparisonSummary(before, after, verdict),
  };
}
