'use client';

import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualizedRankedItem {
  id: string;
  rank?: number;
  title: string;
  subtitle?: string;
  value?: string | number;
  metadata?: string;
  image?: string;
}

interface VirtualizedRankedListProps<T extends VirtualizedRankedItem> {
  items: T[];
  renderItem?: (item: T, rank: number, isVirtual: boolean) => ReactNode;
  estimateHeight?: number;
  maxHeight?: number | string;
  className?: string;
  threshold?: number;
}

export function VirtualizedRankedList<T extends VirtualizedRankedItem>({
  items,
  renderItem,
  estimateHeight = 56,
  maxHeight = 480,
  className = '',
  threshold = 15,
}: VirtualizedRankedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = items.length > threshold;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateHeight,
    overscan: 5,
    enabled: shouldVirtualize,
  });

  const defaultRenderRow = (item: T, rank: number) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-surface px-4 py-3 min-h-[56px] w-full">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-on-muted font-semibold shrink-0 w-6 text-center">{rank}</span>
        <div className="min-w-0">
          <p className="text-on-subtle font-medium truncate">{item.title}</p>
          {item.subtitle && <p className="text-xs text-on-muted truncate">{item.subtitle}</p>}
        </div>
      </div>
      {item.value !== undefined && (
        <span className="text-sm font-semibold text-white shrink-0">{item.value}</span>
      )}
    </div>
  );

  if (!shouldVirtualize) {
    return (
      <ul className={`space-y-3 ${className}`} role="list">
        {items.map((item, index) => (
          <li key={item.id} role="listitem">
            {renderItem
              ? renderItem(item, index + 1, false)
              : defaultRenderRow(item, index + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto custom-scrollbar rounded-lg ${className}`}
      data-testid="virtualized-ranked-list-container"
      style={{
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
      }}
    >
      <ul
        aria-label="Ranked list"
        className="relative"
        role="list"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const index = virtualItem.index;
          const item = items[index];
          const rank = index + 1;
          return (
            <li
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              aria-posinset={rank}
              aria-setsize={items.length}
              className="absolute left-0 top-0 w-full pb-2"
              data-index={index}
              role="listitem"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem ? renderItem(item, rank, true) : defaultRenderRow(item, rank)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
