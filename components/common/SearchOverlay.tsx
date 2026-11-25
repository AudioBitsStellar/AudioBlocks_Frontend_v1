'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SearchOverlayFooter } from '@/components/search/SearchOverlayFooter';
import { SearchOverlayHistory } from '@/components/search/SearchOverlayHistory';
import { SearchOverlayInput } from '@/components/search/SearchOverlayInput';
import {
  SearchOverlayResults,
  MIN_QUERY_LENGTH,
  groupResults,
} from '@/components/search/SearchOverlayResults';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';

export function SearchOverlay() {
  const { user } = useDynamicContext();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeOverlay = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
  }, []);

  // Pass query only when open to clear search results and cancel stale requests on close
  const { results, loading, error } = useSearch(isOpen ? query : '', 200);
  const { suggestions, addSearch, removeSearch, clearHistory } = useSearchHistory(user?.userId);

  // Clear search input and close overlay on route changes (navigating away)
  const pathname = usePathname();
  useEffect(() => {
    closeOverlay();
  }, [pathname, closeOverlay]);

  useEffect(() => {
    const handlePopState = () => closeOverlay();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeOverlay]);

  const trimmedQuery = query.trim();
  const { groups, ordered } = useMemo(() => groupResults(results), [results]);
  const optionCount = trimmedQuery ? ordered.length : suggestions.length;

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((open) => {
          if (!open) {
            previousFocusRef.current = document.activeElement as HTMLElement | null;
            return true;
          }
          closeOverlay();
          return false;
        });
      } else if (e.key === 'Escape') {
        closeOverlay();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [closeOverlay]);

  useEffect(() => {
    if (!isOpen) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }
    setQuery('');
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const submit = useCallback(
    (searchQuery: string) => {
      const value = searchQuery.trim();
      if (!value) return;
      addSearch(value);
      closeOverlay();
    },
    [addSearch, closeOverlay]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const focusable = e.currentTarget
        .closest('[role="dialog"]')
        ?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );
      if (!focusable?.length) return;
      const [first, last] = [focusable[0], focusable[focusable.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }

    if (e.target !== inputRef.current) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = trimmedQuery
        ? ordered[selectedIndex]?.title
        : suggestions[selectedIndex]?.query;
      submit(selected ?? query);
    }
  };

  if (!isOpen) return null;

  const optionClass = (index: number) =>
    `px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
      index === selectedIndex ? 'bg-gray-800' : 'hover:bg-gray-800/50'
    }`;

  return (
    <div
      aria-label="Search overlay"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      onClick={closeOverlay}
    >
      <div
        className="w-full max-w-xl bg-[#111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <SearchOverlayInput
          inputRef={inputRef}
          loading={loading}
          query={query}
          onChange={(val) => {
            setQuery(val);
            setSelectedIndex(-1);
          }}
          onClose={closeOverlay}
        />

        <SearchOverlayResults
          error={error}
          groups={groups}
          loading={loading}
          minQueryLength={MIN_QUERY_LENGTH}
          optionClass={optionClass}
          ordered={ordered}
          selectedIndex={selectedIndex}
          trimmedQuery={trimmedQuery}
          onHoverIndex={setSelectedIndex}
          onSelect={submit}
        />

        {!trimmedQuery && (
          <SearchOverlayHistory
            optionClass={optionClass}
            selectedIndex={selectedIndex}
            suggestions={suggestions}
            onClear={clearHistory}
            onHoverIndex={setSelectedIndex}
            onRemove={removeSearch}
            onSelect={submit}
          />
        )}

        <SearchOverlayFooter />
      </div>
    </div>
  );
}

export default SearchOverlay;
