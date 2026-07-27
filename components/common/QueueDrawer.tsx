'use client';

import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePlayback } from '@/context/PlaybackContext';

interface QueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Mobile queue drawer, opened either via the trigger button or a right-edge
 * swipe (see useEdgeSwipe). touch-pan-y keeps vertical scrolling of the list
 * itself from conflicting with the horizontal swipe gesture that opens it.
 */
export function QueueDrawer({ open, onOpenChange }: QueueDrawerProps) {
  const { queue, removeFromQueue, clearQueue } = usePlayback();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="touch-pan-y bg-[#161616] text-white border-l-white/10">
        <SheetHeader>
          <SheetTitle className="text-white">Up next</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {queue.length === 0 ? (
            <p className="text-sm text-gray-400">Your queue is empty.</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((track, index) => (
                <li
                  key={`${track.id}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{track.title}</p>
                    <p className="truncate text-xs text-gray-400">{track.artist}</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(index)}
                    aria-label={`Remove ${track.title} from queue`}
                    className="shrink-0 text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {queue.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={clearQueue}
              className="text-xs text-gray-400 underline hover:text-white"
            >
              Clear queue
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
