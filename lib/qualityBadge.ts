/**
 * Quality badge tiers for the AI Song Quality Filter (#442).
 *
 * Maps an overall 0–100 quality score to a badge tier. Dependency-free so it
 * can be unit tested with Vitest.
 */

export type QualityTier = 'gold' | 'silver' | 'needs-improvement';

/** Minimum overall score for each tier (inclusive). */
export const GOLD_MIN_SCORE = 85;
export const SILVER_MIN_SCORE = 65;

export const QUALITY_TIER_LABELS: Record<QualityTier, string> = {
  gold: 'Gold quality',
  silver: 'Silver quality',
  'needs-improvement': 'Needs improvement',
};

/** Returns the tier for a 0–100 score. Non-finite scores map to `needs-improvement`. */
export function getQualityTier(score: number): QualityTier {
  if (!Number.isFinite(score)) return 'needs-improvement';
  if (score >= GOLD_MIN_SCORE) return 'gold';
  if (score >= SILVER_MIN_SCORE) return 'silver';
  return 'needs-improvement';
}
