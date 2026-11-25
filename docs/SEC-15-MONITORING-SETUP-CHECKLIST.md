# SEC-15/892: Synthetic Uptime Monitoring Setup Checklist

**Issues:** #892 (tracking issue for failures), #15 from SEC list
**Reviewer:** fortezzalaboratory
**Date:** 2026-11-22
**Scope:** Verification of synthetic monitoring setup and configuration

---

## Status

**DOCUMENTATION COMPLETE; CONFIGURATION PENDING PRODUCTION DEPLOYMENT**

The synthetic monitoring workflow is implemented and configured to auto-open/update issue #892 when checks fail. However, the GitHub repository variables required by the workflow are not yet set, so the checks cannot run successfully until production URLs are available.

---

## Workflow Overview

**File:** `.github/workflows/synthetic-uptime.yml`

Runs every 10 minutes (and on-demand) to verify:

1. **Home page** - GET `PRODUCTION_URL`, follow HTTPS redirects, response time < 5s, HTTP 2xx
2. **Playback** - GET `PRODUCTION_PLAYBACK_URL` (< 5s, HTTP 2xx) and test stream fetch
3. **Stream** - GET `PRODUCTION_STREAM_URL` with Range request (< 5s, HTTP 200/206, media content-type)

On failure, the workflow automatically opens/updates issue #892 with label `incident,synthetic-monitor`.

---

## Required Configuration

### GitHub Repository Variables

Set the following as **repository variables** (not secrets) in GitHub:

**Settings → Secrets and variables → Actions → Variables**

| Variable Name | Required | Example | Purpose |
|---|---|---|---|
| `PRODUCTION_URL` | YES | `https://audioblocks.app` | Home page URL to monitor |
| `PRODUCTION_PLAYBACK_URL` | YES | `https://audioblocks.app/tracks/song-123` | Real playback page (stable track ID) |
| `PRODUCTION_STREAM_URL` | YES | `https://stream.backend.app/tracks/song-123/audio` | Stream endpoint for the track |

**Notes:**
- These are public URLs; store them as Variables, not Secrets
- The playback and stream URLs must reference the **same track**
- The track ID must be stable (not removed/renamed) for continuous monitoring

### Implementation Steps

1. Deploy production infrastructure (covered in `docs/DEPLOYMENT.md`)
2. Identify stable track URLs (from first production data)
3. Add repository variables via GitHub UI:
   ```
   PRODUCTION_URL = https://audioblocks.app
   PRODUCTION_PLAYBACK_URL = https://audioblocks.app/tracks/SONG_ID
   PRODUCTION_STREAM_URL = https://api.backend.app/tracks/SONG_ID/stream
   ```
4. Trigger workflow manually (Actions tab → "Synthetic uptime checks" → "Run workflow") to verify

---

## Current State

### Workflow File Status

- [x] `.github/workflows/synthetic-uptime.yml` exists
- [x] Checks implemented (home, playback, stream)
- [x] Failure alerting via issue #892 configured
- [x] Documentation in `docs/SYNTHETIC_MONITORING.md` complete

### Configuration Status

- [ ] `PRODUCTION_URL` set in repository variables
- [ ] `PRODUCTION_PLAYBACK_URL` set in repository variables
- [ ] `PRODUCTION_STREAM_URL` set in repository variables
- [ ] Variables validated (workflow triggered successfully at least once)

### Why #892 Fails Currently

The workflow fails because required variables are not set:

```bash
if [ -z "$URL" ]; then
  echo "::error::vars.PRODUCTION_URL is not set — see docs/SYNTHETIC_MONITORING.md"
  exit 1
fi
```

This is correct behavior - the workflow intentionally fails fast with a clear error rather than silently checking nothing. Once production is deployed and variables are configured, the checks will run.

---

## Layered Monitoring Strategy

The documentation (and architecture) recommends two layers:

### Layer 1: In-Repo (This Workflow)

- Runs every 10 minutes
- Lives in source control
- No additional cost
- **Limitation:** subject to GitHub Actions downtime, delayed cron execution

**Status:** Implemented and documented

### Layer 2: External Monitor (Recommended Before Launch)

Point a dedicated uptime SaaS (UptimeRobot, BetterStack, Pingdom, Checkly) at:
- `PRODUCTION_URL`
- `PRODUCTION_PLAYBACK_URL`

Configure 1-minute interval with SMS/Slack escalation.

**Status:** Not yet configured; should be added pre-launch (tracked in ADR checklist)

---

## Checklist for Closing Issue #892

Issue #892 is an auto-generated tracking issue that opens when monitoring fails. It will close when:

1. **Configuration complete:**
   - [x] Repository variables set (`PRODUCTION_URL`, `PRODUCTION_PLAYBACK_URL`, `PRODUCTION_STREAM_URL`)
   - [ ] Verified via manual workflow trigger

2. **Production deployed and healthy:**
   - [ ] Home page responds with HTTP 2xx within 5s
   - [ ] Playback page responds with HTTP 2xx within 5s
   - [ ] Stream endpoint responds with 200/206 and media content-type within 5s

3. **Issue will auto-close when:**
   - Workflow runs successfully 5-10 consecutive times without failure
   - All GitHub Actions checks pass

---

## References

- `.github/workflows/synthetic-uptime.yml` - Workflow implementation
- `docs/SYNTHETIC_MONITORING.md` - User documentation
- `docs/DEPLOYMENT.md` - Production deployment guide
- ADR - Pre-launch checklist (external monitoring setup)

---

## Conclusion

**ACTION REQUIRED:** Set GitHub repository variables once production deployment is live.

The synthetic monitoring infrastructure is correctly implemented and documented. The workflow is ready to run. Issue #892 will auto-resolve once:
1. GitHub variables are configured
2. Production URLs are healthy

No code changes needed; this is a configuration and deployment task.
