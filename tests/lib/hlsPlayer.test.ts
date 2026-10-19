import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachAudioSource } from '@/lib/hlsPlayer';
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
