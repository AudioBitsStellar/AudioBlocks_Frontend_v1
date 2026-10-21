import { describe, it, expect } from 'vitest';
import {
  computeNormalizationGainDb,
  gainDbToLinear,
  normalizeTargetLufs,
  DEFAULT_NORMALIZATION_TARGET_LUFS,
  MAX_NORMALIZATION_GAIN_DB,
  MIN_NORMALIZATION_GAIN_DB,
  TRUE_PEAK_CEILING_DBTP,
} from '@/lib/player/normalizationGain';

describe('computeNormalizationGainDb (#582)', () => {
  it('moves a quiet track up to the target when the peak has headroom', () => {
    expect(computeNormalizationGainDb({ loudness: -18, truePeakDb: -6 }, -14)).toBe(4);
  });

  it('moves a loud track down to the target', () => {
    expect(computeNormalizationGainDb({ loudness: -9, truePeakDb: -0.5 }, -14)).toBe(-5);
  });

  it('trims the boost so the true peak stays at the ceiling', () => {
    // Loudness alone would allow +8 dB, but the peak at -5 dBTP only allows +4 dB.
    const gain = computeNormalizationGainDb({ loudness: -22, truePeakDb: -5 }, -14);
    expect(gain).toBe(TRUE_PEAK_CEILING_DBTP - -5);
    expect(-5 + gain).toBeLessThanOrEqual(TRUE_PEAK_CEILING_DBTP);
  });

  it('clamps large corrections to the allowed range', () => {
    expect(computeNormalizationGainDb({ loudness: -40, truePeakDb: -30 }, -14)).toBe(
      MAX_NORMALIZATION_GAIN_DB
    );
    expect(computeNormalizationGainDb({ loudness: 2, truePeakDb: 1 }, -14)).toBe(
      MIN_NORMALIZATION_GAIN_DB
    );
  });

  it('plays tracks without measured loudness at unity gain', () => {
    expect(computeNormalizationGainDb({ truePeakDb: -3 }, -14)).toBe(0);
    expect(computeNormalizationGainDb({}, -14)).toBe(0);
    expect(computeNormalizationGainDb(undefined, -14)).toBe(0);
    expect(computeNormalizationGainDb(null, -14)).toBe(0);
  });

  it('ignores non-finite measurements', () => {
    expect(computeNormalizationGainDb({ loudness: Number.NaN }, -14)).toBe(0);
    expect(computeNormalizationGainDb({ loudness: Number.POSITIVE_INFINITY }, -14)).toBe(0);
  });

  it('never boosts when the true peak is unknown', () => {
    expect(computeNormalizationGainDb({ loudness: -20 }, -14)).toBe(0);
    expect(computeNormalizationGainDb({ loudness: -10 }, -14)).toBe(-4);
  });

  it('follows the selected target level', () => {
    const track = { loudness: -16, truePeakDb: -6 };
    expect(computeNormalizationGainDb(track, -23)).toBe(-7);
    expect(computeNormalizationGainDb(track, -11)).toBe(5);
  });
});

describe('gainDbToLinear', () => {
  it('maps 0 dB to unity and 6 dB to roughly double amplitude', () => {
    expect(gainDbToLinear(0)).toBe(1);
    expect(gainDbToLinear(6)).toBeCloseTo(1.9953, 3);
    expect(gainDbToLinear(-6)).toBeCloseTo(0.5012, 3);
  });
});

describe('normalizeTargetLufs', () => {
  it('keeps supported targets', () => {
    expect(normalizeTargetLufs(-23)).toBe(-23);
    expect(normalizeTargetLufs(-11)).toBe(-11);
  });

  it('falls back to the default for unsupported or missing values', () => {
    expect(normalizeTargetLufs(-16)).toBe(DEFAULT_NORMALIZATION_TARGET_LUFS);
    expect(normalizeTargetLufs(undefined)).toBe(DEFAULT_NORMALIZATION_TARGET_LUFS);
    expect(normalizeTargetLufs('-23')).toBe(DEFAULT_NORMALIZATION_TARGET_LUFS);
  });
});
