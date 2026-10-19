/**
 * Web Audio helpers for the player (#602): normalization (#328) and
 * crossfade (#115) routing. Pure functions over Web Audio nodes; the
 * stateful wiring lives in `hooks/player/useAudioEngine.ts`.
 */

/** element → compressor → gain → destination (#328). */
export interface NormalizationGraph {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  compressor: DynamicsCompressorNode;
  gain: GainNode;
}

/** element → gain → destination, used for the crossfade envelope (#115). */
export interface GainRoute {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

export function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return AudioCtx ? new AudioCtx() : null;
}

export function disconnect(...nodes: (AudioNode | null | undefined)[]): void {
  for (const node of nodes) {
    try {
      node?.disconnect();
    } catch {
      // already disconnected
    }
  }
}

/**
 * Apply (or neutralize) the loudness-normalization compressor settings.
 * With a ratio of 1 and threshold of 0 the compressor is a passthrough, so
 * toggling normalization off never requires rebuilding the audio graph.
 */
export function applyNormalizationParams(
  compressor: DynamicsCompressorNode | undefined,
  enabled: boolean
): void {
  if (!compressor) return;
  compressor.threshold.value = enabled ? -24 : 0;
  compressor.knee.value = enabled ? 30 : 0;
  compressor.ratio.value = enabled ? 12 : 1;
  compressor.attack.value = enabled ? 0.003 : 0;
  compressor.release.value = enabled ? 0.25 : 0;
}

/**
 * `createMediaElementSource` may only be called once per element, so this
 * returns null when the element is already routed through another graph.
 */
export function createNormalizationGraph(
  ctx: AudioContext,
  element: HTMLAudioElement
): NormalizationGraph | null {
  try {
    const source = ctx.createMediaElementSource(element);
    const compressor = ctx.createDynamicsCompressor();
    const gain = ctx.createGain();
    source.connect(compressor);
    compressor.connect(gain);
    gain.connect(ctx.destination);
    return { element, source, compressor, gain };
  } catch {
    return null;
  }
}

/** Throws when the element is already routed; callers fall back to `element.volume`. */
export function createGainRoute(
  ctx: AudioContext,
  element: HTMLAudioElement,
  initialGain: number
): GainRoute {
  const source = ctx.createMediaElementSource(element);
  const gain = ctx.createGain();
  source.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.value = initialGain;
  return { source, gain };
}
