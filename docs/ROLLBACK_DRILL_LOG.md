# Rollback drill log

**Launch-readiness item `OPS-05`** (#844) requires the rollback procedure in
`docs/ROLLBACK.md` to be tested, not just written. This log records an
executed drill.

## Setup

The real `promote.yml`/`scripts/rollback.sh` mechanism — re-pointing an
image tag at a previous digest via `docker buildx imagetools create`, no
rebuild — was exercised against a local registry (`registry:2` on
`localhost:5000`) standing in for GHCR, with two minimal representative
images standing in for two app builds:

- `sha-good1234`: a server returning `200 {"status":"ok","version":"v1-good"}`
  from `/api/health`, with the same `HEALTHCHECK` shape as the real
  Dockerfile.
- `sha-bad5678`: identical except `/api/health` returns `500`, representing
  a bad deploy that fails health checks after rollout.

This stands in for the real application image because building the actual
app currently fails for reasons unrelated to #842-#845 — see the note at
the end of this log. The rollback *mechanism* being tested (tag repointing
via `imagetools create`, redeploy, health verification) does not depend on
what's inside the image, so this is a faithful test of the procedure itself.

## Drill

| Step | Action | Result |
|---|---|---|
| 1 | `docker buildx imagetools create --tag production sha-good1234` | `production` tag now points at the good image's digest. No image data downloaded or rebuilt — pure manifest copy. |
| 2 | Pull + run `production`, check `/api/health` | `Health: healthy`, `{"status":"ok","version":"v1-good"}` — baseline confirmed good. |
| 3 | **Simulated incident**: `imagetools create --tag production sha-bad5678` | A bad build gets promoted to production, as would happen if a broken image passed CI but failed only in practice. |
| 4 | Pull + redeploy `production` | `Health: unhealthy` (confirmed after the container's health-check retry window), `{"status":"error","version":"v2-bad"}` — incident reproduced. |
| 5 | **Rollback**: `imagetools create --tag production sha-good1234` (the exact operation `scripts/rollback.sh <good-sha>` performs) | `production` tag re-pointed back at the known-good digest. No rebuild — same manifest copy as step 1. |
| 6 | Remove local cached `production` tag, pull, redeploy | Forces a real fetch of the updated tag rather than reusing Docker's local image cache under the old tag name — the same step a real host/orchestrator does on redeploy. |
| 7 | Verify | `Health: healthy`, `{"status":"ok","version":"v1-good"}` — production recovered. |

Total elapsed time from detecting the bad deploy (step 4) to confirmed
recovery (step 7): under a minute, almost all of it `docker pull` and the
health check's own `--start-period`/`--retries` window — not image build
time, since none occurred.

## What this confirms

- The promote/rollback operation is a true no-rebuild manifest repoint, for
  both the forward promotion and the rollback.
- A rollback is the *same command* as a promotion, just with the source and
  target tags in the direction that restores known-good — there's only one
  procedure to remember, not two.
- The Dockerfile's `HEALTHCHECK` (#845) is what makes "did the rollback
  work" a yes/no answer instead of a judgment call.
- Redeploying a tag requires actually re-pulling it — a host/orchestrator
  that just restarts a container without pulling first will keep serving
  the stale image, which is a real failure mode to avoid in the real
  deploy target's redeploy step, whatever that ends up being.

## Known limitation of this drill

This exercised the tagging/rollback mechanism with representative images,
not a real build of this application. `app/dashboard/transactions/page.tsx`
imports a `TransactionTable` component that was never implemented, and
`wagmi`, `@privy-io/react-auth`, and `@radix-ui/react-dropdown-menu` are
imported by live, reachable code (the navbar, `/login`, wallet hooks) but
missing from `package.json` — both appear to date from the same incomplete
"stellar-wallet-integration" merge that corrupted `package-lock.json`
(fixed in this PR). Those are pre-existing application bugs unrelated to
#842-#845, left for separate follow-up, and they currently prevent
`next build`/`docker build` from completing for the real app image on this
branch or on `main`.
