import { beforeEach, describe, it, expect } from 'vitest';
import {
  BASE_MIN_CONFIDENCE_SCORE,
  THRESHOLD_STEP,
  getThresholdFeedback,
  recordAdminOverride,
  resetThresholdFeedback,
} from '@/lib/qualityThresholds';

/**
 * Feedback loop to improve quality check thresholds from admin overrides
 * (#448).
 */

const override = (
  trackId: string,
  filterDecision: 'approved' | 'rejected' | 'timeout',
  adminAction: 'approved' | 'rejected' | 'skipped'
) => ({ trackId, filterDecision, adminAction });

describe('recordAdminOverride / getThresholdFeedback', () => {
  beforeEach(() => {
    resetThresholdFeedback();
  });

  it('starts with a clean slate and the baseline threshold', () => {
    const feedback = getThresholdFeedback();

    expect(feedback.overridesRecorded).toBe(0);
    expect(feedback.suggestedMinConfidenceScore).toBe(BASE_MIN_CONFIDENCE_SCORE);
    expect(feedback.recommendation).toMatch(/keep the current threshold/i);
  });

  it('categorizes approval reversals, rejection reversals, and timeout skips', () => {
    recordAdminOverride(override('t1', 'rejected', 'approved'));
    recordAdminOverride(override('t2', 'approved', 'rejected'));
    recordAdminOverride(override('t3', 'timeout', 'skipped'));
    // Aligned decisions are not reversals.
    recordAdminOverride(override('t4', 'rejected', 'rejected'));

    const feedback = getThresholdFeedback();

    expect(feedback.overridesRecorded).toBe(4);
    expect(feedback.approvalReversals).toBe(1);
    expect(feedback.rejectionReversals).toBe(1);
    expect(feedback.timeoutSkips).toBe(1);
    expect(feedback.suggestedMinConfidenceScore).toBe(BASE_MIN_CONFIDENCE_SCORE);
  });

  it('recommends a lower threshold when admins frequently approve rejections', () => {
    // 60% of overrides reverse a rejection into an approval.
    for (let i = 0; i < 6; i++) recordAdminOverride(override(`t${i}`, 'rejected', 'approved'));
    for (let i = 0; i < 4; i++) recordAdminOverride(override(`a${i}`, 'rejected', 'rejected'));

    const feedback = getThresholdFeedback();

    expect(feedback.approvalReversals).toBe(6);
    expect(feedback.suggestedMinConfidenceScore).toBeCloseTo(
      BASE_MIN_CONFIDENCE_SCORE - THRESHOLD_STEP,
      10
    );
    expect(feedback.recommendation).toMatch(/lower minconfidencescore/i);
  });

  it('recommends a higher threshold when admins frequently reject approvals', () => {
    for (let i = 0; i < 6; i++) recordAdminOverride(override(`t${i}`, 'approved', 'rejected'));
    for (let i = 0; i < 4; i++) recordAdminOverride(override(`a${i}`, 'rejected', 'approved'));

    const feedback = getThresholdFeedback();

    expect(feedback.rejectionReversals).toBe(6);
    expect(feedback.suggestedMinConfidenceScore).toBeCloseTo(
      BASE_MIN_CONFIDENCE_SCORE + THRESHOLD_STEP,
      10
    );
    expect(feedback.recommendation).toMatch(/raise minconfidencescore/i);
  });

  it('keeps the threshold when disagreements stay below the reversal share', () => {
    for (let i = 0; i < 2; i++) recordAdminOverride(override(`t${i}`, 'rejected', 'approved'));
    for (let i = 0; i < 8; i++) recordAdminOverride(override(`a${i}`, 'rejected', 'rejected'));

    expect(getThresholdFeedback().suggestedMinConfidenceScore).toBe(BASE_MIN_CONFIDENCE_SCORE);
  });

  it('stays bounded at 1000 recorded overrides', () => {
    for (let i = 0; i < 1050; i++) {
      recordAdminOverride(override(`t${i}`, 'rejected', 'approved'));
    }

    expect(getThresholdFeedback().overridesRecorded).toBe(1000);
  });
});
