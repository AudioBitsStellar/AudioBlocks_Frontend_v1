# Staging parity checklist

**Launch-readiness item `OPS-03`** (#842): staging is provisioned against the
backend's **testnet** environment, and stays config-equivalent to production
except for the values that must legitimately differ (backend URL, network,
analytics volume). Run this checklist before every promotion from staging to
production, and after any change to `Dockerfile`, `.env.example`, or
`docs/ENVIRONMENT_VARIABLES.md`.

## How staging is built and deployed

1. `.github/workflows/docker-publish.yml` builds the image on every push to
   `main` and pushes it to `ghcr.io/<repo>` tagged `staging` (mutable) and
   `sha-<commit>` (immutable).
2. Deploy the `staging` tag to the staging host/service, supplying the
   runtime environment variables from `.env.staging.example` (see
   docs/RUNTIME_CONFIG.md for how those variables reach the running
   container — no rebuild is involved).
3. Run this checklist against the result.
4. Only once it passes, promote the exact same image digest to production
   with `.github/workflows/promote.yml` (`source_tag: sha-<commit>`,
   `target_tag: production`) — never rebuild for production.

## Checklist

- [ ] **Same image digest.** The container running on staging reports the
      same digest that `docker-publish.yml` pushed for the current `main`
      commit (`docker buildx imagetools inspect ghcr.io/<repo>:staging`).
      Confirms staging is testing the actual promotion candidate, not a
      locally-built approximation of it.
- [ ] **Health check passes.** `GET /api/health` on the staging URL returns
      `200 {"status":"ok"}` (same endpoint the Dockerfile `HEALTHCHECK`
      uses, #845).
- [ ] **Backend reachable is the testnet backend, not production's.**
      `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_BASE_URL` resolve to the
      staging/testnet backend host, confirmed by inspecting a network
      request from the deployed app (not just the env var value — a stale
      cached build could still be serving an old inlined value).
- [ ] **Stellar network is testnet.** `NEXT_PUBLIC_STELLAR_NETWORK=testnet`;
      a wallet connection on staging shows the testnet badge
      (`WrongNetworkBanner`, see `docs/STELLAR_TRANSACTION_FLOW.md`).
- [ ] **Wallet/auth environment is isolated.** `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`
      on staging is a *different* Dynamic Labs environment ID than
      production's, so staging logins can never appear as real users (see
      "Dynamic Labs" in `docs/ENVIRONMENT_VARIABLES.md`).
- [ ] **Demo/mock data is off.** `NEXT_PUBLIC_API_MOCKING=disabled` and
      `NEXT_PUBLIC_USE_DEMO_DATA` unset — staging must exercise the real
      testnet backend, not fixtures.
- [ ] **Error monitoring points at a staging Sentry environment**, not
      production's, so staging noise doesn't page anyone or pollute
      production error budgets.
- [ ] **Feature flags match the production rollout plan.** Diff
      `.env.staging.example` against the deployed production env for every
      `NEXT_PUBLIC_FEATURE_*` flag; any difference should be intentional
      (testing a flag ahead of its production flip) and recorded in the PR
      or issue enabling it.
- [ ] **No build-arg drift.** `docker inspect` the running container; confirm
      no `@@RUNTIME:...@@` placeholder strings leaked into the rendered page
      (would indicate `scripts/docker-entrypoint.js` didn't run, or a new
      `NEXT_PUBLIC_*` var was added to the Dockerfile without a matching
      runtime env value — see docs/RUNTIME_CONFIG.md).

## Current status

Verified directly against the `ops/launch-readiness-842-845` branch
(2026-11-20): `scripts/docker-entrypoint.js`'s substitution runs correctly
against a representative `.next`-shaped build output — every
`@@RUNTIME:...@@` placeholder resolves to the right value (an explicit
override, the one documented default, or empty when unset and no default
applies), non-substitutable files (images, fonts) are left untouched, and
it correctly hands off to `server.js` afterward. The Dockerfile's
`HEALTHCHECK` command was verified against a real HTTP server returning
both 200 and non-200 responses. See `docs/ROLLBACK_DRILL_LOG.md` for the
same verification extended through a full promote/rollback cycle.

What's **not** yet verified is a real `docker build` of this application
producing a running container: `npm run build` currently fails on `main`
and on this branch for reasons unrelated to #842-#845 —
`app/dashboard/transactions/page.tsx` imports a `TransactionTable`
component that was never implemented, and `wagmi`, `@privy-io/react-auth`,
and `@radix-ui/react-dropdown-menu` are imported by live code (the navbar,
`/login`, several wallet hooks) but missing from `package.json`. These
look like further casualties of the same "stellar-wallet-integration"
merge that corrupted `package-lock.json` (fixed in this PR) — see that
commit's history for `package.json` — but fixing them is a larger,
separate change than Docker/CI infrastructure and is left for follow-up.
Once the app builds again, re-run this checklist against a real deployed
container before the first real promotion.

The `docker-publish.yml` / `promote.yml` pipeline itself has not yet made a
real deployment, since this repo has no staging host configured yet —
provisioning one (e.g. Fly.io, Render, or a VM behind the existing reverse
proxy) is tracked as follow-up infrastructure work, not a frontend-repo
change.
