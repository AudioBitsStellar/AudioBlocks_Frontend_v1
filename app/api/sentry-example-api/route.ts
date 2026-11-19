import { NextResponse } from 'next/server';

/**
 * Throws a server-side error on purpose (#834 — OBS-01's "verified with a
 * test error" acceptance criterion). Hit from the button on
 * `/sentry-example-page`; not linked from anywhere else in the app.
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return NextResponse.json(
      { error: 'Sentry is not configured (NEXT_PUBLIC_SENTRY_DSN is unset).' },
      { status: 503 }
    );
  }

  throw new Error('Sentry test error (server) — triggered from /sentry-example-page');
}
