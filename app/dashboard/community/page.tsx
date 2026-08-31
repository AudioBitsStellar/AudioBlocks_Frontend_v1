'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useArtistLeaderboard, useCastVote, useMyVotes } from '@/hooks/useCommunity';
import LeaderboardTab from './_components/LeaderboardTab';
import VoteTab from './_components/VoteTab';

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
        className="w-full"
        defaultValue="vote"
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value)}
      >
        <TabsList className="flex gap-4 py-4 overflow-x-auto w-full scrollbar-none">
          <TabsTrigger
            className="data-[state=active]:bg-brand font-medium text-sm cursor-pointer data-[state=active]:text-white text-on-muted bg-surface-input px-5 py-2.5 rounded-xl shrink-0 min-h-[44px]"
            value="vote"
          >
            Vote
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:bg-brand font-medium text-sm cursor-pointer data-[state=active]:text-white text-on-muted bg-surface-input px-5 py-2.5 rounded-xl shrink-0 min-h-[44px]"
            value="leaderboard"
          >
            Leaderboards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vote">
          <VoteTab
            artists={artists}
            isError={artistsError}
            isLoading={artistsLoading}
            isVoting={voteMutation.isPending}
            myVotes={myVotes}
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
