import * as Sentry from '@sentry/nextjs';
import { scrubSensitiveData } from './lib/sentryScrub';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!SENTRY_DSN) {
    return;
  }

  // #834 — same environment/release convention as sentry.client.config.ts,
  // so a single issue groups events from every runtime consistently.
  const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV;
  const release = process.env.NEXT_PUBLIC_SENTRY_RELEASE;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment,
      release,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '0.1'),
      beforeSend: scrubSensitiveData,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment,
      release,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '0.1'),
      beforeSend: scrubSensitiveData,
    });
  }
}
