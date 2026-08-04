'use client';

import { UserRound } from 'lucide-react';
import type { Artist } from './ArtistCard';

interface LeaderboardTabProps {
  artists: Artist[];
}

const LeaderboardTab = ({ artists }: LeaderboardTabProps) => {
  return (
    <>
      <p className="text-white text-sm mb-10">
        The Leaderboard highlights our most dedicated music fans! See who&apos;s spending the most
        time listening and engaging with the platform.
      </p>

      {artists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-gray-800 rounded-lg">
          <UserRound className="text-on-muted mb-4" size={48} />
          <h3 className="text-white text-lg font-semibold mb-2">No leaderboard data yet</h3>
          <p className="text-on-muted text-sm max-w-sm">
            Votes will appear here once artists start receiving votes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table
            aria-label="Top listeners leaderboard"
            className="w-full text-sm text-left text-gray-300 min-w-[480px]"
          >
            <thead className="text-on-muted font-semibold text-sm">
              <tr>
                <th className="px-6 py-3" scope="col">
                  #
                </th>
                <th className="px-6 py-3" scope="col">
                  Top Listeners
                </th>
                <th className="px-6 py-3" scope="col">
                  Votes
                </th>
                <th className="px-6 py-3" scope="col">
                  Genre
                </th>
              </tr>
            </thead>
            <tbody>
              {artists.slice(0, 5).map((a, i) => (
                <tr
                  key={a.id}
                  className="text-[#666C6C] hover:border cursor-pointer hover:bg-[#121212B8]"
                >
                  <td className="px-6 py-6 font-normal">{i + 1}</td>
                  <td className="px-6 py-6 font-medium text-on-subtle">{a.name}</td>
                  <td className="px-6 py-6">{a.votes}</td>
                  <td className="px-6 py-6">{a.genre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default LeaderboardTab;
