'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart, Play } from 'lucide-react';

interface Release {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  imageUrl: string;
  releaseDate: string;
  type: 'album' | 'single' | 'ep';
  isLiked?: boolean;
}

export function FollowingFeed() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [likedReleases, setLikedReleases] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFollowingFeed = async () => {
      setIsLoading(true);
      try {
        const followedJson = localStorage.getItem('followedArtists') || '[]';
        const followed = JSON.parse(followedJson) as string[];

        const mockReleases: Release[] = [
          {
            id: '1',
            title: 'New Horizons',
            artist: 'Artist One',
            artistId: 'a1',
            imageUrl: '/placeholder-release.png',
            releaseDate: new Date().toISOString(),
            type: 'album',
          },
          {
            id: '2',
            title: 'Summer Vibes',
            artist: 'Artist Two',
            artistId: 'a2',
            imageUrl: '/placeholder-release.png',
            releaseDate: new Date(Date.now() - 86400000).toISOString(),
            type: 'single',
          },
          {
            id: '3',
            title: 'Midnight Sessions',
            artist: 'Artist Three',
            artistId: 'a3',
            imageUrl: '/placeholder-release.png',
            releaseDate: new Date(Date.now() - 172800000).toISOString(),
            type: 'ep',
          },
        ];

        const likedJson = localStorage.getItem('likedReleases') || '[]';
        const liked = new Set(JSON.parse(likedJson));
        setLikedReleases(liked);

        setReleases(mockReleases);
      } catch (error) {
        console.error('Failed to load following feed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFollowingFeed();
  }, []);

  const toggleLike = (releaseId: string) => {
    const newLiked = new Set(likedReleases);
    if (newLiked.has(releaseId)) {
      newLiked.delete(releaseId);
    } else {
      newLiked.add(releaseId);
    }
    setLikedReleases(newLiked);
    localStorage.setItem('likedReleases', JSON.stringify(Array.from(newLiked)));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="text-gray-400 text-center py-8">Loading following feed...</div>;
  }

  if (releases.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        <p>No releases yet from followed artists</p>
        <p className="text-xs mt-2">Follow artists to see their new releases here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {releases.map((release) => (
        <div
          key={release.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition group"
        >
          <div className="relative shrink-0 w-12 h-12">
            <Image
              src={release.imageUrl}
              alt={`${release.title} cover`}
              fill
              className="rounded object-cover"
            />
            <button
              className="absolute inset-0 rounded flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
              aria-label={`Play ${release.title}`}
            >
              <Play size={16} className="text-white fill-white" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{release.title}</p>
            <p className="text-xs text-gray-400 truncate">{release.artist}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded capitalize">
                {release.type}
              </span>
              <span className="text-xs text-gray-500">{formatDate(release.releaseDate)}</span>
            </div>
          </div>

          <button
            onClick={() => toggleLike(release.id)}
            className={`shrink-0 transition ${
              likedReleases.has(release.id)
                ? 'text-red-500'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label={`${likedReleases.has(release.id) ? 'Unlike' : 'Like'} ${release.title}`}
          >
            <Heart
              size={16}
              className={likedReleases.has(release.id) ? 'fill-current' : ''}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
