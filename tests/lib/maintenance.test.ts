import { describe, expect, it } from 'vitest';
import { getMaintenanceBannerMessage, isMaintenanceModeEnabled } from '@/lib/maintenance';

describe('isMaintenanceModeEnabled', () => {
  it('is off by default', () => {
    expect(isMaintenanceModeEnabled(undefined)).toBe(false);
  });

  it.each([
    ['true', true],
    ['1', true],
    ['on', true],
    ['yes', true],
    ['false', false],
    ['0', false],
    ['off', false],
    ['', false],
  ])('parses %j as %s', (value, expected) => {
    expect(isMaintenanceModeEnabled(value)).toBe(expected);
  });
});

describe('getMaintenanceBannerMessage', () => {
  it('returns null when unset or blank', () => {
    expect(getMaintenanceBannerMessage(undefined)).toBeNull();
    expect(getMaintenanceBannerMessage('   ')).toBeNull();
  });

  it('trims and returns the message when set', () => {
    expect(getMaintenanceBannerMessage('  Down for upgrades  ')).toBe('Down for upgrades');
  });
});
