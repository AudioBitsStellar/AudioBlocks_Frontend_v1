import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TTFATracker, TTFA_TARGET_MS } from '@/lib/metrics/ttfa';

describe('PERF-02 (#827): Time-to-First-Audio (TTFA) Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accurately calculates TTFA duration when track is started and audio is ready', async () => {
    TTFATracker.startTrack('track-123');
    await new Promise((r) => setTimeout(r, 20));
    const measurement = TTFATracker.recordAudioReady('track-123', 'https://cdn.audioblocks.io/stream/track-123.m3u8', false);

    expect(measurement).not.toBeNull();
    expect(measurement?.trackId).toBe('track-123');
    expect(measurement?.ttfaMs).toBeGreaterThanOrEqual(15);
    expect(measurement?.cached).toBe(false);
  });

  it('returns null if audio ready is called without starting track', () => {
    const measurement = TTFATracker.recordAudioReady('unknown-track', 'https://example.com/audio.mp3');
    expect(measurement).toBeNull();
  });

  it('creates a preload link when prefetching an audio segment', () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    TTFATracker.prefetchAudioSegment('https://cdn.audioblocks.io/segments/track-456_0.ts');

    expect(appendSpy).toHaveBeenCalled();
    const link = appendSpy.mock.calls[0][0] as HTMLLinkElement;
    expect(link.rel).toBe('preload');
    expect(link.href).toBe('https://cdn.audioblocks.io/segments/track-456_0.ts');
  });
});
