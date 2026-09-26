import { describe, expect, it } from 'vitest';
import { getQualityTier } from '@/lib/qualityBadge';

describe('getQualityTier', () => {
  it('returns gold at and above 85', () => {
    expect(getQualityTier(85)).toBe('gold');
    expect(getQualityTier(100)).toBe('gold');
  });

  it('returns silver from 65 up to 84', () => {
    expect(getQualityTier(65)).toBe('silver');
    expect(getQualityTier(84.9)).toBe('silver');
  });

  it('returns needs-improvement below 65 and for invalid scores', () => {
    expect(getQualityTier(64.9)).toBe('needs-improvement');
    expect(getQualityTier(0)).toBe('needs-improvement');
    expect(getQualityTier(NaN)).toBe('needs-improvement');
  });
});
