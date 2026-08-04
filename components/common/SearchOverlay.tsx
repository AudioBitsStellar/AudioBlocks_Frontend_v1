'use client';

import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { Search, X, Clock, Trash2 } from 'lucide-react';
import { useSearchHistory } from '@/hooks/useSearchHistory';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
}

// Mock results for now
const MOCK_RESULTS: SearchResult[] = [
  { id: '1', title: 'Midnight City', artist: 'M83' },
  { id: '2', title: 'Starboy', artist: 'The Weeknd' },
  { id: '3', title: 'Blinding Lights', artist: 'The Weeknd' },
  { id: '4', title: 'Get Lucky', artist: 'Daft Punk' },
];

export default function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { suggestions, addSearch, clearHistory } = useSearchHistory();

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            previousFocusRef.current = document.activeElement as HTMLElement;
          }
          return true;
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(-1);
    } else {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleSearchSubmit = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return;
      addSearch(searchQuery);
      setIsOpen(false);
    },
    [addSearch]
  );

  const filteredResults = MOCK_RESULTS.filter(
    (res) =>
      res.title.toLowerCase().includes(query.toLowerCase()) ||
      res.artist.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = filteredResults[selectedIndex];
      if (selected) {
        handleSearchSubmit(selected.title);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = useCallback(
    (suggestionQuery: string) => {
      setQuery(suggestionQuery);
      handleSearchSubmit(suggestionQuery);
    },
    [handleSearchSubmit]
  );

  if (!isOpen) return null;

  return (
    <div
      aria-label="Search overlay"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm"
      role="dialog"
      onClick={() => setIsOpen(false)}
    >
      <div
        ref={overlayRef}
        className="w-full max-w-xl bg-[#111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500 mr-3" />
          <input
            ref={inputRef}
            aria-label="Search Input"
            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-gray-500"
            placeholder="Search tracks, artists..."
            role="searchbox"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                handleSearchSubmit(query);
              }
            }}
          />
          <button
            aria-label="Close search overlay"
            className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {query && (
          <div className="max-h-96 overflow-y-auto py-2" role="listbox">
            {filteredResults.length > 0 ? (
              filteredResults.map((result, index) => (
                <div
                  key={result.id}
                  aria-selected={index === selectedIndex}
                  className={`px-4 py-3 flex flex-col cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                  }`}
                  role="option"
                  onClick={() => {
                    handleSearchSubmit(result.title);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-white font-medium">{result.title}</span>
                  <span className="text-gray-400 text-sm">{result.artist}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                No results found for &quot;{query}&quot;
              </div>
            )}
          </div>
        )}

        {!query && suggestions.length > 0 && (
          <div className="max-h-96 overflow-y-auto py-2" role="listbox">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent Searches
              </span>
              <button
                aria-label="Clear search history"
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                onClick={clearHistory}
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            {suggestions.map((entry, index) => (
              <div
                key={entry.query}
                aria-selected={index === selectedIndex}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-800/50"
                role="option"
                onClick={() => handleSuggestionClick(entry.query)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-gray-300 text-sm flex-1 truncate">{entry.query}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2 border-t border-gray-800 bg-[#0a0a0a] flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
