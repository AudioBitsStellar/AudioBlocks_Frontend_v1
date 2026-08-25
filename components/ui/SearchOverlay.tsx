'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';

export function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch(query, 200);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(-1);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const groupedResults = {
    track: results.filter((r) => r.type === 'track'),
    artist: results.filter((r) => r.type === 'artist'),
    collection: results.filter((r) => r.type === 'collection'),
  };

  const flattenedResults = [
    ...groupedResults.track,
    ...groupedResults.artist,
    ...groupedResults.collection,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flattenedResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      // handle selection
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-border-dark rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center px-4 py-3 border-b border-border-dark">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
            placeholder="Search tracks, artists, collections..."
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            className="p-1 rounded hover:bg-gray-800 ml-2"
            type="button"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && <div className="p-4 text-center text-gray-400">Searching...</div>}
          {!loading && query.length >= 3 && results.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              No results found for &quot;{query}&quot;
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {['track', 'artist', 'collection'].map((type) => {
                const group = groupedResults[type as keyof typeof groupedResults];
                if (group.length === 0) return null;
                return (
                  <div key={type}>
                    <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {type}s
                    </h3>
                    <div className="space-y-1">
                      {group.map((item) => {
                        const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center p-2 rounded-lg cursor-pointer ${globalIdx === selectedIndex ? 'bg-brand/20' : 'hover:bg-gray-800/50'}`}
                            onClick={() => setIsOpen(false)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                          >
                            <div className="relative w-10 h-10 rounded-md overflow-hidden mr-3">
                              <Image
                                fill
                                alt={item.title}
                                className="object-cover"
                                src={item.image || '/placeholder.svg'}
                              />
                            </div>
                            <div>
                              <div className="text-white font-medium">{item.title}</div>
                              <div className="text-gray-400 text-sm">{item.subtitle}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
