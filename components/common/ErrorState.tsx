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
      aria-live="assertive"
      className="flex flex-col items-center justify-center gap-3 py-10 text-center"
      role="alert"
    >
      <AlertTriangle className="text-brand" size={32} />
      <p className="text-sm text-on-muted max-w-xs">{message}</p>
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
    </div>
  );
}
