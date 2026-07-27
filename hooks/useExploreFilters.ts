'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface ExploreFilters {
  genre: string | null;
  mood: string | null;
  durationMin: number | null;
  durationMax: number | null;
  bpmMin: number | null;
  bpmMax: number | null;
}

export type ExploreFilterDefaults = Partial<ExploreFilters>;

const DEFAULT_FILTERS: ExploreFilters = {
  genre: null,
  mood: null,
  durationMin: null,
  durationMax: null,
  bpmMin: null,
  bpmMax: null,
};

const FILTER_KEYS = Object.keys(DEFAULT_FILTERS) as (keyof ExploreFilters)[];

function parseNumericParam(searchParams: URLSearchParams, key: string, fallback: number | null): number | null {
  const raw = searchParams.get(key);
  if (raw === null) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

function parseFilters(searchParams: URLSearchParams, defaults: ExploreFilters): ExploreFilters {
  return {
    genre: searchParams.get('genre') ?? defaults.genre,
    mood: searchParams.get('mood') ?? defaults.mood,
    durationMin: parseNumericParam(searchParams, 'durationMin', defaults.durationMin),
    durationMax: parseNumericParam(searchParams, 'durationMax', defaults.durationMax),
    bpmMin: parseNumericParam(searchParams, 'bpmMin', defaults.bpmMin),
    bpmMax: parseNumericParam(searchParams, 'bpmMax', defaults.bpmMax),
  };
}

/**
 * Manages explore-page filter state (genre, mood, duration/BPM range) with
 * bidirectional URL query param sync, so filtered views are shareable and
 * support the browser back button.
 */
export function useExploreFilters(defaultFilters: ExploreFilterDefaults = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaults = useMemo(() => ({ ...DEFAULT_FILTERS, ...defaultFilters }), [defaultFilters]);
  const filters = useMemo(() => parseFilters(searchParams, defaults), [searchParams, defaults]);

  const updateFilters = useCallback(
    (patch: Partial<ExploreFilters>) => {
      const next = { ...filters, ...patch };
      const params = new URLSearchParams(searchParams.toString());

      for (const key of FILTER_KEYS) {
        const value = next[key];
        if (value === null || value === undefined || value === defaults[key]) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, defaults, searchParams, pathname, router],
  );

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const activeFilterCount = useMemo(
    () => FILTER_KEYS.filter((key) => filters[key] !== null && filters[key] !== defaults[key]).length,
    [filters, defaults],
  );

  return { filters, updateFilters, clearFilters, activeFilterCount };
}
