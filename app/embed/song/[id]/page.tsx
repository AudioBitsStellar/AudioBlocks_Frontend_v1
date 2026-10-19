'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import Image from 'next/image';

const Player = dynamic(() => import('@/components/common/Player'), { ssr: false });

export default function EmbedSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  if (!id) {
    notFound();
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="relative w-full aspect-square bg-gray-700">
            <Image
              alt="Song artwork"
              className="w-full h-full object-cover"
              fill
              src="/audio.jpg"
            />
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white truncate">Song {id}</h2>
              <p className="text-sm text-gray-400">Artist Name</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <Player />
            </div>

            <div className="text-xs text-gray-500 text-center">
              Powered by AudioBlocks
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
