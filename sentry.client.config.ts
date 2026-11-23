import * as Sentry from '@sentry/nextjs';
import { scrubSensitiveData } from './lib/sentryScrub';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // #834 — a dedicated environment var so staging/preview deploys get their
    // own Sentry environment instead of being lumped in with NODE_ENV's
    // coarse development/production/test split.
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Matches the release `withSentryConfig` (next.config.ts) associates
    // uploaded source maps with, so a captured error can be unminified.
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE || '0.1'),
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend: scrubSensitiveData,
  });
}
