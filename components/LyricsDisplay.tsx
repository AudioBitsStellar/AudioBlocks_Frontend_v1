interface LyricsDisplayProps {
  lyrics: string | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

/**
 * Lyrics panel for the full-screen player (#583). Shows the loading, empty and
 * error states, and a scrollable region for the text. Plain text for now; the
 * text can take timestamps later for synced highlighting.
 */
export function LyricsDisplay({ lyrics, isLoading, isError, onRetry }: LyricsDisplayProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-gray-400 text-center" role="status">
        Loading lyrics…
      </p>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center gap-3 text-sm text-gray-300 text-center"
        role="alert"
      >
        <p>Couldn&apos;t load lyrics.</p>
        {onRetry && (
          <button
            className="px-3 py-1.5 rounded-full border border-gray-500 text-white hover:bg-white/10 transition-colors"
            type="button"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!lyrics) {
    return <p className="text-sm text-gray-400 text-center">No lyrics available for this song.</p>;
  }

  return (
    <div
      aria-label="Lyrics"
      className="h-full w-full overflow-y-auto whitespace-pre-line text-center text-base leading-relaxed text-white/90"
      role="region"
      tabIndex={0}
    >
      {lyrics}
    </div>
  );
}
