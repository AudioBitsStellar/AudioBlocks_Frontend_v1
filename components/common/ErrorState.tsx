'use client';

import { AlertTriangle, RefreshCw, WifiOff, SearchX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ErrorVariant = 'generic' | 'network' | 'not-found';

interface ErrorStateProps {
  title?: string;
  message?: string;
  illustration?: React.ReactNode;
  variant?: ErrorVariant;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

const variantIllustrations: Record<ErrorVariant, React.ReactNode> = {
  generic: <AlertTriangle size={48} className="text-brand" />,
  network: <WifiOff size={48} className="text-brand" />,
  'not-found': <SearchX size={48} className="text-brand" />,
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

export default function ErrorState({
  title,
  message,
  illustration,
  variant = 'generic',
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  const displayTitle = title ?? variantTitles[variant];
  const displayMessage = message ?? variantMessages[variant];
  const displayIllustration = illustration ?? variantIllustrations[variant];

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle size={32} className="text-brand" />
      <p className="text-sm text-on-muted max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-full transition-colors disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {isRetrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
    </div>
  );
}
