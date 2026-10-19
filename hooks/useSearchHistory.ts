'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

const MAX_HISTORY = 20;
export const SEARCH_HISTORY_STORAGE_KEY = 'audioblocks_search_history';
const LEGACY_STORAGE_KEY = 'search-history';

function parseHistory(value: string | null): SearchHistoryEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SearchHistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        'query' in entry &&
        typeof entry.query === 'string' &&
        'timestamp' in entry &&
        typeof entry.timestamp === 'number'
    );
  } catch {
    return [];
  }
}

function getStorageKey(userId?: string | null): string {
  return userId
    ? `${SEARCH_HISTORY_STORAGE_KEY}:${encodeURIComponent(userId)}`
    : SEARCH_HISTORY_STORAGE_KEY;
}

export function useSearchHistory(userId?: string | null) {
  const storageKey = getStorageKey(userId);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const historyRef = useRef<SearchHistoryEntry[]>([]);
  const suggestions = loadedKey === storageKey ? history : [];

  useEffect(() => {
    try {
      const anonymousStored = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy !== null) {
        if (parseHistory(anonymousStored).length === 0) {
          const migrated = parseHistory(legacy);
          if (migrated.length > 0) {
            window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(migrated));
          }
        }
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }

      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) {
        const loaded = parseHistory(stored);
        historyRef.current = loaded;
        setHistory(loaded);
      } else {
        historyRef.current = [];
        setHistory([]);
      }
    } catch {
      historyRef.current = [];
      setHistory([]);
    }
    setLoadedKey(storageKey);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        const updated = parseHistory(event.newValue);
        historyRef.current = updated;
        setHistory(updated);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey]);

  const saveHistory = useCallback(
    (next: SearchHistoryEntry[]) => {
      historyRef.current = next;
      setHistory(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Keep the in-memory history usable when storage is unavailable.
      }
    },
    [storageKey]
  );

  const addSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      const trimmed = query.trim();
      const currentHistory = loadedKey === storageKey ? historyRef.current : [];
      const next = [
        { query: trimmed, timestamp: Date.now() },
        ...currentHistory.filter((entry) => entry.query !== trimmed),
      ].slice(0, MAX_HISTORY);
      saveHistory(next);
    },
    [loadedKey, saveHistory, storageKey]
  );

  const removeSearch = useCallback(
    (query: string) => saveHistory(suggestions.filter((entry) => entry.query !== query)),
    [saveHistory, suggestions]
  );

  const clearHistory = useCallback(() => saveHistory([]), [saveHistory]);

  return { suggestions, addSearch, removeSearch, clearHistory };
}
