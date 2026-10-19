'use client';

import { ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryProps {
  children: ReactNode;
}

const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: ErrorBoundaryProps) => children,
  {
    fallback: <ErrorFallback />,
    showDialog: false,
  }
);

function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-400 mb-6">
          We've been notified about this error and are working to fix it.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-pink-700 transition-colors font-semibold"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

export default SentryErrorBoundary;
