/**
 * Audio preprocessing before AI analysis (#406).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative for AudioBlock.
 * Runs before `analyzeSongQuality` in `lib/uploadQualityPipeline.ts` so the
 * model gets clean, bounded input and obviously broken uploads never reach a
 * paid NVIDIA API call:
 *
 * 1. Metadata normalization — trim, strip control characters, collapse
 *    whitespace, and cap lyrics to a prompt-safe length.
 * 2. Container sniffing — identify WAV / MP3 / FLAC / OGG / M4A from magic bytes.
 * 3. WAV decoding (16-bit PCM) — read sample rate, channel count and duration
 *    from the header, and measure peak / RMS level to catch silent files.
 * 4. Verdict — `ok: false` (with `rejectReason`) only for uploads that cannot
 *    be meaningfully analysed (empty or digitally silent audio, invalid
 *    duration). Anything merely unusual becomes a `warning`.
 */

export type AudioContainer = 'wav' | 'mp3' | 'flac' | 'ogg' | 'm4a' | 'unknown';

export interface AudioPreprocessingInput {
  title: string;
  artist?: string;
  genre?: string;
  lyrics?: string;
  durationSeconds?: number;
  audioBuffer?: ArrayBuffer | Uint8Array | string;
}

export interface AudioSignalStats {
  container: AudioContainer;
  byteLength: number;
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  durationSeconds?: number;
  /** Peak sample level in dBFS (0 = full scale); -Infinity for digital silence. */
  peakDbfs?: number;
  /** RMS level in dBFS; -Infinity for digital silence. */
  rmsDbfs?: number;
}

export interface PreprocessedAudio {
  /** False when the upload should be rejected without calling the AI model. */
  ok: boolean;
  rejectReason?: string;
  warnings: string[];
  /** Normalized metadata to pass to `analyzeSongQuality`. */
  metadata: {
    title: string;
    artist?: string;
    genre?: string;
    lyrics?: string;
    durationSeconds?: number;
  };
  /** Present when an audio buffer was supplied as binary data. */
  signal?: AudioSignalStats;
}

/** Longest lyrics excerpt sent to the model (characters). */
export const MAX_LYRICS_CHARS = 4000;
/** Longest accepted track (seconds) — 30 minutes. */
export const MAX_DURATION_SECONDS = 30 * 60;
/** Below this peak level (dBFS) a track is treated as silent. */
export const SILENCE_PEAK_DBFS = -60;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(value: string | undefined, maxLength?: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  let text = String(value).replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n');
  // Collapse runs of spaces/tabs but keep line breaks (lyrics are line-based).
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (maxLength !== undefined && text.length > maxLength) {
    text = text.slice(0, maxLength).trimEnd();
  }
  return text.length > 0 ? text : undefined;
}

function toBytes(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let s = '';
  for (let i = offset; i < offset + length && i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

/** Identify the audio container from its leading magic bytes. */
export function detectAudioContainer(bytes: Uint8Array): AudioContainer {
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') {
    return 'wav';
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === 'fLaC') return 'flac';
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === 'OggS') return 'ogg';
  if (bytes.length >= 8 && ascii(bytes, 4, 4) === 'ftyp') return 'm4a';
  if (bytes.length >= 3 && ascii(bytes, 0, 3) === 'ID3') return 'mp3';
  // MPEG audio frame sync: 11 set bits.
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'mp3';
  return 'unknown';
}

function toDbfs(amplitude: number): number {
  return amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
}

/**
 * Parse a PCM WAV file: header fields plus peak/RMS level of 16-bit data.
 * Returns only the header fields for non-16-bit or non-PCM data.
 */
export function analyzeWav(bytes: Uint8Array): Omit<AudioSignalStats, 'container' | 'byteLength'> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let audioFormat: number | undefined;
  let channels: number | undefined;
  let sampleRate: number | undefined;
  let bitsPerSample: number | undefined;
  let dataOffset: number | undefined;
  let dataLength: number | undefined;

  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ' && body + 16 <= bytes.length) {
      audioFormat = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === 'data') {
      dataOffset = body;
      dataLength = Math.min(size, bytes.length - body);
      break;
    }
    offset = body + size + (size % 2); // chunks are word-aligned
  }

  const stats: Omit<AudioSignalStats, 'container' | 'byteLength'> = {
    sampleRate,
    channels,
    bitsPerSample,
  };
  if (!sampleRate || !channels || !bitsPerSample || dataOffset === undefined || !dataLength) {
    return stats;
  }

  const bytesPerFrame = channels * (bitsPerSample / 8);
  stats.durationSeconds = bytesPerFrame > 0 ? dataLength / bytesPerFrame / sampleRate : undefined;

  // Level measurement for 16-bit integer PCM (format 1) only.
  if (audioFormat === 1 && bitsPerSample === 16) {
    const sampleCount = Math.floor(dataLength / 2);
    let peak = 0;
    let sumSquares = 0;
    for (let i = 0; i < sampleCount; i++) {
      const v = view.getInt16(dataOffset + i * 2, true) / 32768;
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sumSquares += v * v;
    }
    stats.peakDbfs = toDbfs(peak);
    stats.rmsDbfs = sampleCount > 0 ? toDbfs(Math.sqrt(sumSquares / sampleCount)) : -Infinity;
  }
  return stats;
}

/** Normalize metadata and inspect the audio before AI analysis. */
export function preprocessAudio(input: AudioPreprocessingInput): PreprocessedAudio {
  const warnings: string[] = [];

  const rawLyrics = cleanText(input.lyrics);
  const lyrics = cleanText(input.lyrics, MAX_LYRICS_CHARS);
  if (rawLyrics && lyrics && rawLyrics.length > lyrics.length) {
    warnings.push(`Lyrics truncated to ${MAX_LYRICS_CHARS} characters for analysis.`);
  }

  const metadata: PreprocessedAudio['metadata'] = {
    title: cleanText(input.title) ?? 'Untitled',
    artist: cleanText(input.artist),
    genre: cleanText(input.genre),
    lyrics,
  };

  let signal: AudioSignalStats | undefined;
  if (input.audioBuffer !== undefined && typeof input.audioBuffer !== 'string') {
    const bytes = toBytes(input.audioBuffer);
    if (bytes.length === 0) {
      return { ok: false, rejectReason: 'Uploaded audio file is empty.', warnings, metadata };
    }
    const container = detectAudioContainer(bytes);
    signal = { container, byteLength: bytes.length };
    if (container === 'wav') {
      signal = { ...signal, ...analyzeWav(bytes) };
    } else if (container === 'unknown') {
      warnings.push('Unrecognized audio container; skipping signal analysis.');
    }
  }

  // Duration: prefer the caller's value, fall back to the decoded header.
  const duration =
    typeof input.durationSeconds === 'number' && Number.isFinite(input.durationSeconds)
      ? input.durationSeconds
      : signal?.durationSeconds;
  if (duration !== undefined) {
    if (duration <= 0) {
      return { ok: false, rejectReason: 'Track duration must be greater than zero.', warnings, metadata, signal };
    }
    if (duration > MAX_DURATION_SECONDS) {
      return {
        ok: false,
        rejectReason: `Track exceeds the maximum length of ${MAX_DURATION_SECONDS / 60} minutes.`,
        warnings,
        metadata,
        signal,
      };
    }
    metadata.durationSeconds = Math.round(duration * 10) / 10;
  }

  if (signal?.peakDbfs !== undefined && signal.peakDbfs < SILENCE_PEAK_DBFS) {
    return {
      ok: false,
      rejectReason: 'Uploaded audio is silent (no signal above -60 dBFS).',
      warnings,
      metadata,
      signal,
    };
  }
  if (signal?.peakDbfs !== undefined && signal.peakDbfs >= -0.1) {
    warnings.push('Audio peaks at full scale; the master may be clipping.');
  }

  return { ok: true, warnings, metadata, signal };
}
