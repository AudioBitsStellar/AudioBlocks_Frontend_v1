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
  // #837 — the Sentry event id doubles as a support reference: it correlates
  // what the user sees with the captured error (and its request_id tag, if
  // one was attached) in Sentry.
  const eventId = Sentry.lastEventId();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-400 mb-6">
          We&apos;ve been notified about this error and are working to fix it.
        </p>
        {eventId && (
          <p className="text-xs text-gray-500 mb-6 font-mono select-all">Reference: {eventId}</p>
        )}
        <button
          className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-pink-700 transition-colors font-semibold"
          onClick={() => window.location.href = '/'}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

export default SentryErrorBoundary;
