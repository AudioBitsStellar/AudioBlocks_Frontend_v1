/**
 * Analytics tracking for quality check pass/fail rates (#439).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA): every automated
 * quality check outcome is recorded here so the pass/fail/timeout mix can be
 * reported platform-wide (and, optionally, per model version), which is the
 * data source the quality metrics dashboard (#440) and A/B comparison (#436)
 * read from.
 *
 * The store is bounded (oldest entries evicted past the cap) so a long
 * session can never grow it without limit.
 */

export type QualityCheckOutcome = 'passed' | 'failed' | 'timeout';

export interface QualityCheckEvent {
  trackId: string;
  outcome: QualityCheckOutcome;
  /** Model version that produced the verdict; used to compare versions. */
  modelVersion?: string;
  /** Confidence score in [0, 1], when the check produced one. */
  score?: number;
  /** Unix ms; defaults to now. */
  recordedAt?: number;
}

export interface QualityCheckStats {
  total: number;
  passed: number;
  failed: number;
  timeouts: number;
  /** passed / (passed + failed), timeouts excluded. 0 when nothing decided. */
  passRate: number;
  /** failed / (passed + failed), timeouts excluded. 0 when nothing decided. */
  failRate: number;
  /** timeouts / total. 0 when nothing recorded. */
  timeoutRate: number;
  /** Mean of the recorded scores, or null when none carried a score. */
  averageScore: number | null;
}

const MAX_EVENTS = 5000;

type StoredEvent = Required<Pick<QualityCheckEvent, 'trackId' | 'outcome' | 'recordedAt'>> &
  Pick<QualityCheckEvent, 'modelVersion' | 'score'>;

const store: StoredEvent[] = [];

/** Record one quality check outcome. */
export function recordQualityCheckResult(event: QualityCheckEvent): void {
  if (store.length >= MAX_EVENTS) {
    store.shift();
  }
  store.push({
    trackId: event.trackId,
    outcome: event.outcome,
    modelVersion: event.modelVersion,
    score: event.score,
    recordedAt: event.recordedAt ?? Date.now(),
  });
}

/**
 * Aggregate recorded outcomes. Pass an optional `modelVersion` to scope the
 * stats to one version.
 */
export function getQualityCheckStats(modelVersion?: string): QualityCheckStats {
  let passed = 0;
  let failed = 0;
  let timeouts = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const e of store) {
    if (modelVersion !== undefined && e.modelVersion !== modelVersion) continue;
    if (e.outcome === 'passed') passed++;
    else if (e.outcome === 'failed') failed++;
    else timeouts++;
    if (typeof e.score === 'number' && Number.isFinite(e.score)) {
      scoreSum += e.score;
      scoreCount++;
    }
  }

  const total = passed + failed + timeouts;
  const decided = passed + failed;
  return {
    total,
    passed,
    failed,
    timeouts,
    passRate: decided === 0 ? 0 : passed / decided,
    failRate: decided === 0 ? 0 : failed / decided,
    timeoutRate: total === 0 ? 0 : timeouts / total,
    averageScore: scoreCount === 0 ? null : scoreSum / scoreCount,
  };
}

/** Clear all recorded events (tests / admin reset). */
export function resetQualityAnalytics(): void {
  store.length = 0;
}
