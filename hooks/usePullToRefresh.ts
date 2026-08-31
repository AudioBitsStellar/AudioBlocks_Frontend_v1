'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;
const IOS_EDGE_GUARD = 24;

interface PullToRefreshOptions {
  onRefresh: () => Promise<unknown>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  enabled = true,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const isTracking = useRef(false);
  const currentPullDistance = useRef(0);

  const reset = useCallback(() => {
    isTracking.current = false;
    currentPullDistance.current = 0;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handleTouchStart = (event: TouchEvent) => {
      if (isRefreshing || window.scrollY >= 10 || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch.clientX <= IOS_EDGE_GUARD) return;
      startPoint.current = { x: touch.clientX, y: touch.clientY };
      isTracking.current = true;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!isTracking.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const deltaX = touch.clientX - startPoint.current.x;
      const deltaY = touch.clientY - startPoint.current.y;
      if (deltaY <= 0 || Math.abs(deltaX) > deltaY) {
        reset();
        return;
      }
      event.preventDefault();
      currentPullDistance.current = Math.min(MAX_PULL_DISTANCE, deltaY);
      setPullDistance(currentPullDistance.current);
    };
    const handleTouchEnd = async () => {
      if (!isTracking.current) return;
      isTracking.current = false;
      if (currentPullDistance.current < threshold) {
        currentPullDistance.current = 0;
        setPullDistance(0);
        return;
      }
      const scrollPosition = window.scrollY;
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: 'instant' }));
        setIsRefreshing(false);
        currentPullDistance.current = 0;
        setPullDistance(0);
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [enabled, isRefreshing, onRefresh, reset, threshold]);

  return {
    isRefreshing,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
    thresholdReached: pullDistance >= threshold,
  };
}
