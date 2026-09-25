import { describe, it, expect } from 'vitest';
import {
  canSkipQualityCheck,
  isQualityCheckRequired,
} from '@/lib/qualityChecks';

/**
 * Quality check skip option for admin-approved artists (#447).
 */

describe('canSkipQualityCheck', () => {
  it('lets admins skip outright', () => {
    expect(canSkipQualityCheck({ role: 'admin' })).toBe(true);
    expect(canSkipQualityCheck({ role: 'admin', qualityCheckApproved: false })).toBe(
      true
    );
  });

  it('lets admin-approved artists skip', () => {
    expect(
      canSkipQualityCheck({ role: 'artist', qualityCheckApproved: true })
    ).toBe(true);
  });

  it.each([
    ['unapproved artist', { role: 'artist', qualityCheckApproved: false }],
    ['unapproved artist (flag unset)', { role: 'artist' }],
    ['listener', { role: 'listener', qualityCheckApproved: true }],
    ['unknown role', { role: 'moderator', qualityCheckApproved: true }],
  ])('denies the skip option for a %s', (_label, subject) => {
    expect(canSkipQualityCheck(subject)).toBe(false);
  });

  it('denies missing or malformed subjects', () => {
    expect(canSkipQualityCheck(undefined)).toBe(false);
    expect(canSkipQualityCheck(null)).toBe(false);
    expect(canSkipQualityCheck({ role: undefined as unknown as string })).toBe(false);
  });
});

describe('isQualityCheckRequired', () => {
  it('is the inverse of canSkipQualityCheck', () => {
    expect(isQualityCheckRequired({ role: 'admin' })).toBe(false);
    expect(isQualityCheckRequired({ role: 'artist', qualityCheckApproved: true })).toBe(false);
    expect(isQualityCheckRequired({ role: 'artist', qualityCheckApproved: false })).toBe(true);
    expect(isQualityCheckRequired(undefined)).toBe(true);
  });
});
