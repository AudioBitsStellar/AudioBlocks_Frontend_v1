/**
 * Streaming quality settings and the bitrate ceiling each one implies (#590).
 *
 * The ceiling is applied to HLS playback in `lib/hlsPlayer.ts`. Safari plays
 * HLS natively and cannot be capped, so the setting only takes effect in
 * browsers that go through hls.js.
 */

export type AudioQuality = 'auto' | 'data-saver' | 'normal' | 'high';

export const AUDIO_QUALITY_LABELS: Record<AudioQuality, string> = {
  auto: 'Auto',
  'data-saver': 'Data saver',
  normal: 'Normal',
  high: 'High',
};

/** Bitrate ceiling in kbps for each fixed setting. `auto` has no fixed ceiling. */
export const QUALITY_CAP_KBPS: Record<Exclude<AudioQuality, 'auto'>, number> = {
  'data-saver': 64,
  normal: 128,
  high: 256,
};

/** Ceiling used by Auto when Save-Data is on or the data saver toggle is enabled. */
export const DATA_SAVER_CAP_KBPS = QUALITY_CAP_KBPS['data-saver'];

/**
 * Accepts a stored or synced value and returns a valid setting. The values
 * saved before #590 (`low`, `medium`) map to their closest new setting.
 */
export function normalizeAudioQuality(value: unknown): AudioQuality {
  switch (value) {
    case 'data-saver':
    case 'low':
      return 'data-saver';
    case 'normal':
    case 'medium':
      return 'normal';
    case 'high':
      return 'high';
    default:
      return 'auto';
  }
}

/**
 * Bitrate ceiling in kbps for a setting, or `undefined` for no ceiling.
 * Auto drops to the data saver ceiling while data saver is on.
 */
export function resolveBitrateCap(quality: AudioQuality, dataSaver: boolean): number | undefined {
  if (quality === 'auto') return dataSaver ? DATA_SAVER_CAP_KBPS : undefined;
  return QUALITY_CAP_KBPS[quality];
}

/** Short description of what the listener will get, for the player's info menu. */
export function describeStreamQuality(quality: AudioQuality, dataSaver: boolean): string {
  const cap = resolveBitrateCap(quality, dataSaver);
  if (cap === undefined) return `${AUDIO_QUALITY_LABELS[quality]} · adaptive`;
  const label = quality === 'auto' ? 'Auto · data saver' : AUDIO_QUALITY_LABELS[quality];
  return `${label} · up to ${cap} kbps`;
}
