'use client';

import { AlertCircle } from 'lucide-react';

export default function EmbedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h1 className="text-lg font-bold text-white">Failed to Load Song</h1>
            <p className="text-sm text-gray-400 mt-2">Could not load the embedded player.</p>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
