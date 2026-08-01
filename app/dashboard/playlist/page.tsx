'use client';

import { useState } from 'react';
import { GripVertical, Play, Trash2 } from 'lucide-react';
import { usePlayback } from '@/context/PlaybackContext';

const sampleTracks = [
  {
    id: 'pl-1',
    title: 'Relax and Unwind',
    artist: 'Rozé',
    cover: '/AFRO.jpg',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'pl-2',
    title: 'Vibe Mix',
    artist: 'Yemi Sax',
    cover: '/AFRO.jpg',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'pl-3',
    title: 'Cool Session',
    artist: 'Dunsin',
    cover: '/AFRO.jpg',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

const Playlist = () => {
  const { playTrack, currentIndex, playlist, isPlaying } = usePlayback();
  const [tracks, setTracks] = useState(sampleTracks);
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);

  const handleDrop = (targetTrackId: string) => {
    if (!draggedTrackId || draggedTrackId === targetTrackId) {
      setDraggedTrackId(null);
      return;
    }

    setTracks((currentTracks) => {
      const draggedIndex = currentTracks.findIndex((track) => track.id === draggedTrackId);
      const targetIndex = currentTracks.findIndex((track) => track.id === targetTrackId);

      if (draggedIndex < 0 || targetIndex < 0) return currentTracks;

      const reorderedTracks = [...currentTracks];
      const [draggedTrack] = reorderedTracks.splice(draggedIndex, 1);
      reorderedTracks.splice(targetIndex, 0, draggedTrack);
      return reorderedTracks;
    });

    setDraggedTrackId(null);
  };

  const handleRemove = (trackId: string) => {
    setTracks((currentTracks) => currentTracks.filter((track) => track.id !== trackId));
  };

  return (
    <div className="font-inter">
      <p className="text-xs font-medium text-left text-white mb-2">My Playlist</p>

      <div className="bg-gradient-to-r from-[#6E0596] to-[#580577] p-8 py-12 rounded-lg text-white flex items-center justify-between mb-6">
        <div className="flex-1 gap-2">
          <h1 className="md:text-6xl text-3xl mb-2 font-extrabold">My Playlist</h1>
          <p className="font-semibold text-base">
            {tracks.length} {tracks.length === 1 ? 'Song' : 'Songs'} Added
          </p>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-border-dark p-8 text-center text-on-muted">
          Your playlist is empty.
        </div>
      ) : (
        <div aria-label="Playlist tracks" className="flex flex-col gap-2">
          {tracks.map((track, i) => {
            const globalIndex = playlist.findIndex(
              (playlistTrack) => playlistTrack.url === track.url
            );
            const isActive = globalIndex >= 0 && globalIndex === currentIndex && isPlaying;

            return (
              <div
                key={track.id}
                draggable
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-surface border border-border-dark' : 'hover:bg-surface-hover'
                } ${draggedTrackId === track.id ? 'opacity-50' : ''}`}
                onDragEnd={() => setDraggedTrackId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedTrackId(track.id)}
                onDrop={() => handleDrop(track.id)}
              >
                <button
                  aria-label={`Reorder ${track.title}`}
                  className="cursor-grab text-on-muted hover:text-white touch-none"
                  title="Drag to reorder"
                  type="button"
                >
                  <GripVertical size={20} />
                </button>

                <button
                  aria-label={`Play ${track.title}`}
                  className="flex flex-1 min-w-0 items-center gap-4 text-left cursor-pointer"
                  type="button"
                  onClick={() => playTrack(track)}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand shrink-0">
                    <Play className="text-white ml-0.5" size={14} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-semibold truncate ${
                        isActive ? 'text-brand' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="block text-xs text-on-muted truncate">{track.artist}</span>
                  </span>
                </button>

                <span className="text-xs text-on-muted shrink-0">{i + 1}</span>

                <button
                  aria-label={`Remove ${track.title} from playlist`}
                  className="p-2 rounded-md text-on-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Remove from playlist"
                  type="button"
                  onClick={() => handleRemove(track.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Playlist;
