import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LeaderboardTab from '@/app/dashboard/community/_components/LeaderboardTab';
import type { Artist } from '@/components/ui/ArtistCard';

describe('LeaderboardTab empty-state and layout (#17)', () => {
  it('renders empty-state illustration and message when artist list is empty', () => {
    render(<LeaderboardTab artists={[]} />);

    const emptyContainer = screen.getByTestId('leaderboard-empty-state');
    expect(emptyContainer).toBeInTheDocument();
    expect(emptyContainer).toHaveClass('min-h-[360px]');
    expect(screen.getByText('No leaderboard data yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Votes will appear here once artists start receiving votes/i)
    ).toBeInTheDocument();
  });

  it('renders empty-state when artists exist but all have zero votes', () => {
    const zeroVoteArtists: Artist[] = [
      {
        id: '1',
        name: 'Artist One',
        genre: 'Afrobeats',
        votes: 0,
        image: '/cat.png',
        description: 'New artist',
      },
      {
        id: '2',
        name: 'Artist Two',
        genre: 'Pop',
        votes: 0,
        image: '/cat.png',
        description: 'Another artist',
      },
    ];

    render(<LeaderboardTab artists={zeroVoteArtists} />);

    expect(screen.getByTestId('leaderboard-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No leaderboard data yet')).toBeInTheDocument();
  });

  it('renders the leaderboard table and mobile list when artists have votes', () => {
    const artistsWithVotes: Artist[] = [
      {
        id: '1',
        name: 'Top Star',
        genre: 'Electronic',
        votes: 150,
        image: '/cat.png',
        description: 'Popular artist',
      },
    ];

    render(<LeaderboardTab artists={artistsWithVotes} />);

    expect(screen.queryByTestId('leaderboard-empty-state')).not.toBeInTheDocument();
    expect(screen.getAllByText('Top Star').length).toBeGreaterThan(0);
    expect(screen.getAllByText('150 votes').length).toBeGreaterThan(0);
  });
});
