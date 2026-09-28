import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_ATTEMPTS,
  ReUploadFlowError,
  canReUpload,
  getUploadHistory,
  recordAttemptOutcome,
  registerUploadAttempt,
  resetReUploadFlow,
  startReUpload,
} from '@/lib/reUploadFlow';

describe('reUploadFlow', () => {
  beforeEach(() => {
    resetReUploadFlow();
  });

  it('registers the first attempt as attempt 1 of its own chain', () => {
    const attempt = registerUploadAttempt('t1');
    expect(attempt).toMatchObject({ trackId: 't1', originalTrackId: 't1', attemptNumber: 1 });
  });

  it('throws when registering the same trackId twice', () => {
    registerUploadAttempt('t1');
    expect(() => registerUploadAttempt('t1')).toThrow(ReUploadFlowError);
  });

  it('is not allowed before the outcome is recorded', () => {
    registerUploadAttempt('t1');
    expect(canReUpload('t1')).toMatchObject({ allowed: false });
  });

  it('is not allowed for an approved track', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'approved');
    expect(canReUpload('t1')).toMatchObject({ allowed: false, reason: expect.stringContaining("'approved'") });
  });

  it('is not allowed for a skipped (exempt) track', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'skipped');
    expect(canReUpload('t1').allowed).toBe(false);
  });

  it('is allowed for a rejected or review track under the attempt cap', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'rejected', ['Clipping detected']);
    expect(canReUpload('t1')).toEqual({ allowed: true, attemptsUsed: 1, attemptsRemaining: 2 });

    registerUploadAttempt('t2');
    recordAttemptOutcome('t2', 'review', ['Borderline score']);
    expect(canReUpload('t2').allowed).toBe(true);
  });

  it('starts a re-upload that continues the chain and carries history', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'rejected', ['Clipping detected']);

    const attempt2 = startReUpload('t1', 't2');
    expect(attempt2).toMatchObject({
      trackId: 't2',
      originalTrackId: 't1',
      previousTrackId: 't1',
      attemptNumber: 2,
    });

    const history = getUploadHistory('t2');
    expect(history.map((a) => a.trackId)).toEqual(['t1', 't2']);
    expect(history[0]?.reasons).toEqual(['Clipping detected']);
  });

  it('throws when starting a re-upload that is not allowed', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'approved');
    expect(() => startReUpload('t1', 't2')).toThrow(ReUploadFlowError);
  });

  it('throws when the new trackId is already registered', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'rejected');
    registerUploadAttempt('t2');
    expect(() => startReUpload('t1', 't2')).toThrow(ReUploadFlowError);
  });

  it('enforces the maximum attempt cap', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'rejected');
    let previous = 't1';
    for (let n = 2; n <= MAX_UPLOAD_ATTEMPTS; n++) {
      const next = `t${n}`;
      const attempt = startReUpload(previous, next);
      expect(attempt.attemptNumber).toBe(n);
      recordAttemptOutcome(next, 'rejected');
      previous = next;
    }
    expect(canReUpload(previous)).toMatchObject({
      allowed: false,
      reason: expect.stringContaining(`${MAX_UPLOAD_ATTEMPTS}`),
      attemptsRemaining: 0,
    });
    expect(() => startReUpload(previous, 'one-too-many')).toThrow(ReUploadFlowError);
  });

  it('recordAttemptOutcome throws for an unregistered trackId', () => {
    expect(() => recordAttemptOutcome('missing', 'rejected')).toThrow(ReUploadFlowError);
  });

  it('getUploadHistory returns an empty array for an unknown trackId', () => {
    expect(getUploadHistory('missing')).toEqual([]);
  });

  it('getUploadHistory works from any attempt in the chain, not just the latest', () => {
    registerUploadAttempt('t1');
    recordAttemptOutcome('t1', 'rejected');
    startReUpload('t1', 't2');
    expect(getUploadHistory('t1').map((a) => a.trackId)).toEqual(['t1', 't2']);
  });
});
