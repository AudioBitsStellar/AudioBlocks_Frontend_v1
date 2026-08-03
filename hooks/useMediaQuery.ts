'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

export interface UseMediaQueryOptions {
  defaultValue?: boolean;
}

/**
 * Reactive media query hook using `window.matchMedia`.
 *
 * Returns `defaultValue` during SSR and hydration to avoid hydration
 * mismatches. Updates reactively when the viewport changes without
 * causing layout thrashing.
 */
export function useMediaQuery(
  query: string,
  options: UseMediaQueryOptions = {}
): boolean {
  const { defaultValue = false } = options;
  const [matches, setMatches] = useState<boolean>(defaultValue);
  const mqlRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(query);
    mqlRef.current = mql;

    // Set the initial value synchronously
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mql.addEventListener('change', handler);

    return () => {
      mql.removeEventListener('change', handler);
    };
  }, [query, defaultValue]);

  return matches;
}

/**
 * Returns `true` when the viewport is narrower than 768px.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Returns `true` when the viewport is between 768px and 1023px.
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Returns `true` when the viewport is 1024px or wider.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}