'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const START_DELAY = 200;
const COMPLETE_DURATION = 300;

function getUrlKey(pathname: string, searchParams: { toString(): string }): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionIdRef = useRef(0);
  const currentUrlRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }

    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }, []);

  const startTransition = useCallback(() => {
    clearTimers();
    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;
    isLoadingRef.current = true;

    setIsVisible(false);
    setProgress(0);

    startTimerRef.current = setTimeout(() => {
      if (transitionId !== transitionIdRef.current || !isLoadingRef.current) return;

      setIsVisible(true);
      requestAnimationFrame(() => {
        if (transitionId === transitionIdRef.current && isLoadingRef.current) {
          setProgress(70);
        }
      });
    }, START_DELAY);
  }, [clearTimers]);

  const completeTransition = useCallback(() => {
    if (!isLoadingRef.current) return;

    clearTimers();
    isLoadingRef.current = false;
    setProgress(100);

    completeTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
      completeTimerRef.current = null;
    }, COMPLETE_DURATION);
  }, [clearTimers]);

  useEffect(() => {
    const urlKey = getUrlKey(pathname, searchParams);

    if (currentUrlRef.current === null) {
      currentUrlRef.current = urlKey;
      return;
    }

    if (currentUrlRef.current !== urlKey) {
      currentUrlRef.current = urlKey;
      completeTransition();
    }
  }, [completeTransition, pathname, searchParams]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      const destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      if (destination.pathname === current.pathname && destination.search === current.search)
        return;

      startTransition();
    };

    const handlePopState = () => {
      startTransition();
    };

    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('popstate', handlePopState);
      clearTimers();
    };
  }, [clearTimers, startTransition]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${progress}%`,
        height: '3px',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: 'none',
        backgroundColor: 'var(--brand, #F2AFC9)',
        transition: 'width 300ms ease-out, opacity 150ms ease-in',
      }}
    />
  );
}
