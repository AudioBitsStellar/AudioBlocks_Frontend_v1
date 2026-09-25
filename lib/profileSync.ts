import apiClient from './apiClient';

/**
 * Endpoint that mirrors the authenticated provider (Dynamic/Privy) user state
 * into the backend's user profile (#477).
 *
 * Called once right after a successful login or registration so the backend
 * record has the provider's view of the user (wallet address, email, provider
 * user id) instead of only what the original register call captured.
 */
export const AUTH_SYNC_ENDPOINT = '/api/auth/sync';

/** Provider user state pushed to the backend after login (#477). */
export interface PrivyProfileSyncPayload {
  /** Connected/primary wallet address lower-cased by the caller. */
  walletAddress: string;
  /** Email from the Dynamic user, when one exists (email/social login). */
  email?: string | null;
  /** Dynamic's stable user id, so the backend can correlate across wallets. */
  dynamicUserId?: string | null;
  /** Role chosen in the connect-wallet prompt (#476), when known. */
  role?: string | null;
}

/**
 * Push the provider user state to the backend.
 *
 * Best-effort by design (#477): the JWT session is already established at the
 * call site, so a sync failure must never log the user out or surface an
 * error toast — it only means the backend profile may be slightly stale until
 * the next login. Returns whether the sync succeeded (useful in tests).
 */
export async function syncPrivyUserWithBackend(payload: PrivyProfileSyncPayload): Promise<boolean> {
  try {
    await apiClient.post(AUTH_SYNC_ENDPOINT, payload);
    return true;
  } catch {
    return false;
  }
}
