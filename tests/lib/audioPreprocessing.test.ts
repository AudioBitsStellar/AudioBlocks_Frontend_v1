import { describe, it, expect } from 'vitest';
import {
  preprocessAudio,
  detectAudioContainer,
  analyzeWav,
  MAX_LYRICS_CHARS,
} from '@/lib/audioPreprocessing';

/** Build a 16-bit PCM mono WAV from float samples in [-1, 1]. */
function wav(samples: number[], sampleRate = 8000): Uint8Array {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataLen, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.round(s * 32767), true));
  return new Uint8Array(buf);
}

const tone = (n: number, amp = 0.5) => Array.from({ length: n }, (_, i) => amp * Math.sin(i / 3));

describe('Audio preprocessing before AI analysis (#406)', () => {
  it('normalizes metadata: trims, strips control chars and collapses whitespace', () => {
    const r = preprocessAudio({ title: '  My\u0007  Song ', artist: ' DJ  X ', genre: ' Afrobeats ' });
    expect(r.ok).toBe(true);
    expect(r.metadata).toMatchObject({ title: 'My Song', artist: 'DJ X', genre: 'Afrobeats' });
  });

  it('caps lyrics to the prompt budget and warns', () => {
    const r = preprocessAudio({ title: 't', lyrics: 'la '.repeat(MAX_LYRICS_CHARS) });
    expect(r.metadata.lyrics!.length).toBeLessThanOrEqual(MAX_LYRICS_CHARS);
    expect(r.warnings.join(' ')).toMatch(/truncated/);
  });

  it('detects containers from magic bytes', () => {
    expect(detectAudioContainer(wav(tone(10)))).toBe('wav');
    expect(detectAudioContainer(new TextEncoder().encode('fLaC....'))).toBe('flac');
    expect(detectAudioContainer(new TextEncoder().encode('OggS....'))).toBe('ogg');
    expect(detectAudioContainer(new TextEncoder().encode('ID3.....'))).toBe('mp3');
    expect(detectAudioContainer(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBe('mp3');
    expect(detectAudioContainer(new TextEncoder().encode('....ftypM4A '))).toBe('m4a');
    expect(detectAudioContainer(new Uint8Array([1, 2, 3, 4]))).toBe('unknown');
  });

  it('reads WAV header fields, duration and level', () => {
    const stats = analyzeWav(wav(tone(8000), 8000));
    expect(stats).toMatchObject({ sampleRate: 8000, channels: 1, bitsPerSample: 16 });
    expect(stats.durationSeconds).toBeCloseTo(1, 5);
    expect(stats.peakDbfs!).toBeLessThan(-5);
    expect(stats.peakDbfs!).toBeGreaterThan(-7); // amplitude 0.5 ≈ -6 dBFS
  });

  it('fills durationSeconds from the WAV header when not supplied', () => {
    const r = preprocessAudio({ title: 't', audioBuffer: wav(tone(16000), 8000) });
    expect(r.ok).toBe(true);
    expect(r.metadata.durationSeconds).toBe(2);
  });

  it('rejects empty and silent audio before any AI call', () => {
    expect(preprocessAudio({ title: 't', audioBuffer: new Uint8Array() })).toMatchObject({
      ok: false,
      rejectReason: expect.stringMatching(/empty/),
    });
    const silent = preprocessAudio({ title: 't', audioBuffer: wav(new Array(8000).fill(0)) });
    expect(silent.ok).toBe(false);
    expect(silent.rejectReason).toMatch(/silent/);
  });

  it('rejects invalid durations', () => {
    expect(preprocessAudio({ title: 't', durationSeconds: 0 }).ok).toBe(false);
    expect(preprocessAudio({ title: 't', durationSeconds: 3 * 60 * 60 }).ok).toBe(false);
  });

  it('warns (but does not reject) on clipping or an unknown container', () => {
    const clipped = preprocessAudio({ title: 't', audioBuffer: wav([1, -1, 1, -1, 0.9]) });
    expect(clipped.ok).toBe(true);
    expect(clipped.warnings.join(' ')).toMatch(/clipping/);
    const unknown = preprocessAudio({ title: 't', audioBuffer: new Uint8Array([1, 2, 3, 4]) });
    expect(unknown.ok).toBe(true);
    expect(unknown.warnings.join(' ')).toMatch(/Unrecognized/);
  });

  it('leaves string buffers (pre-hashed references) untouched', () => {
    const r = preprocessAudio({ title: 't', audioBuffer: 'ipfs://abc' });
    expect(r.ok).toBe(true);
    expect(r.signal).toBeUndefined();
  });
});
