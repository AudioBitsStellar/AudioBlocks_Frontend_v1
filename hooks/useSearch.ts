import { useState, useEffect } from 'react';
import { searchContent, SearchResult } from '@/lib/exploreService';

export function useSearch(query: string, debounceMs = 200) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Each query gets its own controller so a newer query (or unmount) cancels
    // the in-flight request and its late response can't overwrite fresher state.
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchContent(query.trim(), { signal: controller.signal });
        if (controller.signal.aborted) return;
        setResults(res);
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error(e);
        setResults([]);
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, debounceMs]);

  return { results, loading, error };
}
