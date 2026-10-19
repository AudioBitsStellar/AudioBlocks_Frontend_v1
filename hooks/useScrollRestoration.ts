'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'audioblocks_scroll_positions';

/** Most scroll positions kept in `sessionStorage`; the least recently saved are dropped first. */
export const MAX_SCROLL_ENTRIES = 50;

interface StoredPosition {
  /** Vertical scroll offset in pixels. */
  y: number;
  /** When the position was saved (ms since epoch); 0 for entries migrated from the old format. */
  t: number;
}

const isValidOffset = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Reads the stored positions, keeping only well-formed entries. Bare numbers
 * from the earlier `{ [key]: number }` format are accepted; anything else
 * (strings, negative or non-finite numbers, nested junk) is dropped.
 */
function getPositions(): Record<string, StoredPosition> {
  if (typeof sessionStorage === 'undefined') return {};
  let raw: unknown;
  try {
    raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const positions: Record<string, StoredPosition> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isValidOffset(value)) {
      positions[key] = { y: value, t: 0 };
    } else if (value && typeof value === 'object') {
      const { y, t } = value as Partial<StoredPosition>;
      if (isValidOffset(y)) positions[key] = { y, t: isValidOffset(t) ? t : 0 };
    }
  }
  return positions;
}

/** Drops the oldest entries until at most `MAX_SCROLL_ENTRIES` remain. */
function prune(positions: Record<string, StoredPosition>): Record<string, StoredPosition> {
  const entries = Object.entries(positions);
  if (entries.length <= MAX_SCROLL_ENTRIES) return positions;
  // Stable sort: entries with the same timestamp keep their insertion order.
  entries.sort((a, b) => a[1].t - b[1].t);
  return Object.fromEntries(entries.slice(entries.length - MAX_SCROLL_ENTRIES));
}

function writePositions(positions: Record<string, StoredPosition>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Quota exceeded — silently ignore.
  }
}

function savePosition(path: string, scrollY: number) {
  if (!isValidOffset(scrollY)) return;
  const positions = getPositions();
  // Re-insert so the entry is the most recent one, both by `t` and by key order.
  delete positions[path];
  positions[path] = { y: scrollY, t: Date.now() };
  writePositions(prune(positions));
}

function clearPosition(path: string) {
  const positions = getPositions();
  delete positions[path];
  writePositions(positions);
}

export function useScrollRestoration(key?: string) {
  const pathname = usePathname();
  const storageKey = key ?? pathname;
  const restoredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    if (restoredKeyRef.current === storageKey) return;
    restoredKeyRef.current = storageKey;

    const saved = getPositions()[storageKey]?.y;
    if (saved === undefined || saved <= 0) return;

    let frame = 0;
    let attempts = 0;
    const maxAttempts = 20;

    const restore = () => {
      if (typeof window === 'undefined') return;

      const pageCanReachSavedPosition =
        document.documentElement.scrollHeight >= saved + window.innerHeight;
      if (pageCanReachSavedPosition || attempts >= maxAttempts) {
        window.scrollTo(0, saved);
        return;
      }

      attempts += 1;
      frame = window.requestAnimationFrame(restore);
    };

    frame = window.requestAnimationFrame(restore);

    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    const handleBeforeUnload = () => savePosition(storageKey, window.scrollY);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [storageKey]);

  useEffect(() => {
    const handlePopState = () => {
      savePosition(storageKey, window.scrollY);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [storageKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => savePosition(storageKey, window.scrollY), 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [storageKey]);

  return {
    save: () => savePosition(storageKey, window.scrollY),
    clear: () => clearPosition(storageKey),
  };
}
