import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachAudioSource, getSignedUrlExpiryMs, selectLevelCap } from '@/lib/hlsPlayer';
const { instances } = vi.hoisted(() => ({
  instances: [] as {
    config: Record<string, unknown>;
    handlers: Record<string, (...args: unknown[]) => void>;
    startLoad: ReturnType<typeof vi.fn>;
    stopLoad: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    recoverMediaError: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock('hls.js', () => {
  class FakeHls {
    static isSupported = () => true;
    static Events = {
      MANIFEST_PARSED: 'manifest',
      FRAG_BUFFERED: 'buffered',
      ERROR: 'error',
      LEVEL_LOADED: 'levelLoaded',
    };
    static ErrorTypes = { NETWORK_ERROR: 'network', MEDIA_ERROR: 'media' };
    static ErrorDetails = {
      FRAG_LOAD_ERROR: 'fragLoadError',
      BUFFER_STALLED_ERROR: 'bufferStalledError',
    };
    handlers: Record<string, (...args: unknown[]) => void> = {};
    startLoad = vi.fn();
    stopLoad = vi.fn();
    destroy = vi.fn();
    recoverMediaError = vi.fn();
    attachMedia = vi.fn();
    loadSource = vi.fn();
    constructor(public config: Record<string, unknown>) {
      instances.push(this);
    }
    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers[event] = handler;
    }
  }
  return { default: FakeHls };
});
const flush = async () => {
  await vi.dynamicImportSettled();
};
beforeEach(() => {
  instances.length = 0;
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe('HLS source lifecycle', () => {
  it('uses native HLS where available', () => {
    const audio = document.createElement('audio');
    vi.spyOn(audio, 'canPlayType').mockReturnValue('probably');
    const source = attachAudioSource(audio, 'https://audio.example/a.m3u8');
    expect(audio.src).toContain('/a.m3u8');
    source.destroy();
    expect(audio.hasAttribute('src')).toBe(false);
  });
  it('loads exactly the initial segment, stops, and resumes on promotion', async () => {
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one', {
      prefetch: true,
    });
    await flush();
    const hls = instances[0];
    expect(hls.config.autoStartLoad).toBe(false);
    hls.handlers.manifest();
    expect(hls.startLoad).toHaveBeenCalledWith(0);
    hls.handlers.buffered();
    expect(hls.stopLoad).toHaveBeenCalledOnce();
    source.resume();
    expect(hls.startLoad).toHaveBeenCalledWith(-1);
    source.destroy();
    expect(hls.destroy).toHaveBeenCalledOnce();
  });
  it('cancels a source before its lazy import can allocate resources', async () => {
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one');
    source.destroy();
    await flush();
    expect(instances).toHaveLength(0);
  });
  it('bounds fatal retries then surfaces an error and destroys the instance', async () => {
    const onError = vi.fn();
    attachAudioSource(document.createElement('audio'), '/api/song/stream/one', { onError });
    await flush();
    const hls = instances[0];
    hls.handlers.error('error', { fatal: true, type: 'network' });
    expect(hls.startLoad).toHaveBeenCalledOnce();
    hls.handlers.error('error', { fatal: true, type: 'network' });
    expect(onError).toHaveBeenCalledOnce();
    expect(hls.destroy).toHaveBeenCalledOnce();
  });
});

describe('bitrate ceiling (#590)', () => {
  const LADDER = [{ bitrate: 64_000 }, { bitrate: 128_000 }, { bitrate: 256_000 }];

  it('picks the highest level at or under the ceiling', () => {
    expect(selectLevelCap([64_000, 128_000, 256_000], 64)).toBe(0);
    expect(selectLevelCap([64_000, 128_000, 256_000], 200)).toBe(1);
    expect(selectLevelCap([64_000, 128_000, 256_000], 256)).toBe(2);
  });

  it('falls back to the lowest level when none fit, and to -1 when uncapped', () => {
    expect(selectLevelCap([96_000, 192_000], 64)).toBe(0);
    expect(selectLevelCap([64_000, 128_000], undefined)).toBe(-1);
    expect(selectLevelCap([], 64)).toBe(-1);
  });

  it('caps a manifest so hls.js never auto-selects above the data saver level', async () => {
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one', {
      maxBitrateKbps: 64,
    });
    await flush();
    const hls = instances[0] as unknown as Record<string, unknown> & {
      levels: unknown[];
      handlers: Record<string, () => void>;
    };
    hls.levels = LADDER;
    hls.handlers.manifest();
    expect(hls.autoLevelCapping).toBe(0);
    expect(hls.startLevel).toBe(0);
    source.destroy();
  });

  it('re-applies a new ceiling to a playing source', async () => {
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one', {
      maxBitrateKbps: 64,
    });
    await flush();
    const hls = instances[0] as unknown as Record<string, unknown> & {
      levels: unknown[];
      handlers: Record<string, () => void>;
    };
    hls.levels = LADDER;
    hls.handlers.manifest();

    source.setMaxBitrate(256);
    expect(hls.autoLevelCapping).toBe(2);

    source.setMaxBitrate(undefined);
    expect(hls.autoLevelCapping).toBe(-1);
    source.destroy();
  });

  it('leaves native HLS playback alone, since the browser picks the rendition', () => {
    const audio = document.createElement('audio');
    vi.spyOn(audio, 'canPlayType').mockReturnValue('probably');
    const source = attachAudioSource(audio, 'https://audio.example/a.m3u8', { maxBitrateKbps: 64 });
    expect(() => source.setMaxBitrate(64)).not.toThrow();
    source.destroy();
  });
});

const FIXTURES = path.resolve('tests/fixtures/hls');
const readFixture = (name: string) => readFileSync(path.join(FIXTURES, name), 'utf8');
/** Segment URLs of a playlist, shaped like the fragments hls.js reports on LEVEL_LOADED. */
const fragmentsOf = (playlist: string) =>
  playlist
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((url) => ({ url }));
/** Bitrate ladder from a master playlist's BANDWIDTH attributes. */
const ladderOf = (master: string) =>
  [...master.matchAll(/BANDWIDTH=(\d+)/g)].map((match) => ({ bitrate: Number(match[1]) }));

/** The parts of the fake hls.js instance these tests drive. */
interface FakeHlsInstance {
  levels: { bitrate: number }[];
  currentLevel: number;
  autoLevelCapping?: number;
  nextAutoLevel?: number;
  handlers: Record<string, (...args: unknown[]) => void>;
  startLoad: ReturnType<typeof vi.fn>;
  loadSource: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}
const SEGMENT_403 = { fatal: false, details: 'fragLoadError', response: { code: 403 } };

describe('signed URL expiry (#811)', () => {
  it('reads the SigV4 expiry from X-Amz-Date and X-Amz-Expires', () => {
    expect(
      getSignedUrlExpiryMs(
        'https://example.test/a.bin?X-Amz-Date=20260101T000000Z&X-Amz-Expires=120'
      )
    ).toBe(Date.UTC(2026, 0, 1, 0, 2, 0));
  });

  it('reads the SigV2 expiry from the Expires epoch', () => {
    expect(getSignedUrlExpiryMs('https://example.test/a.bin?Expires=1767225600')).toBe(
      1767225600000
    );
  });

  it('returns undefined for unsigned or malformed URLs', () => {
    expect(getSignedUrlExpiryMs('/fixtures/hls/tone-0.bin')).toBeUndefined();
    expect(
      getSignedUrlExpiryMs('https://example.test/a.bin?X-Amz-Date=bad&X-Amz-Expires=120')
    ).toBeUndefined();
  });

  it('reloads a short-lived signed manifest 60 s before its segments expire', async () => {
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one');
    await flush();
    const hls = instances[0] as unknown as FakeHlsInstance;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    // The fixture's URLs are signed at 00:00:00 and expire after 120 s.
    hls.handlers.levelLoaded('levelLoaded', {
      details: { fragments: fragmentsOf(readFixture('signed-short-lived.m3u8')) },
    });
    vi.advanceTimersByTime(59_000);
    expect(hls.loadSource).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1_000);
    expect(hls.loadSource).toHaveBeenCalledTimes(2);
    source.destroy();
  });

  it('never reloads an unsigned manifest on a timer', async () => {
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one');
    await flush();
    const hls = instances[0] as unknown as FakeHlsInstance;
    vi.useFakeTimers();
    hls.handlers.levelLoaded('levelLoaded', {
      details: { fragments: fragmentsOf(readFixture('tone.m3u8')) },
    });
    vi.advanceTimersByTime(60 * 60_000);
    expect(hls.loadSource).toHaveBeenCalledOnce();
    source.destroy();
  });

  it('reloads the manifest on a 403 segment error instead of retrying the expired URL', async () => {
    const onError = vi.fn();
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one', {
      onError,
    });
    await flush();
    const hls = instances[0] as unknown as FakeHlsInstance;
    hls.handlers.error('error', SEGMENT_403);
    expect(hls.loadSource).toHaveBeenCalledTimes(2);
    // A second 403 while that reload is in flight does not start another one.
    hls.handlers.error('error', SEGMENT_403);
    expect(hls.loadSource).toHaveBeenCalledTimes(2);
    expect(hls.startLoad).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    source.destroy();
  });
});

describe('stall and bitrate fallback (#810)', () => {
  const FIXTURE_LADDER = ladderOf(readFixture('master.m3u8'));
  const NETWORK_ERROR = { fatal: true, type: 'network' };
  const STALL = { fatal: false, details: 'bufferStalledError' };

  /** Attaches a source to a fake instance that has the fixture ladder and is playing `level`. */
  async function playingAt(level: number, onError = vi.fn()) {
    const source = attachAudioSource(document.createElement('audio'), '/api/song/stream/one', {
      onError,
    });
    await flush();
    const hls = instances[0] as unknown as FakeHlsInstance;
    hls.levels = FIXTURE_LADDER;
    hls.currentLevel = level;
    return { source, hls, onError };
  }

  it('reads the bitrate ladder from the fixture master playlist', () => {
    expect(FIXTURE_LADDER.map((rung) => rung.bitrate)).toEqual([64_000, 128_000, 256_000]);
  });

  it('steps a stalled rendition down one level without failing the source', async () => {
    const { source, hls, onError } = await playingAt(2);
    hls.handlers.error('error', STALL);
    expect(hls.autoLevelCapping).toBe(1);
    expect(hls.nextAutoLevel).toBe(1);
    expect(onError).not.toHaveBeenCalled();
    expect(hls.destroy).not.toHaveBeenCalled();
    source.destroy();
  });

  it('keeps the lowest rendition when it stalls, since there is nothing lower', async () => {
    const { source, hls, onError } = await playingAt(0);
    hls.handlers.error('error', STALL);
    expect(hls.autoLevelCapping).toBeUndefined();
    expect(onError).not.toHaveBeenCalled();
    source.destroy();
  });

  it('retries at the same rendition once, then drops a level per failure before giving up', async () => {
    const { source, hls, onError } = await playingAt(2);
    hls.handlers.error('error', NETWORK_ERROR);
    expect(hls.startLoad).toHaveBeenCalledOnce();
    expect(hls.autoLevelCapping).toBeUndefined();

    hls.handlers.error('error', NETWORK_ERROR);
    expect(hls.autoLevelCapping).toBe(1);

    hls.currentLevel = 1;
    hls.handlers.error('error', NETWORK_ERROR);
    expect(hls.autoLevelCapping).toBe(0);

    hls.currentLevel = 0;
    hls.handlers.error('error', NETWORK_ERROR);
    expect(onError).toHaveBeenCalledOnce();
    expect(hls.destroy).toHaveBeenCalledOnce();
    source.destroy();
  });
});
