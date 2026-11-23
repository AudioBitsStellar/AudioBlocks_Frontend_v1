# Server-secret boundary

Server-only credentials such as `SENTRY_AUTH_TOKEN`, NVIDIA/AI provider keys, and Privy secrets must never use a `NEXT_PUBLIC_` name, be declared as Docker `ARG`/`ENV`, or appear in `.next/static`.

CI builds the production application and runs:

```sh
node scripts/scan-client-secrets.cjs
```

The scan rejects known server-secret identifiers and secret-shaped tokens in client chunks, and rejects server-secret Docker build arguments/environment declarations.

## Docker history verification

For a release candidate, build without passing server secrets as build arguments, then inspect the complete image history:

```sh
docker build -t audioblocks-frontend:secret-audit .
docker history --no-trunc audioblocks-frontend:secret-audit > /tmp/audioblocks-history.txt
grep -E 'SENTRY_AUTH_TOKEN|NVIDIA_.*KEY|OPENAI_API_KEY|AI_API_KEY|PRIVY_APP_SECRET|nvapi-|sk-' /tmp/audioblocks-history.txt
```

The final `grep` must produce no output. Runtime server secrets belong in the deployment platform's secret store and must not be passed to `docker build`.
