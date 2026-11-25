# Anti-Abuse Measures for Client-Reported Playback Events

**Scope:** Client-side play counting via `NEXT_PUBLIC_PLAYBACK_EVENT_URL` (#796)
**Status:** Documented - client-side rate limiting in place; server-side deduplication required
**Related code:** `lib/playbackEvents.ts`

---

## Overview

The AudioBlocks listener reports play events to the backend for play-count tracking. Since the client can be manipulated, the system implements layered anti-abuse measures:

- **Client-side rate limiting and batching** - Protective, not security-critical
- **Server-side deduplication** - Security-critical; must be implemented
- **Bounded queue with age filtering** - Prevents memory exhaustion

---

## Client-Side Design

### Queue Bounds

Events are stored in an in-memory queue with two bounds:

| Property | Value | Purpose |
|----------|-------|---------|
| Max events | 100 | Prevents memory bloat from rapid plays |
| Max age | 24 hours | Drops stale events; reduces backend load on reconnect |

**Code:** `lib/playbackEvents.ts` lines 3-4

### Batching

Client sends events in batches of **up to 10 per flush**:

```typescript
await Promise.all(queue.slice(0, 10).map(async (event) => {
  // POST event.url with event data
}));
```

**Benefits:**
- Reduces HTTP requests (vs. one per play)
- Easier for the server to deduplicate within a batch
- If the backend has rate limits, batching distributes load

**Code:** `lib/playbackEvents.ts` lines 20-44

### Deduplication Identifier

Each event carries a unique `eventId` (UUID v4):

```typescript
eventId: crypto.randomUUID()
```

This is used for idempotency: if the network request succeeds but the response is lost, the client retries with the same `eventId`. The server must deduplicate by this field to avoid double-counting.

**Code:** `lib/playbackEvents.ts` lines 1-2

### Flush Triggers

Events are sent:

1. **Every 5 seconds** (timer)
2. **When the page becomes hidden** (visibility change, page unload)
3. **When the browser comes back online** (online event)

This ensures plays are reported soon after, without excessive polling.

**Code:** `lib/playbackEvents.ts` lines 75-81

---

## Server-Side Requirements

### Deduplication

**CRITICAL:** The backend must deduplicate by `eventId` within a time window (suggested: 24 hours, matching client max-age).

A single `eventId` received multiple times must be counted as one play.

**Why:** Network retries, page refreshes, and multiple device reconnects can submit the same event multiple times.

### Implementation Notes

- Store recently-seen `eventId` values in a cache (Redis, DynamoDB, etc.)
- Accept events with duplicate `eventId` but increment play count only on first occurrence
- Expire the cache after the max-age window (24 hours)

### Validation

Before counting a play:

1. Validate `eventId` is a valid UUID
2. Check `songId` is a valid song in the catalog
3. Check `createdAt` is recent (e.g., not older than 24 hours)
4. Reject if `eventId` already seen (deduplicate)

---

## Threat Model & Mitigations

### Threat: Malicious client submission of arbitrary event IDs

**Mitigation:** Server-side deduplication and validation.

A malicious user could:
- Change the `songId` to report fake plays
- Spam events with valid `eventId` but different `songId` values

**What the server can do:**
- Rate-limit by IP or user identity if available
- Validate that plays cluster reasonably (not 1000 plays/second)
- Monitor anomalies (users with improbable play counts)
- Implement CAPTCHA or proof-of-work for high-volume submissions

### Threat: Replay attacks (capturing and re-sending events)

**Mitigation:** Client uses HTTPS; events are time-stamped.

The `createdAt` timestamp allows the server to reject events older than a threshold (24 hours).

### Threat: Circumventing batching limits

**Mitigation:** Client-side bounds + server-side rate limiting.

The client enforces a 100-event queue and 10-per-batch limit. The server can further rate-limit by user, IP, or origin.

---

## Configuration

### Environment Variables

| Variable | Required | Type | Example |
|----------|----------|------|---------|
| `NEXT_PUBLIC_PLAYBACK_EVENT_URL` | Optional | URL template | `https://api.audioblocks.dev/api/songs/:id/plays` |

The URL must contain `:id`, which is replaced with the song ID (URL-encoded).

**Security note:** This is a `NEXT_PUBLIC_` variable, so the endpoint is public and must accept unauthenticated requests (since the client cannot hold secrets). Protect it via rate limiting and deduplication, not authentication.

### Disabling Play Event Reporting

If `NEXT_PUBLIC_PLAYBACK_EVENT_URL` is unset or missing `:id`, event reporting is disabled:

```typescript
if (!endpoint?.includes(':id')) return;
```

**Code:** `lib/playbackEvents.ts` lines 86, 93

---

## Future Improvements

1. **User-aware rate limiting** - If users are authenticated, rate-limit per user (e.g., max 10,000 plays/day)
2. **Proof-of-work challenge** - Require a small computational proof from the client before accepting high-frequency events
3. **Cryptographic signatures** - Sign events with a time-limited key to prevent replay
4. **ML-based anomaly detection** - Flag suspicious patterns (burst activity, unusual artist preferences)

---

## Verification Checklist

- [x] Client-side queue bounded to 100 events, max age 24 hours
- [x] Events batched (up to 10 per request)
- [x] Each event has a unique UUID (`eventId`)
- [x] Flush triggers documented (timer, visibility, online)
- [ ] Server-side deduplication implemented (`eventId`-based)
- [ ] Server-side timestamp validation (reject events older than threshold)
- [ ] Rate limiting per IP or user identity (server-side)
- [ ] Endpoint protected from abuse (monitored for anomalies)

---

## References

- `lib/playbackEvents.ts` — Client-side implementation
- `.env.example` — `NEXT_PUBLIC_PLAYBACK_EVENT_URL` configuration
- `docs/ENVIRONMENT_VARIABLES.md` — Env var reference (to be updated)

---

## Contact

For questions on server-side deduplication or rate limiting strategy, see the backend team.
