'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { reportError } from '@/lib/reportError';

export default function ArtistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { tags: { boundary: 'dashboard', section: 'artist' }, extra: { digest: error.digest } });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-96 p-6 gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-white">Failed to Load Artist</h1>
        <p className="text-sm text-gray-400">Could not load the artist data. Please try again.</p>
        {error.digest && (
          <p className="text-xs text-gray-500 font-mono select-all">Reference: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          onClick={reset}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
        <Link
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          href="/dashboard"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
