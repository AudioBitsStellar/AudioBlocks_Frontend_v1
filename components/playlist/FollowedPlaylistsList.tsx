'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useFollowedPlaylists } from '@/hooks/usePlaylists';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';

interface FollowedPlaylistsListProps {
  className?: string;
}

/**
 * Collapsible list of the playlists the signed-in user follows. Renders nothing for
 * signed-out users, so the query only runs once a session exists.
 */
export function FollowedPlaylistsList({ className }: FollowedPlaylistsListProps) {
  const signedIn = useHasAuthSession();
  if (!signedIn) return null;
  return <FollowedPlaylistsContent className={className} />;
}

function FollowedPlaylistsContent({ className }: FollowedPlaylistsListProps) {
  const followed = useFollowedPlaylists(true);
  const [expanded, setExpanded] = useState(true);

  const playlists = followed.data ?? [];
  if (playlists.length === 0) return null;

  return (
    <section aria-label="Followed playlists" className={className}>
      <button
        aria-controls="followed-playlists-list"
        aria-expanded={expanded}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9] rounded"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        Followed playlists
        <ChevronDown
          aria-hidden="true"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          size={14}
        />
      </button>

      {expanded && (
        <ul className="mt-2 flex flex-col gap-1" id="followed-playlists-list">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <Link
                className="block truncate rounded px-2 py-1 text-sm text-[#A3A3A3] hover:text-white transition-colors"
                href={`/dashboard/playlist/${playlist.id}`}
              >
                {playlist.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default FollowedPlaylistsList;
