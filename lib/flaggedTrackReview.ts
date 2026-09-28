/**
 * Admin approve/reject actions for flagged tracks (#418).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA): a track the
 * pipeline (`lib/uploadQualityPipeline.ts`) sends to `'review'` or rejects
 * outright still needs a human decision before the artist is told anything
 * final — a false rejection or a borderline pass both need a person, not a
 * retry of the same model. This module is the single source of truth for
 * that queue: what is waiting, and the one decision (approve or reject) an
 * admin can make on each entry.
 *
 * Storage-agnostic and in-memory, the same pattern as
 * `lib/analysisQueueMonitor.ts`: one entry per track, keyed by `trackId`.
 * Deciding an entry is enforced server-side in the same way
 * `lib/qualityChecks.ts` enforces the skip-check gate — a crafted client
 * request must never approve or reject its own track.
 */

import { QUALITY_CHECK_EXEMPT_ROLES } from './qualityChecks';

export type FlaggedTrackStatus = 'pending' | 'approved' | 'rejected';

/** Why the track was flagged — mirrors the pipeline verdict that triggered it. */
export type FlagSource = 'review' | 'rejected';

export interface ReviewerSubject {
  role: string;
}

export interface FlagTrackInput {
  trackId: string;
  title?: string;
  artist?: string;
  genre?: string;
  score: number;
  reasons: string[];
  source: FlagSource;
}

export interface FlaggedTrack extends FlagTrackInput {
  status: FlaggedTrackStatus;
  flaggedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  decisionNotes?: string;
}

/** Raised when a decision is attempted on a track that isn't pending, or doesn't exist. */
export class FlaggedTrackReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlaggedTrackReviewError';
  }
}

/** Raised when a non-admin subject attempts to decide a flagged track. */
export class UnauthorizedReviewError extends Error {
  constructor() {
    super('Only an admin may approve or reject a flagged track');
    this.name = 'UnauthorizedReviewError';
  }
}

const isAdmin = (subject?: ReviewerSubject | null): boolean =>
  !!subject &&
  QUALITY_CHECK_EXEMPT_ROLES.includes(subject.role as (typeof QUALITY_CHECK_EXEMPT_ROLES)[number]);

const store = new Map<string, FlaggedTrack>();

/**
 * Adds a track to the review queue, or refreshes an existing pending entry
 * with the latest score/reasons (e.g. a re-run of the pipeline). Deciding a
 * track first (approved/rejected) is final — flagging it again does not
 * reopen a decided entry; call `resetFlaggedTrackReview` in tests, or start
 * a new re-upload attempt (`lib/reUploadFlow.ts`) with a new `trackId` in
 * production.
 */
export function flagTrackForReview(input: FlagTrackInput): FlaggedTrack {
  const existing = store.get(input.trackId);
  if (existing && existing.status !== 'pending') {
    return existing;
  }

  const entry: FlaggedTrack = {
    ...input,
    status: 'pending',
    flaggedAt: existing?.flaggedAt ?? Date.now(),
  };
  store.set(input.trackId, entry);
  return entry;
}

function decide(
  trackId: string,
  status: 'approved' | 'rejected',
  admin: ReviewerSubject | null | undefined,
  notes?: string
): FlaggedTrack {
  if (!isAdmin(admin)) {
    throw new UnauthorizedReviewError();
  }

  const entry = store.get(trackId);
  if (!entry) {
    throw new FlaggedTrackReviewError(`No flagged track found for trackId '${trackId}'`);
  }
  if (entry.status !== 'pending') {
    throw new FlaggedTrackReviewError(
      `Track '${trackId}' was already ${entry.status}; a decision cannot be changed here`
    );
  }

  const decided: FlaggedTrack = {
    ...entry,
    status,
    decidedAt: Date.now(),
    decidedBy: admin?.role,
    decisionNotes: notes,
  };
  store.set(trackId, decided);
  return decided;
}

/** Approves a pending flagged track. Throws unless `admin` is an admin subject. */
export function approveTrack(
  trackId: string,
  admin: ReviewerSubject | null | undefined,
  notes?: string
): FlaggedTrack {
  return decide(trackId, 'approved', admin, notes);
}

/** Rejects a pending flagged track. Throws unless `admin` is an admin subject. */
export function rejectTrack(
  trackId: string,
  admin: ReviewerSubject | null | undefined,
  notes?: string
): FlaggedTrack {
  return decide(trackId, 'rejected', admin, notes);
}

/** Looks up one flagged track by id, or `undefined` if it was never flagged. */
export function getFlaggedTrack(trackId: string): FlaggedTrack | undefined {
  return store.get(trackId);
}

/** Lists flagged tracks, oldest-flagged first. Pass `status` to filter. */
export function getFlaggedTracks(status?: FlaggedTrackStatus): FlaggedTrack[] {
  return [...store.values()]
    .filter((entry) => status === undefined || entry.status === status)
    .sort((a, b) => a.flaggedAt - b.flaggedAt);
}

/** Clears the review queue (tests only). */
export function resetFlaggedTrackReview(): void {
  store.clear();
}
