/**
 * Premium-gate responses from the API (#584). `apiClient` dispatches this event
 * when a request is refused for a missing plan. `PremiumUpsellListener` turns it
 * into a toast that links to /plans, so no screen has to handle it.
 */
export const PREMIUM_REQUIRED_EVENT = 'audioblocks:premium-required';

/**
 * 402 always means a paid plan is needed. A 403 counts only when its message
 * says so, because the tier middleware answers "Please upgrade your subscription."
 */
export function isPremiumRequiredResponse(status: number, message?: string): boolean {
  if (status === 402) return true;
  return status === 403 && /upgrade|subscription|tier/i.test(message ?? '');
}

export function notifyPremiumRequired(message?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<{ message?: string }>(PREMIUM_REQUIRED_EVENT, { detail: { message } })
  );
}
