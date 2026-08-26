/**
 * Lightweight client-side analytics (#323).
 *
 * Events are dispatched through Segment (`window.analytics`) when the snippet
 * is loaded, with a Google Analytics (`ga()`) fallback for the script already
 * loaded in the root layout. Tracking can be disabled entirely by setting
 * `NEXT_PUBLIC_ANALYTICS_ENABLED=false`.
 *
 * Consumers should call {@link trackEvent} with a snake_case event name and a
 * flat, serializable properties object.
 */

interface AnalyticsWindow extends Window {
  analytics?: {
    track: (event: string, properties?: Record<string, unknown>) => void;
  };
  ga?: (...args: unknown[]) => void;
}

/** Whether analytics tracking is enabled (defaults to enabled). */
export function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false';
}

/**
 * Track a named event with optional properties.
 *
 * No-ops silently when tracking is disabled or the environment is SSR, so it
 * is safe to call from effects and event handlers.
 */
export function trackEvent(eventName: string, properties: Record<string, unknown> = {}): void {
  if (!isAnalyticsEnabled()) return;
  if (typeof window === 'undefined') return;

  const w = window as unknown as AnalyticsWindow;

  // Segment (analytics.js) — preferred destination when the snippet is loaded.
  if (typeof w.analytics?.track === 'function') {
    w.analytics.track(eventName, properties);
  }

  // Google Analytics (analytics.js `ga()`) fallback.
  if (typeof w.ga === 'function') {
    w.ga('send', 'event', 'wallet', eventName, JSON.stringify(properties));
  }

  // Dev visibility without polluting production logs.
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[analytics] ${eventName}`, properties);
  }
}
