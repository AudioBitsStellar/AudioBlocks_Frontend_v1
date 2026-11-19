'use client';

import { useState } from 'react';

/**
 * Manual verification harness for Sentry (#834 — OBS-01's "verified with a
 * test error" acceptance criterion). Not linked from any nav — visit it
 * directly in a deploy with NEXT_PUBLIC_SENTRY_DSN set, trigger an error,
 * and confirm it shows up in Sentry tagged with the right environment and
 * release, and with source maps applied to the stack trace.
 */
export default function SentryExamplePage() {
  const [apiResult, setApiResult] = useState<string | null>(null);
  const dsnConfigured = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  const triggerServerError = async () => {
    try {
      const res = await fetch('/api/sentry-example-api');
      setApiResult(res.ok ? 'Unexpectedly succeeded' : `Server responded ${res.status}`);
    } catch {
      setApiResult('Request failed (check Sentry for the captured server error)');
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
      <h1 className="text-xl font-semibold text-white">Sentry test page</h1>
      <p className="text-sm text-on-muted">
        {dsnConfigured
          ? 'NEXT_PUBLIC_SENTRY_DSN is configured. Trigger an error below and check it arrives in Sentry.'
          : 'NEXT_PUBLIC_SENTRY_DSN is not set — errors below will not be captured anywhere.'}
      </p>
      <div className="flex flex-col gap-3 items-center">
        <button
          className="px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors"
          type="button"
          onClick={() => {
            throw new Error('Sentry test error (client) — triggered from /sentry-example-page');
          }}
        >
          Throw a client-side error
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-surface-input border border-border-dark text-white font-medium hover:bg-surface-hover transition-colors"
          type="button"
          onClick={triggerServerError}
        >
          Trigger a server-side error
        </button>
        {apiResult && <p className="text-xs text-on-muted">{apiResult}</p>}
      </div>
    </div>
  );
}
