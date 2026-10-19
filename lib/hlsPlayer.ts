import type Hls from 'hls.js';
import type { ErrorData } from 'hls.js';
export interface AudioSource {
  resume: () => void;
  destroy: () => void;
}
interface Options {
  prefetch?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
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
  const ready = () => {
    if (!disposed && !notified) {
      notified = true;
      options.onReady?.();
    }
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
