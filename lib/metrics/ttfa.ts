/**
 * Time-to-First-Audio (TTFA) Metric Measurement & Prefetching Strategy
 * Launch Readiness PERF-02 (#827)
 */

export interface TTFAMeasurement {
  trackId: string;
  sourceUrl: string;
  requestInitiatedAt: number;
  audioCanPlayAt: number;
  ttfaMs: number;
  cached: boolean;
}

export const TTFA_TARGET_MS = 800; // Target <800ms TTFA on broadband

export class TTFATracker {
  private static marks = new Map<string, number>();

  static startTrack(trackId: string) {
    this.marks.set(trackId, performance.now());
  }

  static recordAudioReady(trackId: string, sourceUrl: string, cached = false): TTFAMeasurement | null {
    const start = this.marks.get(trackId);
    if (!start) return null;
    const now = performance.now();
    const ttfaMs = Math.round(now - start);
    this.marks.delete(trackId);

    const measurement: TTFAMeasurement = {
      trackId,
      sourceUrl,
      requestInitiatedAt: start,
      audioCanPlayAt: now,
      ttfaMs,
      cached,
    };

    return measurement;
  }

  static prefetchAudioSegment(url: string) {
    if (typeof window === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = url;
    document.head.appendChild(link);
  }
}
