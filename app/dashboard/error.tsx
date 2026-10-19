'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-96 p-6 gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-white">Dashboard Error</h1>
        <p className="text-sm text-gray-400">Something went wrong loading the dashboard.</p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
}
