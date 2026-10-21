/**
 * Demo fixture data lives in this folder and nowhere else (see "Mocks and
 * fixtures" in CONTRIBUTING.md). It is only used when
 * `NEXT_PUBLIC_USE_DEMO_DATA=true`, so a production build with the flag unset
 * never shows fixture data by accident.
 *
 * The variable is read with a literal `process.env` access so Next.js can
 * inline it into the client bundle.
 */
export const USE_DEMO_DATA = process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true';

/** Returns `data` when demo data is enabled, otherwise `fallback` (usually an empty list). */
export function demoOr<T>(data: T, fallback: T, enabled: boolean = USE_DEMO_DATA): T {
  return enabled ? data : fallback;
}
