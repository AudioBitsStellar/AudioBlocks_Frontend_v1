'use client';

import { useFollowedPlaylists, useToggleFollowPlaylist } from '@/hooks/usePlaylists';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import type { PlaylistSummary } from '@/lib/playlistService';

interface FollowPlaylistButtonProps {
  playlist: PlaylistSummary;
  /** The owner cannot follow their own playlist, so the button is hidden for them. */
  isOwner: boolean;
}

/**
 * Follow / Following toggle for a playlist the signed-in user does not own.
 * Renders nothing for signed-out users or the playlist owner.
 */
export function FollowPlaylistButton({ playlist, isOwner }: FollowPlaylistButtonProps) {
  const signedIn = useHasAuthSession();
  const followed = useFollowedPlaylists(signedIn);
  const toggle = useToggleFollowPlaylist();

  if (!signedIn || isOwner) return null;

  const isFollowing = followed.data?.some((item) => item.id === playlist.id) ?? false;
  const disabled = followed.isLoading || toggle.isPending;

  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9] ${
        isFollowing
          ? 'border border-gray-600 text-gray-200 hover:border-gray-400'
          : 'bg-[#D2045B] text-white hover:bg-[#b80350]'
      }`}
      disabled={disabled}
      type="button"
      onClick={() => toggle.mutate({ playlist, follow: !isFollowing })}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}

export default FollowPlaylistButton;
