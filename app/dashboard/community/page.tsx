'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { SquareCheck, UserRound, Music } from 'lucide-react';
import { toast } from 'sonner';
import { useArtistLeaderboard, useCastVote, useMyVotes } from '@/hooks/useCommunity';
import { useQueryClient } from '@tanstack/react-query';

const ShareModal = dynamic(() => import('@/components/common/dashboard/Share'), {
  loading: () => <div className="w-5 h-5" />,
  ssr: false,
});

const genres = ['All', 'Electronic', 'Pop', 'Contemporary'];

function slugify(name: string): string {
  return name.replace(/\s+/g, '-').toLowerCase();
}

const CommunityTabs = () => {
  const [filter, setFilter] = useState('All');
  const [selectedTab, setSelectedTab] = useState('vote');
  const { data: artists = [], isLoading: artistsLoading, isError: artistsError } = useArtistLeaderboard();
  const { data: myVotes = [] } = useMyVotes();
  const voteMutation = useCastVote();
  const queryClient = useQueryClient();

  const filteredArtists = filter === 'All' ? artists : artists.filter((a) => a.genre.includes(filter));

  const handleVote = (artistId: string | number) => {
    if (myVotes.includes(artistId)) {
      toast.error('You have already voted for this artist');
      return;
    }
    voteMutation.mutate(
      { artistId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['community-leaderboard'] });
          queryClient.invalidateQueries({ queryKey: ['community-my-votes'] });
          toast.success('Vote cast successfully');
        },
        onError: () => {
          toast.error('Failed to cast vote. Please try again.');
        },
      }
    );
  };

  return (
    <>
      <p className="text-xs capitalize font-medium text-left text-on-muted mb-2">
        Community / <span className="text-white">{selectedTab}</span>
      </p>
      <div className="border-b mt-7">
        <h1 className="text-on-subtle text-3xl font-bold mb-2">Community</h1>
      </div>

      <Tabs
        defaultValue="vote"
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value)}
        className="w-full"
      >
        <TabsList className="flex gap-4 py-4">
          <TabsTrigger
            value="vote"
            className="data-[state=active]:bg-brand font-medium text-sm cursor-pointer data-[state=active]:text-white text-on-muted bg-surface-input px-3 py-2 rounded-xl"
          >
            Vote
          </TabsTrigger>
          <TabsTrigger
            value="leaderboard"
            className="data-[state=active]:bg-brand font-medium text-sm cursor-pointer data-[state=active]:text-white text-on-muted bg-surface-input px-3 py-2 rounded-xl"
          >
            Leaderboards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vote">
          <p className="text-white text-sm mb-6">
            The Artist Voting section lets you explore up-and-coming musicians and cast your vote to
            help them gain recognition
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex items-center bg-transparent border rounded-full px-4 py-2 w-full sm:w-auto sm:flex-1">
              <FiSearch className="text-gray-400 text-lg shrink-0" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search by artists"
                aria-label="Search artists"
                className="ml-3 w-full bg-transparent outline-none text-sm text-gray-200 placeholder:text-on-muted"
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

          {artistsError ? (
            <p className="py-8 text-center text-sm text-red-400">Failed to load artists. Please try again later.</p>
          ) : artistsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-7">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="border-none p-4 rounded-xl text-white flex flex-col items-center">
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
              <Music size={48} className="text-on-muted mb-4" />
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
                <Card
                  key={artist.id}
                  className="hover:bg-surface bg-transparent border-none p-4 rounded-xl text-white flex justify-center flex-col items-center"
                >
                  <Image
                    src={artist.image}
                    alt={artist.name}
                    width={300}
                    height={300}
                    className="w-2/3 m-auto h-20 object-cover rounded-md"
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
                      <ShareModal
                        link={`https://audioblocks.com/vote/${slugify(artist.name)}`}
                      />
                    </div>
                    <button
                      onClick={() => handleVote(artist.id)}
                      disabled={voteMutation.isPending || myVotes.includes(artist.id)}
                      className="mt-auto bg-brand w-full hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold shadow"
                    >
                      {myVotes.includes(artist.id) ? 'Voted' : 'Vote'}
                    </button>
                  </div>
                  <button
                    className="mt-auto bg-brand w-full hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow cursor-pointer"
                    onClick={() => toast.success(`Vote cast for ${artist.name}`)}
                  >
                    Vote
                  </button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard">
          <p className="text-white text-sm mb-10">
            The Leaderboard highlights our most dedicated music fans! See who&apos;s spending the most
            time listening and engaging with the platform.
          </p>

          {artists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-gray-800 rounded-lg">
              <UserRound size={48} className="text-on-muted mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">No leaderboard data yet</h3>
              <p className="text-on-muted text-sm max-w-sm">
                Votes will appear here once artists start receiving votes.
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm text-left text-gray-300 min-w-[480px]" aria-label="Top listeners leaderboard">
              <thead className="text-on-muted font-semibold text-sm">
                <tr>
                  <th scope="col" className="px-6 py-3">#</th>
                  <th scope="col" className="px-6 py-3">Top Listeners</th>
                  <th scope="col" className="px-6 py-3">Votes</th>
                  <th scope="col" className="px-6 py-3">Genre</th>
                </tr>
              </thead>
              <tbody>
                {artists.slice(0, 5).map((a, i) => (
                  <tr
                    key={a.id}
                    className="text-[#666C6C] hover:border cursor-pointer hover:bg-[#121212B8]"
                  >
                    <td className="px-6 py-6 font-normal">{i + 1}</td>
                    <td className="px-6 py-6 font-medium text-on-subtle">{a.name}</td>
                    <td className="px-6 py-6">{a.votes}</td>
                    <td className="px-6 py-6">{a.genre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default CommunityTabs;
