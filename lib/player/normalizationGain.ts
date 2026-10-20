/**
 * Per-track playback gain for loudness normalization (#582).
 *
 * The backend measures each song's integrated loudness (LUFS) and true peak
 * (dBTP). Playback moves every track to the same target, like ReplayGain, and
 * keeps the true peak under the ceiling so boosted tracks don't clip. This file
 * is pure math; `hooks/useQueuedAudio.ts` applies the result to a GainNode.
 */

/** Loudness targets offered in settings, in LUFS. */
export const NORMALIZATION_TARGETS_LUFS = [-23, -14, -11] as const;
export type NormalizationTargetLufs = (typeof NORMALIZATION_TARGETS_LUFS)[number];
export const DEFAULT_NORMALIZATION_TARGET_LUFS: NormalizationTargetLufs = -14;

/** Bounds one bad measurement so it can't make a track silent or very loud. */
export const MIN_NORMALIZATION_GAIN_DB = -12;
export const MAX_NORMALIZATION_GAIN_DB = 6;
/** Highest allowed true peak after gain, in dBTP. */
export const TRUE_PEAK_CEILING_DBTP = -1;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Returns a supported target. Anything else, such as an older saved value, falls back to the default. */
export function normalizeTargetLufs(value: unknown): NormalizationTargetLufs {
  const match = NORMALIZATION_TARGETS_LUFS.find((target) => target === value);
  return match ?? DEFAULT_NORMALIZATION_TARGET_LUFS;
}

/**
 * Gain in dB that moves a track to `targetLufs`, reduced if needed so its true
 * peak stays at or below the ceiling. Tracks without a measured loudness play
 * at unity gain. Without a measured true peak we never boost, because we can't
 * show that the boost is safe.
 */
export function computeNormalizationGainDb(
  track: { loudness?: number; truePeakDb?: number } | null | undefined,
  targetLufs: number
): number {
  if (!track || !isFiniteNumber(track.loudness)) return 0;

  const loudnessGainDb = Math.min(
    Math.max(targetLufs - track.loudness, MIN_NORMALIZATION_GAIN_DB),
    MAX_NORMALIZATION_GAIN_DB
  );
  if (!isFiniteNumber(track.truePeakDb)) return Math.min(loudnessGainDb, 0);
  return Math.min(loudnessGainDb, TRUE_PEAK_CEILING_DBTP - track.truePeakDb);
}

/** Converts a gain in dB to the linear factor that `GainNode.gain` expects. */
export function gainDbToLinear(gainDb: number): number {
  return 10 ** (gainDb / 20);
}
