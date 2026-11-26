import * as Sentry from '@sentry/nextjs';

export interface ReportErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  digest?: string;
}

/**
 * Reports an error caught by a route or component error boundary to Sentry
 * with boundary tags and digest info, logging to console only in development.
 */
export function reportError(error: unknown, context?: ReportErrorContext) {
  const digest = context?.digest ?? (error as { digest?: string } | undefined)?.digest;
  const tags: Record<string, string> = {
    boundary: 'dashboard',
    ...(context?.tags ?? {}),
  };
  const extra: Record<string, unknown> = {
    ...(digest ? { digest } : {}),
    ...(context?.extra ?? {}),
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('Reported boundary error:', error, { tags, extra });
  }

  try {
    Sentry.captureException(error, {
      tags,
      extra,
    });
  } catch {
    // Sentry uninitialized or failed
  }
}
