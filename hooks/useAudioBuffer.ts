'use client';

import { useEffect, useState } from 'react';
import { audioBufferCache } from '@/lib/audioCache';

export interface UseAudioBufferResult {
  buffer: AudioBuffer | null;
  isLoading: boolean;
  error: Error | null;
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioContextCtor =
      globalThis.AudioContext ||
      (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioContextCtor();
  }
  return sharedAudioContext;
}

/**
 * Loads and decodes audio into an AudioBuffer (via the Web Audio API),
 * caching decoded buffers so waveform/visualization consumers never
 * re-decode the same file. Supports any format the browser's
 * `decodeAudioData` supports (mp3, wav, ogg, ...).
 */
export function useAudioBuffer(url: string | undefined | null): UseAudioBufferResult {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(() => (url ? audioBufferCache.get(url) ?? null : null));
  const [isLoading, setIsLoading] = useState(!!url && !audioBufferCache.get(url ?? ''));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setBuffer(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = audioBufferCache.get(url);
    if (cached) {
      setBuffer(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setBuffer(null);
    setError(null);
    setIsLoading(true);

    (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const decoded = await getAudioContext().decodeAudioData(arrayBuffer);
        if (cancelled) return;

        audioBufferCache.set(url, decoded);
        setBuffer(decoded);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error('Failed to decode audio'));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url]);

  return { buffer, isLoading, error };
}
