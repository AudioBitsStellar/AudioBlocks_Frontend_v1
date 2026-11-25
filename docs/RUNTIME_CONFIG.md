# Runtime configuration for the Docker image

**Launch-readiness item `OPS-04`** (#843): one Docker image, built once, runs
unchanged in dev/staging/production. Config is supplied at container
startup, not baked in per-environment at build time.

## The problem this replaces

Next.js inlines every `NEXT_PUBLIC_*` variable into the client bundle at
build time. The previous Dockerfile worked around that by declaring over 30
`ARG`s and re-exporting each as `ENV` before `npm run build` — meaning a
*different image* had to be built for every environment (dev, staging,
production), each with its own set of `--build-arg` values. That breaks the
standard "build once, promote the same artifact" deployment model: you can
never be sure the image running in production is the same bits that passed
CI against staging.

## How it works now

1. **Build time**: the `builder` stage in `Dockerfile` sets every
   runtime-configurable `NEXT_PUBLIC_*` variable to a unique placeholder
   token, `@@RUNTIME:<VAR_NAME>@@`, instead of a real value. Next.js inlines
   these tokens into the built JS/HTML output exactly as it would a real
   value — no build args are read or needed.
2. **Container startup**: `scripts/docker-entrypoint.js` runs as the image's
   `ENTRYPOINT`. It walks `.next/` and `public/`, and for every file,
   replaces each placeholder token with the real value of the matching
   environment variable supplied to the container (`docker run -e VAR=...`,
   a Compose `environment:` block, or an orchestrator's env/secret
   injection). It then starts `server.js` in the same process.
3. Any variable left unset at runtime resolves to an empty string (matching
   the previous default for unset build args), except `NEXT_PUBLIC_API_URL`,
   which keeps its old default of `http://localhost:4000/api`.

The result: `docker build` needs no `--build-arg` flags at all, and the same
image tag can be deployed to staging and then promoted to production by
changing only the environment variables passed to `docker run`.

## Adding a new runtime-configurable variable

Two places must agree, or substitution silently misses the variable:

1. Add an `ENV NEXT_PUBLIC_YOUR_VAR="@@RUNTIME:NEXT_PUBLIC_YOUR_VAR@@"` line
   to the `builder` stage in `Dockerfile`.
2. Add `'NEXT_PUBLIC_YOUR_VAR'` to `RUNTIME_ENV_VARS` in
   `scripts/docker-entrypoint.js`.

`scripts/docker-entrypoint.test.ts` fails the build if these two lists ever
diverge.

## One known build-time-only side effect

Substitution happens before the server ever runs, so any code that reads a
`NEXT_PUBLIC_*` var *as a value* (e.g. `sentry.client.config.ts`'s
`if (SENTRY_DSN) { Sentry.init(...) }`) behaves correctly at runtime either
way — it sees whatever `docker-entrypoint.js` substituted in.

The one exception is a check that runs during the build itself, not inside
the bundled output: `next.config.ts` does
`if (process.env.NEXT_PUBLIC_SENTRY_DSN) { config = withSentryConfig(...) }`
to decide, at build time, whether to apply Sentry's webpack plugin. Since
that variable is now always the non-empty placeholder token during the
Docker build, this evaluates truthy unconditionally inside the image build —
Sentry's build-time instrumentation always runs, even for an image that will
end up with no DSN configured at runtime. This only affects build time (a
marginally larger bundle, a skipped source-map upload since no
`SENTRY_AUTH_TOKEN` is set in CI); it does not cause Sentry to actually
report anything for a container that has no DSN at runtime.

## Local/non-Docker usage is unaffected

`npm run dev` and `npm run build && npm run start` read `.env.local` /
real environment variables exactly as before — this mechanism only applies
inside the Docker image, where Next.js has already inlined build-time
values that need replacing after the fact.
