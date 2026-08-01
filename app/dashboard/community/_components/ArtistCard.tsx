'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { SquareCheck, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { CommunityArtist } from '@/lib/communityService';

const ShareModal = dynamic(() => import('@/components/common/dashboard/Share'), {
  loading: () => <div className="w-5 h-5" />,
  ssr: false,
});

function slugify(name: string): string {
  return name.replace(/\s+/g, '-').toLowerCase();
}

export type Artist = CommunityArtist;

interface ArtistCardProps {
  artist: Artist;
  hasVoted: boolean;
  isVoting: boolean;
  onVote: (artistId: string | number) => void;
}

const ArtistCard = ({ artist, hasVoted, isVoting, onVote }: ArtistCardProps) => {
  return (
    <Card className="hover:bg-surface bg-transparent border-none p-4 rounded-xl text-white flex justify-center flex-col items-center">
      <Image
        alt={artist.name}
        className="w-2/3 m-auto h-20 object-cover rounded-md"
        height={300}
        src={artist.image}
        width={300}
      />
      <div className="text-on-muted text-center -mt-4">
        <h3 className="text-lg text-white font-bold">{artist.name}</h3>
        <p className="text-sm font-medium mb-1">{artist.genre}</p>
        <p className="text-xs mb-1 line-clamp-2">{artist.description}</p>
        <div className="py-2 flex items-center justify-between">
          <div className="flex items-center">
            <SquareCheck size={15} />
            <span className="text-[10px] ml-1 font-bold">{artist.votes} Votes</span>
          </div>
          <div className="flex items-center">
            <UserRound size={15} />
            <span className="text-[10px] ml-1 font-bold">1.2k</span>
          </div>
          <ShareModal link={`https://audioblocks.com/vote/${slugify(artist.name)}`} />
        </div>
        <button
          className="mt-auto bg-brand w-full hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold shadow"
          disabled={isVoting || hasVoted}
          onClick={() => onVote(artist.id)}
        >
          {isVoting ? 'Voting…' : hasVoted ? 'Voted' : 'Vote'}
        </button>
      </div>
    </Card>
  );
};

export default ArtistCard;
