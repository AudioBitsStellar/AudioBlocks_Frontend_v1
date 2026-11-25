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
 * Reload a signed manifest this long before its segment URLs expire (#811).
 * The backend signs segment URLs for 10 minutes; the margin covers the manifest
 * round trip and clock skew.
 */
export const SIGNED_URL_REFRESH_MARGIN_MS = 60_000;

/**
 * Upper bound on manifest reloads per source (#811). At the backend's 10-minute
 * expiry this covers about 3.5 hours of continuous playback.
 */
export const MAX_SIGNED_REFRESHES = 24;

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

/**
 * Absolute expiry of a presigned URL, in ms since the epoch. Reads the SigV4
 * (`X-Amz-Date` + `X-Amz-Expires`) or SigV2 (`Expires`) query parameters and
 * returns undefined for unsigned URLs, which never need a refresh (#811).
 */
export function getSignedUrlExpiryMs(url: string): number | undefined {
  let params: URLSearchParams;
  try {
    params = new URL(url, 'http://localhost').searchParams;
  } catch {
    return undefined;
  }
  const amzDate = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(
    params.get('X-Amz-Date') ?? ''
  );
  const amzExpires = Number(params.get('X-Amz-Expires'));
  if (amzDate && amzExpires > 0) {
    const signedAt = Date.UTC(
      Number(amzDate[1]),
      Number(amzDate[2]) - 1,
      Number(amzDate[3]),
      Number(amzDate[4]),
      Number(amzDate[5]),
      Number(amzDate[6])
    );
    return signedAt + amzExpires * 1000;
  }
  const expires = Number(params.get('Expires'));
  return expires > 0 ? expires * 1000 : undefined;
}

/**
 * A controller exists before the lazy import resolves, so rapid skips can cancel it.
 *
 * Recovery for long or unreliable playback (#810, #811): a segment 403 or a
 * signed manifest nearing expiry reloads the manifest from `url`, which signs
 * fresh segment URLs. A stall or an exhausted network retry steps the rendition
 * down one level before the source gives up.
 */
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
  let refreshing = false;
  let refreshes = 0;
  let expiresAt: number | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
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
  /** Reloads the manifest so the stream endpoint signs new segment URLs (#811). */
  const refreshSource = (): boolean => {
    if (disposed || !hls || refreshes >= MAX_SIGNED_REFRESHES) return false;
    if (refreshing) return true;
    refreshes++;
    refreshing = true;
    clearTimeout(refreshTimer);
    hls.loadSource(url);
    return true;
  };
  /** Arms a reload shortly before the current manifest's segment URLs expire (#811). */
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    if (disposed || warming || expiresAt === undefined) return;
    if (refreshes >= MAX_SIGNED_REFRESHES) return;
    const delay = Math.max(0, expiresAt - Date.now() - SIGNED_URL_REFRESH_MARGIN_MS);
    refreshTimer = setTimeout(refreshSource, delay);
  };
  /**
   * Drops the rendition one step below the one playing (#810), so a stalling or
   * failing connection fetches smaller segments. Returns false at the lowest level.
   */
  const stepDownBitrate = (): boolean => {
    if (!hls || (hls.levels?.length ?? 0) < 2) return false;
    const current = hls.currentLevel;
    if (!(current > 0)) return false;
    const lower = current - 1;
    hls.autoLevelCapping = lower;
    hls.nextAutoLevel = lower;
    return true;
  };
  const controller: AudioSource = {
    resume() {
      warming = false;
      if (hls) {
        hls.config.maxBufferLength = 30;
        hls.config.maxMaxBufferLength = 600;
        hls.startLoad(-1);
        scheduleRefresh();
      } else audio.preload = 'auto';
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      clearTimeout(refreshTimer);
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
          else if (refreshing) hls?.startLoad(audio.currentTime);
          refreshing = false;
        });
        hls.on(
          HlsClass.Events.LEVEL_LOADED,
          (_event: string, data: { details: { fragments: ReadonlyArray<{ url: string }> } }) => {
            // Segment URLs in one manifest are signed together: the first sets the deadline.
            const first = data.details.fragments[0];
            expiresAt = first ? getSignedUrlExpiryMs(first.url) : undefined;
            scheduleRefresh();
          }
        );
        hls.on(HlsClass.Events.FRAG_BUFFERED, () => {
          // Stop after the first complete segment; resume only when this deck becomes audible.
          if (warming) hls?.stopLoad();
          ready();
        });
        hls.on(HlsClass.Events.ERROR, (_event: string, data: ErrorData) => {
          if (disposed) return;
          // A 403 on a segment means its presigned URL expired. Retrying that URL cannot succeed.
          const expiredSegment =
            data.details === HlsClass.ErrorDetails.FRAG_LOAD_ERROR && data.response?.code === 403;
          if (expiredSegment && refreshSource()) return;
          if (!data.fatal) {
            // hls.js retries non-fatal errors itself. A stall means the rendition is too high.
            if (data.details === HlsClass.ErrorDetails.BUFFER_STALLED_ERROR) stepDownBitrate();
            return;
          }
          refreshing = false;
          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR && networkRetries++ < 1)
            hls?.startLoad();
          else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR && mediaRetries++ < 1)
            hls?.recoverMediaError();
          else if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR && stepDownBitrate())
            hls?.startLoad();
          else fail('Unable to stream this track. Please try another song.');
        });
        hls.attachMedia(audio);
        hls.loadSource(url);
      })
      .catch(() => fail('Unable to load the audio player. Please try again.'));
  }
  return controller;
}
