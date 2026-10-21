'use client';

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { SquareCheck, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CommunityArtist } from '@/lib/communityService';

const ShareModal = dynamic(() => import('@/components/common/dashboard/Share'), {
  loading: () => <div className="w-5 h-5" />,
  ssr: false,
});

function slugify(name: string): string {
  return name.replace(/\s+/g, '-').toLowerCase();
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function formatCount(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '0';
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numericValue);
}

export type ArtistCardVariant = 'default' | 'community';

export interface ArtistCardArtist {
  id: string | number;
  name: string;
  image?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  genre?: string;
  description?: string;
  votes?: number | string;
  followers?: number | string;
  followerCount?: number | string;
  collections?: number | string;
  collectionCount?: number | string;
}

export type Artist = CommunityArtist;

export interface ArtistCardProps {
  artist: ArtistCardArtist;
  variant?: ArtistCardVariant;
  /** Default variant: action slot rendered beside the profile link. */
  followButton?: ReactNode;
  href?: string;
  className?: string;
  /** Community variant: voting state and handler. */
  hasVoted?: boolean;
  isVoting?: boolean;
  onVote?: (artistId: string | number) => void;
}

export default function ArtistCard({
  artist,
  variant = 'default',
  followButton,
  href,
  className = '',
  hasVoted = false,
  isVoting = false,
  onVote,
}: ArtistCardProps) {
  const imageSource = artist.image ?? artist.avatar ?? artist.avatarUrl ?? null;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSource]);

  const followers = artist.followers ?? artist.followerCount;
  const collections = artist.collections ?? artist.collectionCount;
  const artistHref = href ?? `/artist/${artist.id}`;

  if (variant === 'community') {
    return (
      <Card
        className={cn(
          'hover:bg-surface bg-transparent border-none p-4 rounded-xl text-white flex justify-center flex-col items-center',
          className
        )}
      >
        <div className="w-2/3 m-auto h-20 relative overflow-hidden rounded-md mb-4 bg-gray-900">
          {imageSource && !imageFailed ? (
            <Image
              unoptimized
              alt={artist.name}
              className="w-full h-full object-cover"
              height={300}
              src={imageSource}
              width={300}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#885FA8] text-sm font-semibold text-white">
              {getInitials(artist.name)}
            </div>
          )}
        </div>
        <div className="text-on-muted text-center w-full">
          <h3 className="text-lg text-white font-bold">{artist.name}</h3>
          {artist.genre && <p className="text-sm font-medium mb-1">{artist.genre}</p>}
          {artist.description && <p className="text-xs mb-1 line-clamp-2">{artist.description}</p>}
          <div className="py-2 flex items-center justify-between">
            <div className="flex items-center">
              <SquareCheck size={15} />
              <span className="text-[10px] ml-1 font-bold">{artist.votes ?? 0} Votes</span>
            </div>
            <div className="flex items-center">
              <UserRound size={15} />
              <span className="text-[10px] ml-1 font-bold">
                {followers !== undefined ? formatCount(followers) : '—'}
              </span>
            </div>
            <ShareModal
              artistName={artist.name}
              link={`https://audioblocks.com/vote/${slugify(artist.name)}`}
            />
          </div>
          {onVote && (
            <button
              className="mt-auto bg-brand w-full hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold shadow transition-colors"
              disabled={isVoting || hasVoted}
              type="button"
              onClick={() => onVote(artist.id)}
            >
              {isVoting ? 'Voting…' : hasVoted ? 'Voted' : 'Vote'}
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-white/10 bg-[#171016] p-4 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg',
        className
      )}
    >
      <Link
        aria-label={`View ${artist.name}'s artist profile`}
        className="absolute inset-0 flex min-w-0 items-center gap-3 p-4 pr-20"
        href={artistHref}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#885FA8]">
          {imageSource && !imageFailed ? (
            <Image
              unoptimized
              alt={artist.name}
              className="h-full w-full object-cover"
              height={56}
              src={imageSource}
              width={56}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center text-sm font-semibold text-white"
            >
              {getInitials(artist.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">{artist.name}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#A3A3A3]">
            <span>{formatCount(followers)} followers</span>
            <span aria-hidden="true">•</span>
            <span>{formatCount(collections)} collections</span>
          </div>
        </div>
      </Link>

      {followButton && (
        <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2">{followButton}</div>
      )}
    </div>
  );
}
