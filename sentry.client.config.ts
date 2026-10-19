import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE || '0.1'),
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      return scrubSensitiveData(event);
    },
  });
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
      if (typeof value === 'string') {
        if (value.startsWith('0x') || value.startsWith('G') || value.includes('0x')) {
          scrubbedExtra[key] = '[REDACTED]';
        } else if (key.toLowerCase().includes('signature') || key.toLowerCase().includes('wallet')) {
          scrubbedExtra[key] = '[REDACTED]';
        } else {
          scrubbedExtra[key] = value;
        }
      } else {
        scrubbedExtra[key] = value;
      }
    }
    event.extra = scrubbedExtra;
  }

  return event;
}
