'use client';

import { useEffect, useRef } from 'react';

const EDGE_ZONE_PX = 24;
const DIRECTION_THRESHOLD_PX = 10;
const OPEN_THRESHOLD_PX = 40;

type Direction = 'horizontal' | 'vertical' | null;

interface UseEdgeSwipeOptions {
  /** Called when a horizontal swipe starting at the right edge completes. */
  onSwipeFromRightEdge: () => void;
  enabled?: boolean;
}

/**
 * Disambiguates a right-edge swipe (open queue drawer) from a left-edge swipe
 * (native browser back navigation) and vertical scrolling. Direction is only
 * decided after the touch has moved past a small threshold, and only the
 * right-edge/horizontal case calls preventDefault — everything else (vertical
 * scroll, left-edge back-swipe) is left to the browser's native handling.
 */
export function useEdgeSwipe({ onSwipeFromRightEdge, enabled = true }: UseEdgeSwipeOptions) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startedAtRightEdge = useRef(false);
  const direction = useRef<Direction>(null);
  const callbackRef = useRef(onSwipeFromRightEdge);
  callbackRef.current = onSwipeFromRightEdge;

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      direction.current = null;
      startedAtRightEdge.current = window.innerWidth - touch.clientX <= EDGE_ZONE_PX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startedAtRightEdge.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      if (direction.current === null) {
        if (Math.abs(dx) < DIRECTION_THRESHOLD_PX && Math.abs(dy) < DIRECTION_THRESHOLD_PX) return;
        direction.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }

      if (direction.current === 'horizontal' && dx < 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startedAtRightEdge.current && direction.current === 'horizontal') {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX.current;
        if (dx <= -OPEN_THRESHOLD_PX) {
          callbackRef.current();
        }
      }
      direction.current = null;
      startedAtRightEdge.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled]);
}
