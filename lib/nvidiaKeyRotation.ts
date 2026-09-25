/**
 * NVIDIA API key rotation process (#445).
 *
 * Raw NVIDIA API keys never live in this repo or in the client bundle —
 * they are held server-side. What the pipeline tracks here is key
 * *metadata* (stable `keyId`, creation and revocation dates) so rotation
 * is schedule-driven instead of memory-driven.
 *
 * Process in one line: issue a replacement key, keep the old key valid for
 * the grace window (dual-key overlap so in-flight jobs don't break),
 * re-encrypt everything to the new key, then revoke the old one — never
 * exceeding two concurrently active keys.
 */

export interface NvidiaKeyMetadata {
  /** Stable identifier used to reference the key without exposing it. */
  keyId: string;
  /** ISO date the key was issued. */
  createdAt: string;
  /** ISO date the key was revoked, if it has been. */
  revokedAt?: string | null;
}

export const ROTATION_INTERVAL_DAYS = 90;
export const GRACE_PERIOD_DAYS = 7;

export type RotationStatus = 'pending' | 'active' | 'grace' | 'expired';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Classifies a key's rotation status relative to `now`.
 *
 * - `active` — within the rotation interval, safe to use.
 * - `pending` — brand new; kept distinct so a just-issued key is never
 *   flagged for revocation while its predecessor is still in grace.
 * - `grace` — past the rotation interval but still within the grace
 *   window; must be replaced, not yet revoked.
 * - `expired` — past the grace window; must be revoked immediately.
 */
export function getRotationStatus(
  key: NvidiaKeyMetadata,
  now: Date = new Date()
): RotationStatus {
  if (key.revokedAt) return 'expired';

  const ageMs = now.getTime() - new Date(key.createdAt).getTime();
  const ageDays = Math.floor(ageMs / MS_PER_DAY);

  if (ageDays <= 0) return 'pending';
  if (ageDays <= ROTATION_INTERVAL_DAYS) return 'active';
  if (ageDays <= ROTATION_INTERVAL_DAYS + GRACE_PERIOD_DAYS) return 'grace';
  return 'expired';
}

/**
 * Returns the keys that require operator action right now: keys in the
 * grace window (need a replacement issued) and expired-but-unrevoked keys
 * (need revocation). Active and revoked keys are already handled.
 */
export function findKeysNeedingAction(
  keys: NvidiaKeyMetadata[],
  now: Date = new Date()
): NvidiaKeyMetadata[] {
  return keys.filter(
    (key) => getRotationStatus(key, now) === 'grace' || (getRotationStatus(key, now) === 'expired' && !key.revokedAt)
  );
}

/**
 * Validates the key registry invariants:
 *
 * 1. `keyId`s are unique — a duplicate means a key was minted twice or a
 *    record was corrupted.
 * 2. At most two concurrent unrevoked keys — the dual-key overlap is a
 *    deliberate grace mechanism, not a place to accumulate keys.
 *
 * @throws Error describing the first violated invariant.
 */
export function validateKeyRegistry(keys: NvidiaKeyMetadata[]): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key.keyId)) {
      throw new Error(`NVIDIA key registry: duplicate keyId '${key.keyId}'`);
    }
    seen.add(key.keyId);
  }

  const unrevoked = keys.filter((key) => !key.revokedAt);
  if (unrevoked.length > 2) {
    throw new Error(
      `NVIDIA key registry: ${unrevoked.length} unrevoked keys; rotation allows at most 2 concurrently`
    );
  }
}
