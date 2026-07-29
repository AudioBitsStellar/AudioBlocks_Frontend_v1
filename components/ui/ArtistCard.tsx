'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

export interface ArtistCardArtist {
  id: string | number;
  name: string;
  image?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  followers?: number | string;
  followerCount?: number | string;
  collections?: number | string;
  collectionCount?: number | string;
}

export interface ArtistCardProps {
  artist: ArtistCardArtist;
  followButton?: ReactNode;
  href?: string;
  className?: string;
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

export default function ArtistCard({
  artist,
  followButton,
  href,
  className = '',
}: ArtistCardProps) {
  const imageSource = artist.image ?? artist.avatar ?? artist.avatarUrl ?? null;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSource]);

  const artistHref = href ?? `/dashboard/artist/${artist.id}`;
  const followers = artist.followers ?? artist.followerCount;
  const collections = artist.collections ?? artist.collectionCount;

  return (
    <div
      className={`group relative rounded-2xl border border-white/10 bg-[#171016] p-4 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg ${className}`}
    >
      <Link
        href={artistHref}
        className="absolute inset-0 flex min-w-0 items-center gap-3 p-4 pr-20"
        aria-label={`View ${artist.name}'s artist profile`}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#885FA8]">
          {imageSource && !imageFailed ? (
            <Image
              src={imageSource}
              alt={artist.name}
              width={56}
              height={56}
              unoptimized
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {getInitials(artist.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">
            {artist.name}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#A3A3A3]">
            <span>{formatCount(followers)} followers</span>
            <span aria-hidden="true">•</span>
            <span>{formatCount(collections)} collections</span>
          </div>
        </div>
      </Link>

      {followButton && (
        <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2">
          {followButton}
        </div>
      )}
    </div>
  );
}
