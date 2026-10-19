import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArtistCard from '@/components/ui/ArtistCard';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => {
    const { src, alt, onError, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-testid="artist-image" src={src} onError={onError} {...rest} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: React.ComponentProps<'a'>) => (
    <a data-testid="artist-link" href={href}>
      {children}
    </a>
  ),
}));

// Mock Share modal
vi.mock('@/components/common/dashboard/Share', () => ({
  default: ({ link }: { link: string }) => <div data-link={link} data-testid="share-modal" />,
}));

describe('ArtistCard Component', () => {
  const baseArtist = {
    id: 'artist-1',
    name: 'Burna Boy',
    image: '/artist.jpg',
    genre: 'Afrobeats',
    description: 'Grammy award winning artist',
    votes: 120,
    followers: 5400,
    collections: 12,
  };

  describe('Default Variant', () => {
    it('renders artist name, followers and collections correctly', () => {
      render(<ArtistCard artist={baseArtist} />);

      expect(screen.getByText('Burna Boy')).toBeInTheDocument();
      expect(screen.getByText(/5\.4k followers/i)).toBeInTheDocument();
      expect(screen.getByText(/12 collections/i)).toBeInTheDocument();
      expect(screen.getByTestId('artist-link')).toHaveAttribute(
        'href',
        '/dashboard/artist/artist-1'
      );
    });

    it('renders follow button slot if provided', () => {
      render(
        <ArtistCard
          artist={baseArtist}
          followButton={<button data-testid="follow-btn">Follow</button>}
        />
      );

      expect(screen.getByTestId('follow-btn')).toBeInTheDocument();
    });

    it('displays initials fallback if image fails', () => {
      render(<ArtistCard artist={{ ...baseArtist, image: null }} />);
      expect(screen.getByText('BB')).toBeInTheDocument();
    });
  });

  describe('Community Variant', () => {
    it('renders community layout with votes and vote button', () => {
      const onVote = vi.fn();
      render(
        <ArtistCard
          artist={baseArtist}
          hasVoted={false}
          isVoting={false}
          variant="community"
          onVote={onVote}
        />
      );

      expect(screen.getByText('Burna Boy')).toBeInTheDocument();
      expect(screen.getByText('Afrobeats')).toBeInTheDocument();
      expect(screen.getByText('120 Votes')).toBeInTheDocument();

      const voteBtn = screen.getByRole('button', { name: 'Vote' });
      expect(voteBtn).toBeInTheDocument();
      fireEvent.click(voteBtn);
      expect(onVote).toHaveBeenCalledWith('artist-1');
    });

    it('renders voted state when hasVoted is true', () => {
      const onVote = vi.fn();
      render(
        <ArtistCard
          artist={baseArtist}
          hasVoted={true}
          isVoting={false}
          variant="community"
          onVote={onVote}
        />
      );

      const voteBtn = screen.getByRole('button', { name: 'Voted' });
      expect(voteBtn).toBeDisabled();
    });

    it('renders voting state when isVoting is true', () => {
      const onVote = vi.fn();
      render(
        <ArtistCard
          artist={baseArtist}
          hasVoted={false}
          isVoting={true}
          variant="community"
          onVote={onVote}
        />
      );

      const voteBtn = screen.getByRole('button', { name: /voting/i });
      expect(voteBtn).toBeDisabled();
    });
  });
});
