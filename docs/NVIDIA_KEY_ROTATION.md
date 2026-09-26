# NVIDIA API Key Rotation Runbook

NVIDIA API keys (used by the AI song quality filter) are secrets held
server-side only. This repo tracks key **metadata**, not keys themselves —
see `lib/nvidiaKeyRotation.ts` for the rotation helpers this runbook uses.
For the full integration setup (key storage, model pinning, inference
service), see `docs/NVIDIA_API_SETUP.md`.

## Schedule

| Parameter | Value | Source |
|-----------|-------|--------|
| Rotation interval | 90 days | `ROTATION_INTERVAL_DAYS` |
| Grace window (dual-key overlap) | 7 days | `GRACE_PERIOD_DAYS` |

## Rotation Steps

1. **Issue a replacement key** in the NVIDIA console. Record only its
   `keyId` and `createdAt` in the key registry — never the raw key.
2. **Store the new key server-side** with access limited to the inference
   service, encrypted at rest.
3. **Dual-key grace**: keep the old key valid for 7 days so in-flight
   analysis jobs don't fail. Exactly two unrevoked keys may exist during
   this window (`validateKeyRegistry` enforces this).
4. **Migrate traffic** to the new key: redeploy the inference service with
   the new key, confirm the dashboard shows successful calls.
5. **Revoke the old key** once the grace window ends or after step 4
   confirms success, whichever comes first. Mark `revokedAt` in the registry.
6. **Verify**: no pipeline jobs reference the revoked key (`findKeysNeedingAction`
   returns empty), and the registry holds exactly one unrevoked key.

## Alerts

- Key older than 90 days → rotate (status `grace`).
- Key past 97 days → revoke immediately (status `expired`); its use is an
  incident — file a postmortem with `docs/AI_PIPELINE_POSTMORTEM_TEMPLATE.md`.
- More than two unrevoked keys → registry violation; audit before any new
  key is issued.

## Emergency Rotation

If a key is suspected compromised (leaked in logs, seen in an unexpected
place), skip the grace window:

1. Issue and deploy a new key immediately.
2. Revoke the compromised key the moment the replacement is live.
3. Delete the leaked key from any store it touched (logs, chat, tickets).
