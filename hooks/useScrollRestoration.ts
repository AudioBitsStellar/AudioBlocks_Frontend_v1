'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'audioblocks_scroll_positions';

function getPositions(): Record<string, number> {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePosition(path: string, scrollY: number) {
  const positions = getPositions();
  positions[path] = scrollY;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch { /* quota exceeded — silently ignore */ }
}

function clearPosition(path: string) {
  const positions = getPositions();
  delete positions[path];
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch { /* quota exceeded — silently ignore */ }
}

export function useScrollRestoration(key?: string) {
  const pathname = usePathname();
  const storageKey = key ?? pathname;
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = getPositions()[storageKey];
    if (typeof saved === 'number' && saved > 0) {
      // Use requestAnimationFrame to wait for the DOM to render
      requestAnimationFrame(() => {
        window.scrollTo(0, saved);
      });
    }
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

  // Debounced scroll save during browsing
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
