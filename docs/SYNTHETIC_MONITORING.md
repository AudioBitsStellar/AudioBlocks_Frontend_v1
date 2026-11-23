# Synthetic monitoring

`OBS-06` (#838) asks for synthetic uptime checks on home and playback. There
are two layers:

## 1. In-repo check (`.github/workflows/synthetic-uptime.yml`)

Runs every 10 minutes and on-demand (`workflow_dispatch`):

- **Home**: `GET` the production URL, follow HTTPS redirects, fail unless the final status is 2xx or the
  response takes over 5s.
- **Playback**: `GET` a real playback page and a `Range` request against a
  required real stream URL. Require final 2xx for the page, 200/206 and a
  nonempty media content type for the stream, each within five seconds.

On failure it opens a single `incident` + `synthetic-monitor` labeled issue
(or comments on the existing one if it's already open), so a broken deploy
surfaces without someone watching the Actions tab.

### Required configuration

Set these as repository or environment **variables** (Settings → Secrets and
variables → Actions → Variables) — not secrets, they aren't sensitive:

| Variable | Example | Required |
|---|---|---|
| `PRODUCTION_URL` | `https://audioblocks.app` | Yes |
| `PRODUCTION_PLAYBACK_URL` | `https://audioblocks.app/track/<id>` — a real, stable track page | Yes |
| `PRODUCTION_STREAM_URL` | the backend's direct stream URL for that track | Yes |

Until these are set, the workflow fails fast with a clear error instead of
silently checking nothing. Point them at the production Fly.io app from
[`docs/DEPLOYMENT.md`](DEPLOYMENT.md) once it's live.

### Limitations

GitHub Actions `schedule` triggers are a best-effort cron — GitHub can delay
or skip a run under load, and a check only runs if the default branch's
workflow file is present and Actions isn't disabled. There's also no
phone/SMS escalation. Treat this as the free, in-repo first layer, not a
replacement for a real on-call page.

## 2. External monitor (recommended before launch)

Point a dedicated uptime SaaS (e.g. UptimeRobot, BetterStack, Pingdom, or
Checkly) at the same two URLs with a 1-minute interval and SMS/phone/Slack
alerting. This is what makes the check genuinely "external": it runs
independently of this repo's GitHub Actions and CI/CD standing, so an outage
that takes down Actions (or a disabled workflow) still pages someone.

Setup is an account-level task outside this codebase — tracked in the
[ADR's pre-launch checklist](adr/0001-production-hosting-target.md) rather
than duplicated here. At minimum, configure:

- A check against `PRODUCTION_URL` (home).
- A check against `PRODUCTION_PLAYBACK_URL` (playback), ideally with the
  monitor configured to look for a specific string unique to a loaded
  player (e.g. an element id) rather than just a 200 status, since a 200
  with an error boundary rendered would otherwise pass.
