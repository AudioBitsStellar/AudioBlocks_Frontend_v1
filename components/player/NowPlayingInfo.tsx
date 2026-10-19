'use client';

import { memo, type ReactNode } from 'react';
import Image from 'next/image';
import { Dot } from 'lucide-react';
import type { Track } from '@/context/PlaybackContext';

export interface NowPlayingInfoProps {
  track: Track | undefined;
  coverSrc: string;
  onCoverError: () => void;
  onOpenFullScreen: () => void;
  /** Rendered under the title row (the progress bar). */
  children: ReactNode;
}

export const NowPlayingInfo = memo(function NowPlayingInfo({
  track,
  coverSrc,
  onCoverError,
  onOpenFullScreen,
  children,
}: NowPlayingInfoProps) {
  return (
    <>
      <div className="h-12 w-12 relative shrink-0">
        <Image
          fill
          alt={track?.title ?? 'Now playing'}
          className="rounded-md object-cover"
          src={coverSrc}
          onError={onCoverError}
        />
      </div>

      <div className="flex items-center gap-4 w-2/5">
        <div className="flex-1 cursor-pointer" onClick={onOpenFullScreen}>
          <div className="flex items-center justify-center mb-3">
            <div className="text-white font-medium mr-4 text-sm truncate">{track?.title}</div>
            <div className="text-gray-400 flex items-center text-xs truncate">
              <Dot className="mr-4 text-white" size={20} />
              {track?.artist}
            </div>
          </div>
          {children}
        </div>
      </div>
    </>
  );
});
