'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, SearchX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ErrorVariant = 'generic' | 'network' | 'not-found';

export interface ErrorStateProps {
  /** The caught error (may be an Error, null, undefined, string, or unknown shape). */
  error?: unknown;
  title?: string;
  message?: string;
  illustration?: React.ReactNode;
  variant?: ErrorVariant;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  /** Correlation id of the failed request, shown so support can look it up (#837). */
  requestId?: string;
}

const variantIllustrations: Record<ErrorVariant, React.ReactNode> = {
  generic: <AlertTriangle className="text-brand" size={48} />,
  network: <WifiOff className="text-brand" size={48} />,
  'not-found': <SearchX className="text-brand" size={48} />,
};

const variantTitles: Record<ErrorVariant, string> = {
  generic: 'Something went wrong',
  network: 'Network error',
  'not-found': 'Not found',
};

const variantMessages: Record<ErrorVariant, string> = {
  generic: 'An unexpected error occurred. Please try again.',
  network: 'Unable to connect. Check your internet connection and try again.',
  'not-found': 'The content you are looking for could not be found.',
};

const DEFAULT_ERROR_MESSAGE = 'An unknown error occurred';

/**
 * Normalizes any error input to a user-facing string safely without crashing,
 * logging a warning for unexpected shapes (#139).
 */
export function resolveErrorMessage(error: unknown, explicitMessage?: string): string | undefined {
  if (explicitMessage) return explicitMessage;
  if (error === undefined) return undefined;

  if (error === null) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ErrorState] Received null error.');
    }
    return DEFAULT_ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    return error.message || DEFAULT_ERROR_MESSAGE;
  }

  if (typeof error === 'string') {
    return error.trim() || DEFAULT_ERROR_MESSAGE;
  }

  if (typeof error === 'number' || typeof error === 'boolean') {
    return String(error);
  }

  // Unexpected error shapes (objects, symbols, functions, etc.)
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[ErrorState] Received unexpected error shape:', error);
  }

  if (typeof error === 'object') {
    try {
      const msg = (error as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg.trim()) {
        return msg.trim();
      }
    } catch {
      // Ignore accessor throwing
    }
  }

  return DEFAULT_ERROR_MESSAGE;
}

export default function ErrorState({
  error,
  title,
  message,
  illustration,
  variant = 'generic',
  onRetry,
  isRetrying = false,
  className,
  requestId,
}: ErrorStateProps) {
  const displayTitle = title ?? variantTitles[variant];
  const displayMessage = resolveErrorMessage(error, message) ?? variantMessages[variant];
  const displayIllustration = illustration ?? variantIllustrations[variant];

  return (
    <div
      aria-live="assertive"
      className={cn('flex flex-col items-center justify-center gap-3 py-10 text-center', className)}
      role="alert"
    >
      {displayIllustration}
      <h2 className="text-lg font-semibold text-white">{displayTitle}</h2>
      <p className="text-sm text-on-muted max-w-xs">{displayMessage}</p>
      {onRetry && (
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-full transition-colors disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          disabled={isRetrying}
          onClick={onRetry}
        >
          {isRetrying ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
      {requestId && (
        <p className="text-xs text-on-muted/70 font-mono select-all">Reference: {requestId}</p>
      )}
    </div>
  );
}
