import apiClient, { NotFoundError } from './apiClient';
import { API_ENDPOINTS } from './constants';

/** Phrase the user must type before a deletion can be requested (#598). */
export const ACCOUNT_DELETION_CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT';

export interface AccountDeletionStatus {
  /** ISO timestamp when the account will be deleted, or null when nothing is scheduled. */
  scheduledFor: string | null;
}

/** Accepts both `{ scheduledFor }` and `{ deletion: { scheduledFor } }` response bodies. */
function normalizeDeletionStatus(body: unknown): AccountDeletionStatus {
  const record = (body ?? {}) as { scheduledFor?: unknown; deletion?: { scheduledFor?: unknown } };
  const value = record.scheduledFor ?? record.deletion?.scheduledFor;
  return { scheduledFor: typeof value === 'string' ? value : null };
}

/** Returns the pending deletion, if any. A 404 from the backend means nothing is scheduled. */
export async function getAccountDeletionStatus(): Promise<AccountDeletionStatus> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.ACCOUNT_DELETION);
    return normalizeDeletionStatus(res.data);
  } catch (error) {
    if (error instanceof NotFoundError) return { scheduledFor: null };
    throw error;
  }
}

/** Schedules account deletion after the backend's grace period. */
export async function requestAccountDeletion(): Promise<AccountDeletionStatus> {
  const res = await apiClient.post(API_ENDPOINTS.ACCOUNT_DELETION, {
    confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
  });
  return normalizeDeletionStatus(res.data);
}

/** Cancels a scheduled deletion during the grace period. */
export async function cancelAccountDeletion(): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.ACCOUNT_DELETION);
}

/** Fetches the user's data export. The caller decides how to save it. */
export async function exportAccountData(): Promise<unknown> {
  const res = await apiClient.get(API_ENDPOINTS.ACCOUNT_EXPORT);
  return res.data;
}
