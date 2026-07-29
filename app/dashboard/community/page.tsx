'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import { useState } from 'react';
import { toast } from 'sonner';
import { useArtistLeaderboard, useCastVote, useMyVotes } from '@/hooks/useCommunity';
import { useQueryClient } from '@tanstack/react-query';
import VoteTab from './_components/VoteTab';
import LeaderboardTab from './_components/LeaderboardTab';

const CommunityTabs = () => {
  const [selectedTab, setSelectedTab] = useState('vote');
  const {
    data: artists = [],
    isLoading: artistsLoading,
    isError: artistsError,
  } = useArtistLeaderboard();
  const { data: myVotes = [] } = useMyVotes();
  const voteMutation = useCastVote();
  const queryClient = useQueryClient();

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
          <VoteTab
            artists={artists}
            isLoading={artistsLoading}
            isError={artistsError}
            myVotes={myVotes}
            isVoting={voteMutation.isPending}
            onVote={handleVote}
          />
        </TabsContent>

        <TabsContent value="leaderboard">
          <LeaderboardTab artists={artists} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default CommunityTabs;
