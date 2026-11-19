import type { Event } from '@sentry/nextjs';

/**
 * PII scrubbing shared by every Sentry runtime (#834 — OBS-01): browser
 * (`sentry.client.config.ts`), Node and edge (`instrumentation.ts`). Used as
 * each runtime's `beforeSend` hook.
 *
 * Redacts auth-looking headers and wallet-looking values (EVM `0x...`
 * addresses, Stellar `G...` public keys/signatures) so neither ends up in a
 * captured event.
 */
export function scrubSensitiveData(event: Event): Event | null {
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
    const scrubbedExtra: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.extra)) {
      if (typeof value === 'string') {
        if (value.startsWith('0x') || value.startsWith('G')) {
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
