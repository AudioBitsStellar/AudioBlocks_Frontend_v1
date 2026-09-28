/**
 * Re-upload flow after a failed quality check (#421).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA): a track the
 * pipeline (`lib/uploadQualityPipeline.ts`) rejects or sends to review isn't
 * necessarily gone for good — an artist can fix the issue (re-master a
 * clipping mix, replace a duplicate stem) and try again. This module tracks
 * the attempt chain behind one logical upload: how many times it has been
 * retried, whether another attempt is still allowed, and the reasons from
 * every prior attempt so the artist (and the re-upload UI) can see exactly
 * what to fix instead of guessing.
 *
 * Each attempt is its own pipeline run with its own `trackId`; this module
 * only threads them together. Storage-agnostic and in-memory, the same
 * pattern as `lib/analysisQueueMonitor.ts`.
 */

import type { PipelineVerdict } from './uploadQualityPipeline';

/** Verdicts that still block publication and therefore allow a re-upload. */
const RETRYABLE_VERDICTS: ReadonlySet<PipelineVerdict> = new Set(['rejected', 'review']);

/** Maximum attempts allowed for one logical upload, the original included. */
export const MAX_UPLOAD_ATTEMPTS = 3;

export interface UploadAttempt {
  trackId: string;
  /** trackId of the first attempt in this chain (itself, for that attempt). */
  originalTrackId: string;
  /** trackId of the attempt this one replaces, if any. */
  previousTrackId?: string;
  /** 1 for the original upload, 2 for the first re-upload, and so on. */
  attemptNumber: number;
  /** Outcome of this attempt's pipeline run, once it has one. */
  status?: PipelineVerdict;
  reasons?: string[];
  createdAt: number;
  decidedAt?: number;
}

export interface CanReUploadResult {
  allowed: boolean;
  reason?: string;
  attemptsUsed: number;
  attemptsRemaining: number;
}

/** Raised on an invalid re-upload flow operation (unknown attempt, already at the cap, etc.). */
export class ReUploadFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReUploadFlowError';
  }
}

const attempts = new Map<string, UploadAttempt>();

/**
 * Registers the first attempt for a new upload. Call once per brand-new
 * upload, before running the quality pipeline on it.
 *
 * @throws ReUploadFlowError if `trackId` was already registered.
 */
export function registerUploadAttempt(trackId: string): UploadAttempt {
  if (attempts.has(trackId)) {
    throw new ReUploadFlowError(`Upload attempt for trackId '${trackId}' is already registered`);
  }
  const attempt: UploadAttempt = {
    trackId,
    originalTrackId: trackId,
    attemptNumber: 1,
    createdAt: Date.now(),
  };
  attempts.set(trackId, attempt);
  return attempt;
}

/**
 * Records the pipeline outcome for an attempt.
 *
 * @throws ReUploadFlowError if `trackId` was never registered.
 */
export function recordAttemptOutcome(
  trackId: string,
  status: PipelineVerdict,
  reasons: string[] = []
): UploadAttempt {
  const attempt = attempts.get(trackId);
  if (!attempt) {
    throw new ReUploadFlowError(`No upload attempt registered for trackId '${trackId}'`);
  }
  const decided: UploadAttempt = { ...attempt, status, reasons, decidedAt: Date.now() };
  attempts.set(trackId, decided);
  return decided;
}

/**
 * Whether the given attempt may be retried with a new upload.
 *
 * Not allowed when: the attempt is unknown, its outcome isn't in yet, its
 * verdict already published or skipped the track (nothing to redo), or the
 * chain has already used up `MAX_UPLOAD_ATTEMPTS`.
 */
export function canReUpload(trackId: string): CanReUploadResult {
  const attempt = attempts.get(trackId);
  if (!attempt) {
    return { allowed: false, reason: 'Unknown upload attempt', attemptsUsed: 0, attemptsRemaining: 0 };
  }

  const attemptsRemaining = Math.max(0, MAX_UPLOAD_ATTEMPTS - attempt.attemptNumber);

  if (attempt.status === undefined) {
    return {
      allowed: false,
      reason: 'Quality check has not finished for this attempt yet',
      attemptsUsed: attempt.attemptNumber,
      attemptsRemaining,
    };
  }
  if (!RETRYABLE_VERDICTS.has(attempt.status)) {
    return {
      allowed: false,
      reason: `Track is already '${attempt.status}'; no re-upload is needed`,
      attemptsUsed: attempt.attemptNumber,
      attemptsRemaining,
    };
  }
  if (attempt.attemptNumber >= MAX_UPLOAD_ATTEMPTS) {
    return {
      allowed: false,
      reason: `Maximum of ${MAX_UPLOAD_ATTEMPTS} upload attempts reached; contact support`,
      attemptsUsed: attempt.attemptNumber,
      attemptsRemaining: 0,
    };
  }

  return { allowed: true, attemptsUsed: attempt.attemptNumber, attemptsRemaining };
}

/**
 * Starts a new attempt that replaces `previousTrackId`, carrying the chain's
 * history forward.
 *
 * @throws ReUploadFlowError when `canReUpload(previousTrackId)` is not
 *   allowed, or when `newTrackId` is already registered.
 */
export function startReUpload(previousTrackId: string, newTrackId: string): UploadAttempt {
  const decision = canReUpload(previousTrackId);
  if (!decision.allowed) {
    throw new ReUploadFlowError(decision.reason ?? 'Re-upload is not allowed for this attempt');
  }
  if (attempts.has(newTrackId)) {
    throw new ReUploadFlowError(`Upload attempt for trackId '${newTrackId}' is already registered`);
  }

  const previous = attempts.get(previousTrackId) as UploadAttempt;
  const attempt: UploadAttempt = {
    trackId: newTrackId,
    originalTrackId: previous.originalTrackId,
    previousTrackId,
    attemptNumber: previous.attemptNumber + 1,
    createdAt: Date.now(),
  };
  attempts.set(newTrackId, attempt);
  return attempt;
}

/**
 * Full attempt history for a chain, oldest first, given any attempt's
 * `trackId` in it.
 */
export function getUploadHistory(trackId: string): UploadAttempt[] {
  const attempt = attempts.get(trackId);
  if (!attempt) return [];
  return [...attempts.values()]
    .filter((a) => a.originalTrackId === attempt.originalTrackId)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
}

/** Clears all tracked attempts (tests only). */
export function resetReUploadFlow(): void {
  attempts.clear();
}
