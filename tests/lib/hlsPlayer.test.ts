import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachAudioSource, selectLevelCap } from '@/lib/hlsPlayer';
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
    static Events = { MANIFEST_PARSED: 'manifest', FRAG_BUFFERED: 'buffered', ERROR: 'error' };
    static ErrorTypes = { NETWORK_ERROR: 'network', MEDIA_ERROR: 'media' };
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
afterEach(() => vi.restoreAllMocks());
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
