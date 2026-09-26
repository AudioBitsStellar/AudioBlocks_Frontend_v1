/**
 * Feedback loop to improve quality check thresholds from admin overrides
 * (#448).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA): when the automated
 * verdict disagrees with what an admin ultimately decides, that disagreement
 * is evidence the thresholds are mis-tuned. This module records each admin
 * override and aggregates it into concrete threshold recommendations:
 *
 * - Admins frequently approve tracks the filter rejected → the confidence
 *   bar is too strict; recommend lowering it.
 * - Admins frequently reject tracks the filter approved → the bar is too
 *   loose; recommend raising it.
 * - Overrides are otherwise in line with the filter → keep the bar as is.
 *
 * The store is bounded (oldest entries evicted past the cap) so an unbounded
 * admin session can never grow it without limit.
 */

export type FilterDecision = 'approved' | 'rejected' | 'timeout';
export type AdminAction = 'approved' | 'rejected' | 'skipped';

export interface AdminOverride {
  /** Track the override was applied to. */
  trackId: string;
  /** What the automated filter decided. */
  filterDecision: FilterDecision;
  /** What the admin decided instead. */
  adminAction: AdminAction;
}

export interface ThresholdFeedback {
  overridesRecorded: number;
  /** Filter said reject (or timed out), admin said approve. */
  approvalReversals: number;
  /** Filter said approve, admin said reject. */
  rejectionReversals: number;
  /** Filter timed out and the admin skipped instead. */
  timeoutSkips: number;
  /** Recommended `minConfidenceScore` after weighing the overrides. */
  suggestedMinConfidenceScore: number;
  /** Human-readable summary of the recommendation. */
  recommendation: string;
}

/** Baseline confidence the filter uses to approve a track. */
export const BASE_MIN_CONFIDENCE_SCORE = 0.7;

/** Minimum adjustment per feedback cycle, in confidence points. */
export const THRESHOLD_STEP = 0.05;

/** Share of overrides that must disagree before a threshold moves. */
export const REVERSAL_SHARE = 0.3;

const MAX_OVERRIDES = 1000;

const overrides: AdminOverride[] = [];

/** Record one admin override for the feedback loop. */
export function recordAdminOverride(override: AdminOverride): void {
  if (overrides.length >= MAX_OVERRIDES) {
    overrides.shift();
  }
  overrides.push(override);
}

/**
 * Aggregate the recorded overrides into a threshold recommendation.
 * The suggestion is always rounded to the step so it stays legible.
 */
export function getThresholdFeedback(): ThresholdFeedback {
  let approvalReversals = 0;
  let rejectionReversals = 0;
  let timeoutSkips = 0;

  for (const override of overrides) {
    if (override.filterDecision === 'timeout' && override.adminAction === 'skipped') {
      timeoutSkips += 1;
      continue;
    }
    if (override.filterDecision !== 'approved' && override.adminAction === 'approved') {
      approvalReversals += 1;
    } else if (override.filterDecision === 'approved' && override.adminAction === 'rejected') {
      rejectionReversals += 1;
    }
  }

  let suggestedMinConfidenceScore = BASE_MIN_CONFIDENCE_SCORE;
  let recommendation = 'Admin overrides agree with the filter — keep the current threshold.';

  const disagreements = approvalReversals + rejectionReversals;
  if (overrides.length > 0 && disagreements / overrides.length >= REVERSAL_SHARE) {
    if (approvalReversals > rejectionReversals) {
      suggestedMinConfidenceScore = roundToStep(BASE_MIN_CONFIDENCE_SCORE - THRESHOLD_STEP);
      recommendation =
        'Admins frequently approve tracks the filter rejects — lower minConfidenceScore.';
    } else {
      suggestedMinConfidenceScore = roundToStep(BASE_MIN_CONFIDENCE_SCORE + THRESHOLD_STEP);
      recommendation =
        'Admins frequently reject tracks the filter approves — raise minConfidenceScore.';
    }
  }

  return {
    overridesRecorded: overrides.length,
    approvalReversals,
    rejectionReversals,
    timeoutSkips,
    suggestedMinConfidenceScore,
    recommendation,
  };
}

/** Clear the feedback store (test use only). */
export function resetThresholdFeedback(): void {
  overrides.length = 0;
}

function roundToStep(value: number): number {
  // Snap through a fixed decimal string so IEEE-754 drift
  // (e.g. 14 * 0.05 === 0.7000000000000001) can never leak into a suggestion.
  return Number((Math.round(value / THRESHOLD_STEP) * THRESHOLD_STEP).toFixed(2));
}
