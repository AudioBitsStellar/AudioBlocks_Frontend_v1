# ADR 0001: Production hosting target

- **Status**: Accepted
- **Date**: 2026-11-19
- **Owner**: Repo maintainers (AudioBitsStellar). A named DevOps/infra lead
  should be assigned here before the M1 launch milestone closes — this ADR
  unblocks the decision, but a person still needs to hold the Fly.io account,
  secrets, and on-call pager.

## Context

The app needs a decided, documented production host before launch (`OPS-01`,
launch-readiness milestone M1). Two things already in the repo constrain the
choice:

- [`Dockerfile`](../../Dockerfile) builds a standalone Next.js server
  (`output: 'standalone'` in [`next.config.ts`](../../next.config.ts)) as a
  multi-stage image that runs as a non-root user on port 3000. This is a
  "bring your own container host" setup, not a Vercel-style zero-config
  deploy — the project has already opted out of the managed-platform-specific
  path.
- `OPS-02` (#841) requires a pipeline that deploys a **staging** environment
  automatically on merge to `main`, and a **production** environment on a
  release tag, gated by a manual approval.

### Options considered

| Option | Staging + prod envs | Uses existing `Dockerfile` as-is | Approval gates | Ops burden |
|---|---|---|---|---|
| **Fly.io** | Yes — separate apps per env | Yes | Native fit via GitHub Environments + `flyctl deploy` | Low (managed TLS, health checks, rollback) |
| Vercel | Yes (Preview/Production) | No — ignores `Dockerfile`, builds Next.js directly, no non-root/standalone control | Possible via Vercel's own approval flow, not GitHub Environments | Very low, but conflicts with the container-first setup already in the repo |
| Self-managed VPS + Docker Compose | Manual (two boxes/stacks) | Yes | Fully manual (SSH + human) | High — we own TLS renewal, patching, health checks, rollback scripting |
| AWS ECS/Fargate | Yes | Yes | Native via GitHub Environments | High — more moving parts (VPC, ALB, task defs, IAM) than this project's size justifies |

## Decision

Host the production and staging apps on **Fly.io**, deployed from the
existing `Dockerfile` with no changes to the image build.

- One Fly app per environment (e.g. `audioblocks-staging`,
  `audioblocks-production`), each with its own `NEXT_PUBLIC_*` build-time
  configuration (API URL, Sentry DSN, feature flags) baked into its own image
  build, since Next.js inlines `NEXT_PUBLIC_*` values at build time and the
  two environments point at different backends.
- Deploys run from GitHub Actions using `flyctl deploy --image <tag>` against
  an image already pushed to GHCR (see `.github/workflows/deploy.yml`,
  #841), authenticated with a per-environment `FLY_API_TOKEN` stored as a
  GitHub Environment secret.
- GitHub Environments (`staging`, `production`) gate the deploy jobs:
  `production` requires manual reviewer approval before the job runs: this is
  the "approvals" requirement from `OPS-02`, enforced by GitHub rather than
  bespoke scripting.

This was chosen over Vercel because the project already committed to a
portable, self-built container (non-root user, standalone server, no
platform-specific build step) and a Vercel deploy would bypass that image
entirely. It was chosen over a bare VPS or ECS because it gets managed TLS,
health checks and rollback without the operational surface area a two-person
launch team can't realistically carry into M1.

## Consequences

- Fly.io becomes a new paid dependency; billing ownership needs an assigned
  owner (see **Owner** above) before go-live.
- `NEXT_PUBLIC_*` secrets/config differ per environment and must be entered
  twice (once per Fly app / GitHub Environment) — see
  [`docs/ENVIRONMENT_VARIABLES.md`](../ENVIRONMENT_VARIABLES.md) for the full
  variable list and [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) for where each
  one is configured in CI.
- If Fly.io turns out to be the wrong fit post-launch, the portable
  `Dockerfile` means switching hosts later is a deploy-workflow change, not a
  rebuild of the app.

## Pre-launch checklist

- [ ] Create the `audioblocks-staging` and `audioblocks-production` Fly.io
      apps.
- [ ] Assign a named owner for the Fly.io account/billing (see **Owner**
      above).
- [ ] Add `FLY_API_TOKEN` as a secret on each GitHub Environment (`staging`,
      `production`).
- [ ] Configure the `production` GitHub Environment with at least one
      required reviewer (Settings → Environments → `production` →
      **Required reviewers**) — see
      [`docs/BRANCH_PROTECTION.md`](../BRANCH_PROTECTION.md) for how this
      repo documents protection settings.
- [ ] Populate per-environment `NEXT_PUBLIC_*` build vars (API URL, Sentry
      DSN, Segment key, feature flags) as GitHub Environment variables/secrets
      per [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md).
- [ ] Point DNS for the production hostname at the Fly.io app once the first
      production deploy succeeds.
- [ ] Record the staging and production URLs in the `staging`/`production`
      GitHub Environments (`environment.url`) so they show up on deployment
      status checks.
