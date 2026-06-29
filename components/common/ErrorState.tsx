import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <AlertTriangle size={32} className="text-brand" />
      <p className="text-sm text-on-muted max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-pink-700 rounded-full transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
