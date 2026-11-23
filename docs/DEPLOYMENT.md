# Deployment

This documents the production deploy pipeline added in `.github/workflows/deploy.yml`
(#841) and the one-time repo configuration it depends on. For *why* Fly.io
and a container image rather than a managed platform, see
[`docs/adr/0001-production-hosting-target.md`](adr/0001-production-hosting-target.md).

## Pipeline

| Trigger | Environment | Image tag | Approval |
|---|---|---|---|
| Push to `main` (every merge) | `staging` | `ghcr.io/<repo>:staging-<sha>` | None — deploys automatically |
| Push of a `vX.Y.Z` tag (created by `semantic-release` in `release.yml`) | `production` | `ghcr.io/<repo>:<tag>` and `:production-latest` | Required reviewer(s) on the `production` GitHub Environment |

Both jobs build the existing [`Dockerfile`](../Dockerfile) with
environment-specific `NEXT_PUBLIC_*` build args (Next.js inlines these at
build time, so staging and production need their own image, not a shared
one), push it to GHCR, then run `flyctl deploy --image ...` against the
matching Fly.io app.

`release.yml` is unchanged: it still only runs `semantic-release` to compute
the version, update the changelog and create the `vX.Y.Z` tag. `deploy.yml`
is what actually ships that tag to production.

## One-time setup

These can't be done from a workflow file — they're repo/environment settings:

1. **Create the Fly.io apps** named below (or update the variable names to
   match whatever you create).
2. **GitHub Environments** (Settings → Environments): create `staging` and
   `production`.
   - On `production`, add at least one **required reviewer** — this is the
     approval gate `OPS-02` asks for. Without this, the job runs
     unattended, same as staging.
3. **Secrets**, set per-environment (Settings → Environments → *env* →
   Environment secrets):

   | Secret | staging | production |
   |---|---|---|
   | `FLY_API_TOKEN` | Fly.io deploy token scoped to the staging app | Fly.io deploy token scoped to the production app |
   | `STAGING_SENTRY_DSN` / `PRODUCTION_SENTRY_DSN` | ✓ | ✓ |
   | `STAGING_SEGMENT_WRITE_KEY` / `PRODUCTION_SEGMENT_WRITE_KEY` | ✓ | ✓ |

4. **Variables**, set per-environment (Environment variables, not secrets —
   these aren't sensitive):

   | Variable | Example |
   |---|---|
   | `FLY_STAGING_APP` / `FLY_PRODUCTION_APP` | `audioblocks-staging` / `audioblocks-production` |
   | `STAGING_URL` / `PRODUCTION_URL` | `https://staging.audioblocks.app` / `https://audioblocks.app` |
   | `STAGING_NEXT_PUBLIC_API_URL` / `PRODUCTION_NEXT_PUBLIC_API_URL` | the [AudioBlock Backend](https://github.com/AudioBitsStellar/AudioBlock_Backend) URL for that environment |

   See [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) for what
   each `NEXT_PUBLIC_*` variable does; add more `build-args` to the relevant
   job in `deploy.yml` the same way if a given deployment needs them (e.g.
   wallet/contract addresses for a non-default chain).

## Rollback

Fly.io keeps prior releases per app. To roll back production without waiting
on a new tag:

```bash
flyctl releases --app <production app>
flyctl deploy --app <production app> --image ghcr.io/<repo>:<previous tag>
```

## Observability

Synthetic uptime checks against the deployed staging/production URLs are
configured separately — see
[`.github/workflows/synthetic-uptime.yml`](../.github/workflows/synthetic-uptime.yml)
(#838).
