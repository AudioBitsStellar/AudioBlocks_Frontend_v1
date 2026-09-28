import { beforeEach, describe, expect, it } from 'vitest';
import {
  FlaggedTrackReviewError,
  UnauthorizedReviewError,
  approveTrack,
  flagTrackForReview,
  getFlaggedTrack,
  getFlaggedTracks,
  rejectTrack,
  resetFlaggedTrackReview,
} from '@/lib/flaggedTrackReview';

const ADMIN = { role: 'admin' };
const ARTIST = { role: 'artist' };

const flag = (trackId: string, overrides: Partial<Parameters<typeof flagTrackForReview>[0]> = {}) =>
  flagTrackForReview({
    trackId,
    title: 'Song',
    score: 40,
    reasons: ['Low score'],
    source: 'rejected',
    ...overrides,
  });

describe('flaggedTrackReview', () => {
  beforeEach(() => {
    resetFlaggedTrackReview();
  });

  it('flags a track as pending', () => {
    const entry = flag('t1');
    expect(entry.status).toBe('pending');
    expect(getFlaggedTrack('t1')).toEqual(entry);
  });

  it('lists flagged tracks oldest first, optionally filtered by status', () => {
    flag('t1');
    flag('t2', { source: 'review' });
    approveTrack('t1', ADMIN);

    expect(getFlaggedTracks().map((t) => t.trackId)).toEqual(['t1', 't2']);
    expect(getFlaggedTracks('pending').map((t) => t.trackId)).toEqual(['t2']);
    expect(getFlaggedTracks('approved').map((t) => t.trackId)).toEqual(['t1']);
  });

  it('approves a pending track for an admin subject', () => {
    flag('t1');
    const decided = approveTrack('t1', ADMIN, 'looks fine');
    expect(decided.status).toBe('approved');
    expect(decided.decidedBy).toBe('admin');
    expect(decided.decisionNotes).toBe('looks fine');
    expect(decided.decidedAt).toBeTypeOf('number');
  });

  it('rejects a pending track for an admin subject', () => {
    flag('t1');
    const decided = rejectTrack('t1', ADMIN, 'not up to standard');
    expect(decided.status).toBe('rejected');
    expect(decided.decisionNotes).toBe('not up to standard');
  });

  it('throws UnauthorizedReviewError for a non-admin subject', () => {
    flag('t1');
    expect(() => approveTrack('t1', ARTIST)).toThrow(UnauthorizedReviewError);
    expect(() => rejectTrack('t1', null)).toThrow(UnauthorizedReviewError);
    expect(getFlaggedTrack('t1')?.status).toBe('pending');
  });

  it('throws FlaggedTrackReviewError for an unknown trackId', () => {
    expect(() => approveTrack('missing', ADMIN)).toThrow(FlaggedTrackReviewError);
  });

  it('throws FlaggedTrackReviewError when deciding an already-decided track', () => {
    flag('t1');
    approveTrack('t1', ADMIN);
    expect(() => rejectTrack('t1', ADMIN)).toThrow(FlaggedTrackReviewError);
  });

  it('re-flagging a decided track does not reopen it', () => {
    flag('t1');
    approveTrack('t1', ADMIN);
    const reflagged = flag('t1', { score: 10 });
    expect(reflagged.status).toBe('approved');
    expect(reflagged.score).not.toBe(10);
  });

  it('re-flagging a still-pending track refreshes its details', () => {
    flag('t1', { score: 10 });
    const refreshed = flag('t1', { score: 55, reasons: ['Improved score'] });
    expect(refreshed.status).toBe('pending');
    expect(refreshed.score).toBe(55);
    expect(refreshed.reasons).toEqual(['Improved score']);
  });

  it('returns undefined for a track that was never flagged', () => {
    expect(getFlaggedTrack('nope')).toBeUndefined();
  });
});
