'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { GripVertical, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePlayback } from '@/context/PlaybackContext';

interface QueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DragItem {
  index: number;
}

export function QueueDrawer({ open, onOpenChange }: QueueDrawerProps) {
  const { queue, removeFromQueue, clearQueue, reorderQueue } = usePlayback();
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const dragItem = useRef<DragItem | null>(null);
  const dragOverItem = useRef<DragItem | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = { index };
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = { index };
  }, []);

  const handleDragEnd = useCallback(() => {
    if (
      dragItem.current &&
      dragOverItem.current &&
      dragItem.current.index !== dragOverItem.current.index
    ) {
      reorderQueue(dragItem.current.index, dragOverItem.current.index);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  }, [reorderQueue]);

  const handleRemove = useCallback(
    (index: number) => {
      removeFromQueue(index);
      setRemoveIndex(null);
    },
    [removeFromQueue]
  );

  const handleClear = useCallback(() => {
    clearQueue();
    setShowClearConfirm(false);
  }, [clearQueue]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-label="Track queue"
        className="touch-pan-y bg-[#161616] text-white border-l-white/10 flex flex-col"
        role="dialog"
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="text-white flex items-center justify-between">
            <span>Up next</span>
            <span className="text-sm font-normal text-gray-400">
              {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-sm">Your queue is empty.</p>
              <p className="text-xs mt-1">Add tracks from the player or browse page.</p>
            </div>
          ) : (
            <ul className="space-y-1" role="list">
              {queue.map((track, index) => (
                <li
                  key={`${track.id}-${index}`}
                  draggable
                  className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-2 hover:bg-white/10 transition cursor-default"
                  onDragEnd={handleDragEnd}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragStart={() => handleDragStart(index)}
                >
                  <div
                    aria-label={`Drag to reorder ${track.title}`}
                    className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-white shrink-0"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                      }
                    }}
                  >
                    <GripVertical size={16} />
                  </div>

                  <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                    <Image
                      fill
                      alt={track.title}
                      className="object-cover"
                      src={track.cover || '/placeholder-cover.svg'}
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-cover.svg';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{track.title}</p>
                    <p className="truncate text-xs text-gray-400">{track.artist}</p>
                  </div>

                  {removeIndex === index ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        className="text-xs text-red-400 hover:text-red-300 underline"
                        onClick={() => handleRemove(index)}
                      >
                        Remove
                      </button>
                      <button
                        aria-label="Cancel remove"
                        className="text-gray-400 hover:text-white"
                        onClick={() => setRemoveIndex(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      aria-label={`Remove ${track.title} from queue`}
                      className="shrink-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
                      onClick={() => setRemoveIndex(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {queue.length > 0 && (
          <div className="px-4 pb-4 border-t border-white/10 pt-3">
            {showClearConfirm ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Clear all tracks?</span>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-red-400 hover:text-red-300 underline"
                    onClick={handleClear}
                  >
                    Yes
                  </button>
                  <button
                    className="text-xs text-gray-400 hover:text-white"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="text-xs text-gray-400 underline hover:text-white"
                onClick={() => setShowClearConfirm(true)}
              >
                Clear queue
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
