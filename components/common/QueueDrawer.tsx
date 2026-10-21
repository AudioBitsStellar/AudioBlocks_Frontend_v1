'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, GripVertical, Trash2, X, Save } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePlaybackActions, usePlaybackSelector } from '@/context/PlaybackContext';
import { useAnnounce } from '@/hooks/useAnnounce';

interface QueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DragItem {
  index: number;
}

export function QueueDrawer({ open, onOpenChange }: QueueDrawerProps) {
  // Only the queue is needed from state; actions are stable, so unrelated
  // updates (volume, progress flags) do not re-render the drawer.
  const queue = usePlaybackSelector((s) => s.queue);
  const { removeFromQueue, clearQueue, reorderQueue } = usePlaybackActions();
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSavePlaylist, setShowSavePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('My Queue Playlist');
  const announce = useAnnounce();
  const listRef = useRef<HTMLUListElement | null>(null);
  // Row and button to focus once the queue has re-rendered after a move.
  const pendingFocus = useRef<{ index: number; direction: 'up' | 'down' } | null>(null);
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

  /**
   * Keyboard / touch alternative to dragging: moves a track one position up or
   * down, announces the result and keeps focus on the moved row's button.
   */
  const handleMove = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= queue.length) return;
      reorderQueue(index, target);
      pendingFocus.current = { index: target, direction };
      announce(`Moved '${queue[index].title}' to position ${target + 1} of ${queue.length}`);
    },
    [announce, queue, reorderQueue]
  );

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-queue-index="${pending.index}"]`
    );
    // The button we just used is disabled when the track reached the end of the
    // list, so fall back to the opposite one.
    const preferred = row?.querySelector<HTMLButtonElement>(`[data-move="${pending.direction}"]`);
    const other = row?.querySelector<HTMLButtonElement>(
      `[data-move="${pending.direction === 'up' ? 'down' : 'up'}"]`
    );
    (preferred && !preferred.disabled ? preferred : other)?.focus();
  }, [queue]);

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

  const handleSavePlaylist = useCallback(() => {
    if (queue.length === 0 || !playlistName.trim()) return;
    const playlistData = {
      name: playlistName.trim(),
      tracks: queue,
      createdAt: new Date().toISOString(),
    };
    const playlistsJson = localStorage.getItem('savedPlaylists') || '[]';
    const playlists = JSON.parse(playlistsJson);
    playlists.push(playlistData);
    localStorage.setItem('savedPlaylists', JSON.stringify(playlists));
    setShowSavePlaylist(false);
    setPlaylistName('My Queue Playlist');
  }, [queue, playlistName]);

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
            <ul ref={listRef} className="space-y-1" role="list">
              {queue.map((track, index) => (
                <li
                  key={`${track.id}-${index}`}
                  data-queue-index={index}
                  draggable
                  className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-2 hover:bg-white/10 transition cursor-default"
                  onDragEnd={handleDragEnd}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragStart={() => handleDragStart(index)}
                >
                  {/* Mouse drag handle only; keyboard and touch users use the move buttons. */}
                  <div
                    aria-hidden="true"
                    className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-white shrink-0"
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

                  <div className="flex shrink-0 flex-col">
                    <button
                      aria-label={`Move ${track.title} up`}
                      className="flex h-5 w-8 items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                      data-move="up"
                      disabled={index === 0}
                      type="button"
                      onClick={() => handleMove(index, 'up')}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      aria-label={`Move ${track.title} down`}
                      className="flex h-5 w-8 items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                      data-move="down"
                      disabled={index === queue.length - 1}
                      type="button"
                      onClick={() => handleMove(index, 'down')}
                    >
                      <ChevronDown size={14} />
                    </button>
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
          <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-2">
            {showSavePlaylist ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="w-full text-xs px-2 py-1 rounded bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-green-400 hover:text-green-300 underline flex-1"
                    onClick={handleSavePlaylist}
                  >
                    Save
                  </button>
                  <button
                    className="text-xs text-gray-400 hover:text-white flex-1"
                    onClick={() => setShowSavePlaylist(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : showClearConfirm ? (
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
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-gray-400 hover:text-white underline flex-1 flex items-center justify-center gap-1"
                  onClick={() => setShowSavePlaylist(true)}
                  aria-label="Save queue as playlist"
                >
                  <Save size={12} />
                  Save as playlist
                </button>
                <button
                  className="text-xs text-gray-400 hover:text-white underline flex-1"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear queue
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
