# Listener launch checks (#821, #825, #814, #882)

## Cross-browser E2E

The main Playwright config runs Chromium, Firefox, desktop WebKit, Pixel 7
Chromium and iPhone 13 WebKit. CI runs each project independently and retains
failure reports/traces under project-specific artifact names. Mobile projects
use device emulation, not physical phones. The queued HLS tests run separately
against the Vite harness through `test:playback`; they are excluded from the
Next.js E2E suite. Screenshot paths include the project to avoid collisions.
Existing disabled visual-baseline tests remain disabled until baselines exist.

## Staging load baseline

Dispatch `Staging listener load baseline` after setting the staging environment
variables `STAGING_URL`, `STAGING_PLAYBACK_URL` (a stable listener track page),
and `STAGING_STREAM_URL` (that track's public, read-only media endpoint).
All URLs must point to staging, including CDN URLs; do not use production.
The workflow uses the staging environment's approval rules, if configured.
It is manual-only and serialized to avoid overlapping runs.

The bounded baseline ramps to five concurrent listeners over 30 seconds, holds
for two minutes, and ramps down over 30 seconds. Each listener fetches home,
the playback page, then the first 1024 stream bytes with pacing between steps.
If the media server ignores Range it may send the entire asset; use a small
dedicated staging track. This exercises HTTP delivery, not browser decoding,
wallet signing, save mutations, or sustained playback bandwidth.

Initial release gates: HTTP errors and failed journeys below 1%, checks above
99%, home/playback p95 below 1500ms, and stream p95 below 2000ms. These are
proposed budgets, not observed measurements. k6 exits unsuccessfully when a
threshold fails. The workflow retains `load-summary.json` for 30 days.

No baseline has been measured as part of this change. Before closing #825,
record the staging revision, workflow run URL, date, request count, error rate,
per-step p95 and threshold outcome here. Investigate failed thresholds before
changing budgets, then repeat the same profile to make comparisons meaningful.

## Playback-event delivery contract

Audible `playing` events still deduplicate per loaded audio element in
`useQueuedAudio`. Reporting now persists a bounded outbox (100 events, 24-hour
expiry), retries in groups of up to ten every five seconds and on reconnect,
and uses sendBeacon on pagehide/hidden with a keepalive fetch fallback.
The existing per-song endpoint receives `songId`, `eventId`, `createdAt` and
`url`. A group uses separate requests; no batch endpoint is assumed.

The receiver MUST deduplicate by `eventId` for at least 24 hours and return
2xx only after accepting an event. A beacon acknowledgement only means the
browser queued it, so entries remain until an HTTP acknowledgement; retries
and multiple tabs may deliver the same event. Without backend idempotency,
exactly-once play counting is not guaranteed. Cross-origin receivers must
allow credentialed JSON requests and preflight; beacon cannot attach bearer
headers. Keep the existing endpoint/cookie contract.

Blocked storage degrades to an in-memory queue. Abrupt process termination
cannot guarantee beacon delivery. Local storage is shared across tabs, so
concurrent tab writes can lose entries; a transactional outbox/server receipts
are needed for stronger guarantees. Persisted entries resume when the listener
mounts in event-counting mode. These play-count events remain separate
from consent-controlled third-party analytics.

## Synthetic incident #882

The linked failing run could not be retrieved during this edit, so its root
cause and the live outage status are unverified. The monitor now follows HTTPS
redirects, requires a final 2xx, and requires a nonempty media response within
five seconds. Set all production variables in `SYNTHETIC_MONITORING.md`, use a
stable public track, and inspect the failing job's HTTP/transport error.
An unset stream variable now fails rather than silently skipping playback.
Dispatch the monitor after correcting configuration or deployment; close #882
only after a healthy run and actual playback verification. These HTTP probes
do not establish that media decoding or the hydrated player works.

The requested existing-issue search could not be completed because GitHub was
unavailable. Check for overlapping issues before opening a PR. No builds,
tests, load traffic or monitoring dispatches were run for this file-only change.
