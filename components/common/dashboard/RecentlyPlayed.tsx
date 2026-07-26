'use client';

import { usePlayback } from '@/context/PlaybackContext';
import Image from 'next/image';
import { Play } from 'lucide-react';
import TrackList from './TrackList';

export default function RecentlyPlayed() {
  const { recentlyPlayed, playTrack } = usePlayback();

  if (recentlyPlayed.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Recently Played</h2>
        <span className="text-xs text-gray-400">{recentlyPlayed.length} tracks</span>
      </div>
      
      <TrackList tracks={recentlyPlayed} />
    </div>
  );
}
