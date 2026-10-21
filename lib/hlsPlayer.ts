import type Hls from 'hls.js';
import type { ErrorData } from 'hls.js';

export interface AudioSource {
  resume: () => void;
  destroy: () => void;
  /** Applies a bitrate ceiling to a running source; `undefined` removes it. */
  setMaxBitrate: (kbps: number | undefined) => void;
}

interface Options {
  prefetch?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
  /**
   * Highest bitrate in kbps that hls.js may pick (#590). Native HLS (Safari)
   * ignores it because the browser chooses the rendition itself.
   */
  maxBitrateKbps?: number;
}

/**
 * Level index to pass as `autoLevelCapping`: the highest level at or under the
 * ceiling. If no level fits, the lowest level is used so playback still works.
 * Returns -1 (no cap) when there is no ceiling or no levels.
 */
export function selectLevelCap(bitrates: readonly number[], maxKbps: number | undefined): number {
  if (maxKbps === undefined || bitrates.length === 0) return -1;
  const limit = maxKbps * 1000;
  let best = -1;
  let lowest = 0;
  bitrates.forEach((bitrate, index) => {
    if (bitrate < bitrates[lowest]) lowest = index;
    if (bitrate <= limit && (best === -1 || bitrate > bitrates[best])) best = index;
  });
  return best === -1 ? lowest : best;
}

/** A controller exists before the lazy import resolves, so rapid skips can cancel it. */
export function attachAudioSource(
  audio: HTMLAudioElement,
  url: string,
  options: Options = {}
): AudioSource {
  let disposed = false;
  let hls: Hls | undefined;
  let warming = options.prefetch ?? false;
  let notified = false;
  let networkRetries = 0;
  let mediaRetries = 0;
  let manifestReady = false;
  let maxKbps = options.maxBitrateKbps;
  const ready = () => {
    if (!disposed && !notified) {
      notified = true;
      options.onReady?.();
    }
  };
  const applyCap = () => {
    if (!hls || !manifestReady) return;
    const index = selectLevelCap(hls.levels.map((level) => level.bitrate), maxKbps);
    hls.autoLevelCapping = index;
    // Start on the capped level so the first segment is not above the ceiling.
    if (index >= 0) hls.startLevel = index;
  };
  const controller: AudioSource = {
    resume() {
      warming = false;
      if (hls) {
        hls.config.maxBufferLength = 30;
        hls.config.maxMaxBufferLength = 600;
        hls.startLoad(-1);
      } else audio.preload = 'auto';
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      hls?.destroy();
      audio.removeEventListener('canplay', ready);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
    setMaxBitrate(kbps) {
      maxKbps = kbps;
      applyCap();
    },
  };
  const fail = (message: string) => {
    if (!disposed) {
      controller.destroy();
      options.onError?.(new Error(message));
    }
  };
  const isDirectFile = /\.(mp3|wav|ogg|m4a|aac)(?:[?#]|$)/i.test(url);
  if (isDirectFile || (!options.prefetch && audio.canPlayType('application/vnd.apple.mpegurl'))) {
    audio.crossOrigin = 'anonymous';
    audio.preload = warming ? 'metadata' : 'auto';
    audio.addEventListener('canplay', ready);
    audio.src = url;
    audio.load();
  } else {
    void import('hls.js')
      .then(({ default: HlsClass }) => {
        if (disposed) return;
        if (!HlsClass.isSupported()) {
          fail('This browser does not support HLS audio playback.');
          return;
        }
        hls = new HlsClass({
          autoStartLoad: !warming,
          maxBufferLength: warming ? 0.1 : 30,
          maxMaxBufferLength: warming ? 0.1 : 600,
          maxBufferSize: warming ? 1 : 60 * 1000 * 1000,
          enableWorker: true,
          testBandwidth: false,
        });
        hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
          manifestReady = true;
          applyCap();
          if (warming) hls?.startLoad(0);
        });
        hls.on(HlsClass.Events.FRAG_BUFFERED, () => {
          // Stop after the first complete segment; resume only when this deck becomes audible.
          if (warming) hls?.stopLoad();
          ready();
        });
        hls.on(HlsClass.Events.ERROR, (_event: string, data: ErrorData) => {
          if (!data.fatal || disposed) return;
          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR && networkRetries++ < 1)
            hls?.startLoad();
          else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR && mediaRetries++ < 1)
            hls?.recoverMediaError();
          else fail('Unable to stream this track. Please try another song.');
        });
        hls.attachMedia(audio);
        hls.loadSource(url);
      })
      .catch(() => fail('Unable to load the audio player. Please try again.'));
  }
  return controller;
}
