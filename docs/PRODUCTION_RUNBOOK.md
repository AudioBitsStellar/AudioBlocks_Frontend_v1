# Production Runbook

Launch-readiness item `DOC-01`. Operational reference for deploying,
rolling back, configuring, and responding to incidents in the AudioBlocks
Frontend production environment.

This runbook describes what the repository supports today (Docker image +
Next.js standalone build, GitHub Actions CI). It does not assume a specific
hosting platform — fill in the `<...>` placeholders with your actual
deployment target (e.g. your container host, orchestrator, or PaaS) before
relying on this for a real incident.

> **Review status:** drafted from the CI workflows, `Dockerfile`, and
> `instrumentation.ts` already in this repo. Per `COMP` acceptance criteria,
> this needs sign-off from someone other than its author before it is treated
> as authoritative — route it through normal PR review.

## 1. Architecture at a glance

- **App:** Next.js 15 (App Router), Node 20 (`.nvmrc`), built as a
  standalone server via `next build` and run with `node server.js`
  (`Dockerfile`, final `runner` stage).
- **CI:** `.github/workflows/test.yml` (lint, coverage), `security.yml`
  (`npm audit`, CodeQL), `release.yml` (semantic-release on `main`).
- **Error monitoring:** Sentry, initialized in `instrumentation.ts` for both
  the Node and Edge runtimes when `NEXT_PUBLIC_SENTRY_DSN` is set. PII is
  scrubbed before send (`scrubSensitiveData`) — auth/cookie/token headers and
  values that look like wallet addresses or hex strings are redacted.
- **External dependencies:** see
  [`THIRD_PARTY_PROCESSORS.md`](./THIRD_PARTY_PROCESSORS.md) for the full
  list (Dynamic, Privy, Segment, Sentry, NVIDIA, IPFS gateway). An outage in
  any of these degrades a specific flow rather than the whole app — see
  §5.

## 2. Deploying

1. Merges to `main` only pass once `test / lint`, `test / coverage`, and the
   `security` checks are green (required status checks, see
   [`BRANCH_PROTECTION.md`](./BRANCH_PROTECTION.md)).
2. `release.yml` runs `npm ci && npm run build` then `semantic-release` on
   every push to `main` — this tags a release and generates release notes
   from Conventional Commits. It does not itself deploy anywhere; it is the
   versioning step.
3. Build and publish the image:
   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_API_BASE_URL=<...> \
     --build-arg NEXT_PUBLIC_SITE_URL=<...> \
     # ... remaining NEXT_PUBLIC_* build args, see .env.example ...
     -t <registry>/audioblocks-frontend:<tag> .
   docker push <registry>/audioblocks-frontend:<tag>
   ```
   `NEXT_PUBLIC_*` values are baked into the client bundle at build time
   (they are `ARG`s in the `builder` stage), so a config change requires a
   rebuild, not just a redeploy of the same image with new env vars.
4. Deploy the new tag to `<production environment>` and watch:
   - The container starts and listens on `PORT=3000` (`HOSTNAME=0.0.0.0`).
   - Sentry shows no new issue spike in the first 15 minutes
     (`NEXT_PUBLIC_SENTRY_DSN` project: `<...>`).
   - `npm audit`/CodeQL findings for this release are triaged, not just green
     in CI — a passing required check only means no *high/critical* advisory
     existed at merge time.

## 3. Rolling back

Next.js standalone output has no separate "migration" step to reverse, so
rollback is a redeploy of the previous image:

1. Identify the last known-good tag (the previous successfully-deployed
   `<registry>/audioblocks-frontend:<tag>`, or the previous semantic-release
   version).
2. Redeploy that tag to `<production environment>` the same way you deployed
   forward (§2.4) — there is no forward-only state to undo in the frontend
   itself.
3. If the regression was caused by a bad `NEXT_PUBLIC_*` build arg rather
   than application code, the previous image already has the previous
   (working) values baked in, so redeploying it also reverts the config.
4. Confirm in Sentry that the error rate returns to baseline before closing
   the incident.
5. Open a follow-up issue referencing the incident for the actual code fix —
   a rollback buys time, it is not the fix.

## 4. Environment variables

The full reference — required vs. optional, feature flags, and defaults —
lives in [`ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) and
[`.env.example`](../.env.example). Operational notes specific to production:

- Missing required blockchain/API variables cause `EnvCheck` validation
  errors at runtime rather than a silent misconfiguration — check logs for
  these first when a fresh deploy fails to serve traffic.
- `NEXT_PUBLIC_*` variables are **public** (shipped in the client bundle).
  Never put a secret behind a `NEXT_PUBLIC_*` name — see `R1` in
  [`THIRD_PARTY_AI_SECURITY_REVIEW.md`](./THIRD_PARTY_AI_SECURITY_REVIEW.md)
  for why this matters for the NVIDIA key specifically, and the same rule
  applies to every other credential.
- Use a separate `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` / Privy app id per
  environment (local, staging, production) so test logins never mix with
  real users.
- Feature flags (`NEXT_PUBLIC_FEATURE_*`) default to **off** in production —
  confirm the intended set is explicitly set for this deploy rather than
  relying on the default if a section is supposed to be live.

## 5. Incident response

### Severity triage

| Symptom | Likely cause | First step |
|---|---|---|
| App fails to start / crash loop | Bad build, missing required env var | Check container logs for `EnvCheck` validation errors; roll back (§3) if a bad deploy. |
| Error rate spike in Sentry | Regression in a recent deploy | Check the Sentry issue's release tag; roll back (§3) if it lines up with a recent deploy. |
| Wallet login broken (Dynamic/Privy) | Processor outage or misconfigured app id | Check the provider's status page; this degrades login only, not the whole app. |
| Purchases failing | Stellar network congestion, Soroban relay issue | Check `useSorobanRelay` error surfaced to the user; confirm it is network-side, not a regression, before rolling back. |
| New uploads stuck in review | NVIDIA quality-filter outage or rate limit | See `lib/analysisQueueMonitor.ts` alerting and §6 (R5 in the AI security review) — jobs should surface as stuck, not silently lost. |
| Analytics/monitoring itself down (Segment/Sentry) | Processor outage | Does not block user-facing functionality; file a follow-up, do not treat as a P1 on its own. |

### Steps

1. **Acknowledge** the alert (Sentry, uptime monitor, or user report) and
   assign an owner.
2. **Scope it**: is this one degraded flow (e.g. wallet login) or the whole
   app down? Use the table above to route to the right next step.
3. **Mitigate**: roll back (§3) if a recent deploy is implicated; otherwise
   mitigate at the dependency (e.g. pause a feature flag) rather than
   shipping a fix under pressure.
4. **Communicate**: status update to maintainers/stakeholders once scoped,
   and again once mitigated.
5. **Write it up**: for AI-pipeline-specific incidents (song quality filter,
   NVIDIA integration, analysis queue), use
   [`AI_PIPELINE_POSTMORTEM_TEMPLATE.md`](./AI_PIPELINE_POSTMORTEM_TEMPLATE.md).
   For everything else, a short postmortem covering detection time, blast
   radius, and the actual fix (not just the rollback) is still expected.

## 6. Keeping this current

Update this runbook in the same PR when you:

- Change the deploy mechanism (hosting target, build pipeline, required
  build args).
- Add or remove a required environment variable.
- Add a new external dependency whose outage should be in the triage table.
