'use client';

import { useState } from 'react';
import { Music } from 'lucide-react';
import { FiSearch } from 'react-icons/fi';
import { Card } from '@/components/ui/card';
import ArtistCard, { type Artist } from './ArtistCard';

const genres = ['All', 'Electronic', 'Pop', 'Contemporary'];

interface VoteTabProps {
  artists: Artist[];
  isLoading: boolean;
  isError: boolean;
  myVotes: Array<string | number>;
  isVoting: boolean;
  onVote: (artistId: string | number) => void;
}

const VoteTab = ({ artists, isLoading, isError, myVotes, isVoting, onVote }: VoteTabProps) => {
  const [filter, setFilter] = useState('All');
  const filteredArtists =
    filter === 'All' ? artists : artists.filter((a) => a.genre.includes(filter));

  return (
    <>
      <p className="text-white text-sm mb-6">
        The Artist Voting section lets you explore up-and-coming musicians and cast your vote to
        help them gain recognition
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center bg-transparent border rounded-full px-4 py-2 w-full sm:w-auto sm:flex-1">
          <FiSearch aria-hidden="true" className="text-gray-400 text-lg shrink-0" />
          <input
            aria-label="Search artists"
            className="ml-3 w-full bg-transparent outline-none text-sm text-gray-200 placeholder:text-on-muted"
            placeholder="Search by artists"
            type="search"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {genres.map((g) => (
            <button
              key={g}
              aria-pressed={filter === g}
              className={`px-4 py-1 font-medium cursor-pointer text-sm rounded-2xl border ${
                filter === g ? 'bg-brand text-white' : 'bg-surface-input text-on-muted'
              }`}
              onClick={() => setFilter(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <p className="py-8 text-center text-sm text-red-400">
          Failed to load artists. Please try again later.
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-7">
          {[...Array(5)].map((_, i) => (
            <Card
              key={i}
              className="border-none p-4 rounded-xl text-white flex flex-col items-center"
            >
              <div className="w-2/3 h-20 rounded-md bg-gray-800 animate-pulse" />
              <div className="text-center -mt-4 w-full">
                <div className="h-5 w-3/4 bg-gray-800 rounded mx-auto mb-2" />
                <div className="h-4 w-1/2 bg-gray-800 rounded mx-auto mb-2" />
                <div className="h-3 w-full bg-gray-800 rounded mb-2" />
                <div className="h-8 w-full bg-gray-800 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Music className="text-on-muted mb-4" size={48} />
          <h3 className="text-white text-lg font-semibold mb-2">No artists found</h3>
          <p className="text-on-muted text-sm max-w-sm">
            {filter === 'All'
              ? 'There are no artists on the leaderboard yet. Check back soon!'
              : `No artists found in the "${filter}" genre. Try a different filter.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-7">
          {filteredArtists.map((artist) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              hasVoted={myVotes.includes(artist.id)}
              isVoting={isVoting}
              onVote={onVote}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default VoteTab;
