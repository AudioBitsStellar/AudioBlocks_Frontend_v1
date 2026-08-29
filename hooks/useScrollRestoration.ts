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
  } catch {
    // Quota exceeded — silently ignore.
  }
}

function clearPosition(path: string) {
  const positions = getPositions();
  delete positions[path];
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Quota exceeded — silently ignore.
  }
}

export function useScrollRestoration(key?: string) {
  const pathname = usePathname();
  const storageKey = key ?? pathname;
  const restoredKeyRef = useRef<string | null>(null);
  // True only for a *back/forward* navigation (popstate). A fresh navigation
  // must not restore a stale position — it is a new visit, so the old one is
  // cleared instead (acceptance criteria for #131).
  const isPopNavigationRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // Tag popstate (back/forward) so the restore effect below can tell it apart
  // from a fresh navigation. Registered once, before any per-key logic, so the
  // flag is accurate on the very first navigation into a page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      isPopNavigationRef.current = true;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (restoredKeyRef.current === storageKey) return;
    restoredKeyRef.current = storageKey;

    // Fresh navigation: discard whatever the user saved on a previous visit so
    // a back button never resurrects an unrelated scroll position.
    if (!isPopNavigationRef.current) {
      clearPosition(storageKey);
      return;
    }

    const saved = getPositions()[storageKey];
    if (typeof saved !== 'number' || saved <= 0) return;

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
      isPopNavigationRef.current = true;
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
