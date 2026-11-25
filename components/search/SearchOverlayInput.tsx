'use client';

import { type RefObject } from 'react';
import { Loader2, Search, X } from 'lucide-react';

interface SearchOverlayInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function SearchOverlayInput({
  inputRef,
  query,
  loading,
  onChange,
  onClose,
}: SearchOverlayInputProps) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-800">
      <Search className="w-5 h-5 text-gray-500 mr-3 shrink-0" />
      <input
        ref={inputRef}
        aria-label="Search Input"
        className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-gray-500"
        placeholder="Search tracks, artists, collections..."
        role="searchbox"
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
      {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin mr-2 shrink-0" />}
      <button
        aria-label="Close search overlay"
        className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        type="button"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
