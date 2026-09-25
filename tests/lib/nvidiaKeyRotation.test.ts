import { describe, it, expect } from 'vitest';
import {
  GRACE_PERIOD_DAYS,
  ROTATION_INTERVAL_DAYS,
  findKeysNeedingAction,
  getRotationStatus,
  validateKeyRegistry,
} from '@/lib/nvidiaKeyRotation';

const NOW = new Date('2026-09-25T00:00:00Z');

const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const key = (keyId: string, createdAtDays: number, revokedAt?: string) => ({
  keyId,
  createdAt: daysAgo(createdAtDays),
  revokedAt,
});

describe('getRotationStatus', () => {
  it.each([
    ['pending', 0],
    ['pending', 1],
    ['active', ROTATION_INTERVAL_DAYS],
    ['grace', ROTATION_INTERVAL_DAYS + 1],
    ['grace', ROTATION_INTERVAL_DAYS + GRACE_PERIOD_DAYS],
    ['expired', ROTATION_INTERVAL_DAYS + GRACE_PERIOD_DAYS + 1],
  ])('classifies a %s-day-old key as %s', (expected, ageDays) => {
    expect(getRotationStatus(key('k1', ageDays), NOW)).toBe(expected);
  });

  it('returns expired for a revoked key regardless of age', () => {
    expect(getRotationStatus(key('k1', 1, daysAgo(0)), NOW)).toBe('expired');
  });
});

describe('findKeysNeedingAction', () => {
  it('returns keys that must be replaced or revoked', () => {
    const keys = [
      key('fresh', 1),
      key('active', 30),
      key('grace', ROTATION_INTERVAL_DAYS + 2),
      key('unrevoked-expired', ROTATION_INTERVAL_DAYS + GRACE_PERIOD_DAYS + 5),
      key('revoked', ROTATION_INTERVAL_DAYS + GRACE_PERIOD_DAYS + 5, daysAgo(1)),
    ];

    expect(findKeysNeedingAction(keys, NOW).map((k) => k.keyId)).toEqual([
      'grace',
      'unrevoked-expired',
    ]);
  });

  it('returns nothing when the registry is healthy', () => {
    const keys = [key('a', 10), key('b', 80)];
    expect(findKeysNeedingAction(keys, NOW)).toEqual([]);
  });
});

describe('validateKeyRegistry', () => {
  it('accepts a single active key and a dual-key grace overlap', () => {
    expect(() =>
      validateKeyRegistry([key('new', 1), key('old', 92, undefined)])
    ).not.toThrow();
  });

  it('throws on duplicate keyIds', () => {
    expect(() => validateKeyRegistry([key('dup', 1), key('dup', 2)])).toThrow(
      "NVIDIA key registry: duplicate keyId 'dup'"
    );
  });

  it('throws when more than two keys are unrevoked', () => {
    expect(() => validateKeyRegistry([key('a', 1), key('b', 2), key('c', 3)])).toThrow(
      'NVIDIA key registry: 3 unrevoked keys; rotation allows at most 2 concurrently'
    );
  });

  it('ignores revoked keys for the concurrency limit', () => {
    expect(() =>
      validateKeyRegistry([key('a', 1), key('b', 2, daysAgo(0)), key('c', 3, daysAgo(0))])
    ).not.toThrow();
  });
});
