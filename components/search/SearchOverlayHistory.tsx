'use client';

import { Clock, Trash2, X } from 'lucide-react';
export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

interface SearchOverlayHistoryProps {
  suggestions: SearchHistoryItem[];
  selectedIndex: number;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  onHoverIndex: (index: number) => void;
  optionClass: (index: number) => string;
}

export function SearchOverlayHistory({
  suggestions,
  selectedIndex,
  onSelect,
  onRemove,
  onClear,
  onHoverIndex,
  optionClass,
}: SearchOverlayHistoryProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="max-h-96 overflow-y-auto py-2">
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Recent Searches
        </span>
        <button
          aria-label="Clear search history"
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
          type="button"
          onClick={onClear}
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>
      {suggestions.map((entry, index) => (
        <div
          key={entry.query}
          aria-current={index === selectedIndex ? 'true' : undefined}
          className={`${optionClass(index)} cursor-default`}
          role="presentation"
          onMouseEnter={() => onHoverIndex(index)}
        >
          <button
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            type="button"
            onClick={() => onSelect(entry.query)}
          >
            <Clock className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-gray-300 text-sm truncate">{entry.query}</span>
          </button>
          <button
            aria-label={`Remove '${entry.query}' from history`}
            className="rounded p-1 text-gray-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            type="button"
            onClick={() => onRemove(entry.query)}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
