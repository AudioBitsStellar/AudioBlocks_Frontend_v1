'use client';

import { usePlayback } from '@/context/PlaybackContext';
import { Play } from 'lucide-react';

const sampleTracks = [
  { title: 'Relax and Unwind', artist: 'Rozé', cover: '/AFRO.jpg', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { title: 'Vibe Mix', artist: 'Yemi Sax', cover: '/AFRO.jpg', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { title: 'Cool Session', artist: 'Dunsin', cover: '/AFRO.jpg', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const Playlist = () => {
  const { playTrack, currentIndex, playlist, isPlaying } = usePlayback();

  return (
    <div className="font-inter">
      <p className="text-xs font-medium text-left text-white mb-2">My Playlist</p>

      <div className="bg-gradient-to-r from-[#6E0596] to-[#580577] p-8 py-12 rounded-lg text-white flex items-center justify-between mb-6">
        <div className="flex-1 gap-2">
          <h1 className="md:text-6xl text-3xl mb-2 font-extrabold">My Playlist</h1>
          <p className="font-semibold text-base">{sampleTracks.length} Songs Added</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {sampleTracks.map((track, i) => {
          const globalIndex = playlist.findIndex((t) => t.url === track.url);
          const isActive = globalIndex >= 0 && globalIndex === currentIndex && isPlaying;

          return (
            <div
              key={i}
              className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                isActive ? 'bg-surface border border-border-dark' : 'hover:bg-surface-hover'
              }`}
              onClick={() => playTrack(track)}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand shrink-0">
                <Play size={14} className="text-white ml-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isActive ? 'text-brand' : 'text-white'}`}>
                  {track.title}
                </p>
                <p className="text-xs text-on-muted truncate">{track.artist}</p>
              </div>
              <span className="text-xs text-on-muted shrink-0">{i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Playlist;
