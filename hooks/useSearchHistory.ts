'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

const MAX_HISTORY = 20;
const STORAGE_KEY = 'search-history';

export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<SearchHistoryEntry[]>(STORAGE_KEY, []);

  const addSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      const trimmed = query.trim();
      const filtered = history.filter((entry) => entry.query !== trimmed);
      const newEntry: SearchHistoryEntry = {
        query: trimmed,
        timestamp: Date.now(),
      };
      setHistory([newEntry, ...filtered].slice(0, MAX_HISTORY));
    },
    [history, setHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const suggestions = history;

  return {
    suggestions,
    addSearch,
    clearHistory,
  };
}
