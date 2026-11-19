'use client';

export default function ArtistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12" role="alert">
      <h1 className="text-2xl font-bold">Unable to load this artist</h1>
      <p>Please try again in a moment.</p>
      {error.digest && (
        <p className="text-xs text-on-muted font-mono select-all">Reference: {error.digest}</p>
      )}
      <button className="rounded-full bg-brand px-4 py-2 text-white" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
