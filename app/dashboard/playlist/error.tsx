'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function PlaylistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Playlist error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-96 p-6 gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-white">Failed to Load Playlists</h1>
        <p className="text-sm text-gray-400">Could not load your playlists. Please try again.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
