# Sentry setup (#834 — OBS-01)

Error monitoring is optional and off by default: every Sentry call in this
app is gated behind `NEXT_PUBLIC_SENTRY_DSN` being set (see `.env.example`).

## Where it's wired up

| Runtime | File |
| --- | --- |
| Browser | `sentry.client.config.ts` |
| Node (server components, route handlers, middleware) | `instrumentation.ts` |
| Edge | `instrumentation.ts` |
| Source map upload / build-time config | `next.config.ts` (`withSentryConfig`) |
| PII scrubbing (shared `beforeSend`) | `lib/sentryScrub.ts` |

All three runtimes call the same `beforeSend` hook. It currently redacts:
- `Authorization`, `Cookie` and any header containing `token`.
- Any `extra` value that looks like a wallet address/signature (`0x...`
  EVM addresses, `G...` Stellar public keys, or a key containing
  `signature`/`wallet`).

Review `lib/sentryScrub.ts` (and its test in `tests/lib/sentryScrub.test.ts`)
before adding new `extra`/`tags` data to a capture call elsewhere in the
app — anything added there bypasses this scrub unless it goes through
`event.request`/`event.extra`.

## Environments and releases

- `NEXT_PUBLIC_SENTRY_ENVIRONMENT` — set this per deploy target (e.g.
  `staging`, `production`). Falls back to `NODE_ENV` when unset, which is
  fine for local development but too coarse for a real staging/production
  split.
- `NEXT_PUBLIC_SENTRY_RELEASE` — set this to the deployed commit SHA or
  version tag in CI/CD. It's passed to `Sentry.init` in every runtime *and*
  to `withSentryConfig`'s `release.name`, so uploaded source maps are
  associated with the exact release that threw the error — without this,
  stack traces in Sentry stay minified.

## Source maps

Set `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` to enable the
source map upload step in `next.config.ts`. Without `SENTRY_AUTH_TOKEN`,
`withSentryConfig` is skipped entirely (see the `if
(process.env.NEXT_PUBLIC_SENTRY_DSN)` guard) and errors will show minified
stack traces in the Sentry UI.

## Verifying end-to-end

Visit `/sentry-example-page` on a deploy with `NEXT_PUBLIC_SENTRY_DSN` set
and trigger either button. Confirm in the Sentry dashboard that the event:
- Shows up under the right **environment**.
- Is tagged with the expected **release**.
- Has a de-minified stack trace (source maps applied).

(`/sentry-example-page` and its API route, `/api/sentry-example-api`, exist
solely for this check — they're not linked from the app's navigation.)

## Alert rules

Alert rules are project-level configuration in Sentry's dashboard (Project
Settings → Alerts), not something this frontend repo can express in code.
Recommended rules for this project:

1. **New issue** — notify immediately when an issue is seen for the first
   time in `production`.
2. **Regression** — notify when a previously resolved issue reoccurs.
3. **Error spike** — notify when the event count for an issue (or for the
   project) exceeds a threshold within a short window (e.g. >50 events / 5
   minutes), to catch a bad deploy quickly.

Scope all three to the `production` environment (see above) so staging/dev
noise doesn't page anyone.
