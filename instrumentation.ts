import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!SENTRY_DSN) {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '0.1'),
      beforeSend(event, hint) {
        return scrubSensitiveData(event);
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '0.1'),
      beforeSend(event, hint) {
        return scrubSensitiveData(event);
      },
    });
  }
}

function scrubSensitiveData(event: Sentry.Event): Sentry.Event | null {
  if (event.request) {
    const headers = event.request.headers || {};
    const scrubbedHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (
        key.toLowerCase().includes('authorization') ||
        key.toLowerCase().includes('cookie') ||
        key.toLowerCase().includes('token')
      ) {
        scrubbedHeaders[key] = '[REDACTED]';
      } else {
        scrubbedHeaders[key] = String(value);
      }
    }

    event.request.headers = scrubbedHeaders;
  }

  if (event.extra) {
    const scrubbedExtra: Record<string, any> = {};
    for (const [key, value] of Object.entries(event.extra)) {
      if (typeof value === 'string' && (value.startsWith('0x') || value.startsWith('G'))) {
        scrubbedExtra[key] = '[REDACTED]';
      } else {
        scrubbedExtra[key] = value;
      }
    }
    event.extra = scrubbedExtra;
  }

  return event;
}
