'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { cn } from '@/lib/utils';

export interface FollowButtonProps {
  userId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ userId, className, onFollowChange }: FollowButtonProps) {
  const signedIn = useHasAuthSession();
  const { isFollowing, isLoading, isPending, toggleFollow } = useFollow(userId);

  if (!signedIn || !userId) {
    return null;
  }

  // Loading state shown while follow status is being fetched on page load / navigation
  if (isLoading) {
    return (
      <button
        disabled
        aria-busy="true"
        aria-label="Loading follow status"
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors bg-surface-elevated text-on-muted border border-border-dark opacity-70 cursor-not-allowed',
          className
        )}
        type="button"
      >
        <Loader2 className="animate-spin" size={14} />
        <span>Loading...</span>
      </button>
    );
  }

  const handleClick = async () => {
    await toggleFollow();
    onFollowChange?.(!isFollowing);
  };

  return (
    <button
      aria-label={isFollowing ? 'Unfollow' : 'Follow'}
      aria-pressed={isFollowing}
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        isFollowing
          ? 'border border-gray-600 bg-transparent text-gray-200 hover:border-gray-400 hover:text-white'
          : 'bg-brand text-white hover:bg-brand-hover',
        className
      )}
      disabled={isPending}
      type="button"
      onClick={handleClick}
    >
      {isPending && <Loader2 className="animate-spin" size={14} />}
      <span>{isFollowing ? 'Following' : 'Follow'}</span>
    </button>
  );
}

export default FollowButton;
