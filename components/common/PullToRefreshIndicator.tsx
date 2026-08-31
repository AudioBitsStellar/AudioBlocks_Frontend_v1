import { LoaderCircle } from 'lucide-react';

interface Props {
  isRefreshing: boolean;
  pullDistance: number;
  progress: number;
  thresholdReached: boolean;
}

export function PullToRefreshIndicator({
  isRefreshing,
  pullDistance,
  progress,
  thresholdReached,
}: Props) {
  if (!isRefreshing && pullDistance === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 top-2 z-50 flex justify-center pointer-events-none md:hidden"
      style={{ transform: `translateY(${Math.max(0, pullDistance - 40)}px)` }}
    >
      <div className="flex items-center gap-2 rounded-full border border-border-dark bg-surface px-3 py-2 text-xs text-white shadow-lg">
        <LoaderCircle
          aria-hidden="true"
          className={isRefreshing ? 'animate-spin' : ''}
          size={18}
          style={{ transform: isRefreshing ? undefined : `rotate(${progress * 270}deg)` }}
        />
        <span>
          {isRefreshing
            ? 'Refreshing…'
            : thresholdReached
              ? 'Release to refresh'
              : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}
