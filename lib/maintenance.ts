/**
 * Planned-maintenance mode and banner (#858).
 *
 * Two independent, flag-driven controls:
 *  - `MAINTENANCE_MODE` takes the whole site down to a static maintenance
 *    page. It is read directly (never through `NEXT_PUBLIC_*`) because it is
 *    only ever checked in middleware, before any page renders.
 *  - `NEXT_PUBLIC_MAINTENANCE_BANNER_MESSAGE` shows a dismissible banner
 *    announcing an upcoming or in-progress maintenance window without
 *    blocking access to the app.
 */

import { parseFlagValue } from '@/lib/featureFlags';

/** Whether the whole site should redirect to the maintenance page. Off unless set. */
export function isMaintenanceModeEnabled(
  value: string | undefined = process.env.MAINTENANCE_MODE
): boolean {
  return parseFlagValue(value, false);
}

/** The banner message to show, or `null` when there is nothing to announce. */
export function getMaintenanceBannerMessage(
  value: string | undefined = process.env.NEXT_PUBLIC_MAINTENANCE_BANNER_MESSAGE
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
