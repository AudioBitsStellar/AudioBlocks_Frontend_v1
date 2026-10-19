'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePersonalizationRow } from '@/hooks/usePersonalizationRow';
import { usePlayback } from '@/context/PlaybackContext';
import type { Track } from '@/context/PlaybackContext';

const PersonalizationRow = memo(function PersonalizationRow() {
  const personalizationData = usePersonalizationRow();
  const { setPlaylist, setCurrentIndex } = usePlayback();

  if (!personalizationData || !personalizationData.songs || personalizationData.songs.length === 0) {
    return null;
  }

  const handlePlaySong = (track: Track, index: number) => {
    setPlaylist(personalizationData.songs);
    setCurrentIndex(index);
  };

  return (
    <section className="py-6">
      <div className="pb-6 border-b">
        <h2 className="text-2xl font-semibold text-muted font-poppins leading-tight tracking-tight">
          Because you listened to
          {personalizationData.reason.type === 'genre' ? ' ' : ' '}
          <span className="text-brand">{personalizationData.reason.name}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {personalizationData.songs.map((song, index) => (
          <div
            key={`${song.id}-${index}`}
            className="group relative bg-surface-input rounded-lg p-4 hover:bg-surface-input/80 transition cursor-pointer"
            onClick={() => handlePlaySong(song, index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePlaySong(song, index);
              }
            }}
          >
            <div className="relative mb-4 overflow-hidden rounded-md">
              <Image
                alt={`${song.title} cover`}
                className="w-full aspect-square object-cover group-hover:scale-105 transition"
                height={200}
                src={song.cover || '/placeholder.png'}
                width={200}
              />
            </div>
            <h3 className="font-medium text-sm text-white truncate">{song.title}</h3>
            <p className="text-xs text-on-muted truncate">{song.artist}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

export default PersonalizationRow;
