FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# #791 (SEC-10): dependency install runs with `--ignore-scripts` so a
# compromised transitive package cannot execute arbitrary code during
# `npm ci`. `package.json` has no postinstall/prepare scripts of its
# own, so no allowlist is needed - verified in the PR; add one here if
# a direct dep ever gains an install script.
RUN npm ci --legacy-peer-deps --ignore-scripts

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# These NEXT_PUBLIC_* vars are no longer build args (#843). Each is baked in
# as a placeholder token that scripts/docker-entrypoint.js replaces with the
# real runtime env value at container startup, so the same built image can
# be promoted from staging to production unchanged. See docs/RUNTIME_CONFIG.md.
# Keep this list in sync with RUNTIME_ENV_VARS in that script — checked by
# scripts/docker-entrypoint.test.ts.
ENV NEXT_PUBLIC_API_URL="@@RUNTIME:NEXT_PUBLIC_API_URL@@" \
    NEXT_PUBLIC_API_BASE_URL="@@RUNTIME:NEXT_PUBLIC_API_BASE_URL@@" \
    NEXT_PUBLIC_SITE_URL="@@RUNTIME:NEXT_PUBLIC_SITE_URL@@" \
    NEXT_PUBLIC_MEDIA_HOST="@@RUNTIME:NEXT_PUBLIC_MEDIA_HOST@@" \
    NEXT_PUBLIC_IPFS_GATEWAY="@@RUNTIME:NEXT_PUBLIC_IPFS_GATEWAY@@" \
    NEXT_PUBLIC_CHAIN_ID="@@RUNTIME:NEXT_PUBLIC_CHAIN_ID@@" \
    NEXT_PUBLIC_RPC_URL="@@RUNTIME:NEXT_PUBLIC_RPC_URL@@" \
    NEXT_PUBLIC_CONTRACT_ADDRESS="@@RUNTIME:NEXT_PUBLIC_CONTRACT_ADDRESS@@" \
    NEXT_PUBLIC_USDC_ADDRESS="@@RUNTIME:NEXT_PUBLIC_USDC_ADDRESS@@" \
    NEXT_PUBLIC_PRIVY_APP_ID="@@RUNTIME:NEXT_PUBLIC_PRIVY_APP_ID@@" \
    NEXT_PUBLIC_ANALYTICS_ENABLED="@@RUNTIME:NEXT_PUBLIC_ANALYTICS_ENABLED@@" \
    NEXT_PUBLIC_API_MOCKING="@@RUNTIME:NEXT_PUBLIC_API_MOCKING@@" \
    NEXT_PUBLIC_API_TIMEOUT="@@RUNTIME:NEXT_PUBLIC_API_TIMEOUT@@" \
    NEXT_PUBLIC_ARTIST_DASHBOARD_URL="@@RUNTIME:NEXT_PUBLIC_ARTIST_DASHBOARD_URL@@" \
    NEXT_PUBLIC_CACHE_TTL="@@RUNTIME:NEXT_PUBLIC_CACHE_TTL@@" \
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID="@@RUNTIME:NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID@@" \
    NEXT_PUBLIC_ENABLE_DEVTOOLS="@@RUNTIME:NEXT_PUBLIC_ENABLE_DEVTOOLS@@" \
    NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING="@@RUNTIME:NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING@@" \
    NEXT_PUBLIC_FEATURE_EVENTS="@@RUNTIME:NEXT_PUBLIC_FEATURE_EVENTS@@" \
    NEXT_PUBLIC_FEATURE_MERCH="@@RUNTIME:NEXT_PUBLIC_FEATURE_MERCH@@" \
    NEXT_PUBLIC_FEATURE_ARTIST_PERKS="@@RUNTIME:NEXT_PUBLIC_FEATURE_ARTIST_PERKS@@" \
    NEXT_PUBLIC_LOG_LEVEL="@@RUNTIME:NEXT_PUBLIC_LOG_LEVEL@@" \
    NEXT_PUBLIC_PLAYBACK_EVENT_URL="@@RUNTIME:NEXT_PUBLIC_PLAYBACK_EVENT_URL@@" \
    NEXT_PUBLIC_SEGMENT_WRITE_KEY="@@RUNTIME:NEXT_PUBLIC_SEGMENT_WRITE_KEY@@" \
    NEXT_PUBLIC_SENTRY_DSN="@@RUNTIME:NEXT_PUBLIC_SENTRY_DSN@@" \
    NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE="@@RUNTIME:NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE@@" \
    NEXT_PUBLIC_STELLAR_NETWORK="@@RUNTIME:NEXT_PUBLIC_STELLAR_NETWORK@@" \
    NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="@@RUNTIME:NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE@@" \
    NEXT_PUBLIC_STELLAR_HORIZON_URL="@@RUNTIME:NEXT_PUBLIC_STELLAR_HORIZON_URL@@" \
    NEXT_PUBLIC_STELLAR_RPC_URL="@@RUNTIME:NEXT_PUBLIC_STELLAR_RPC_URL@@" \
    NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL="@@RUNTIME:NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL@@" \
    NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE="@@RUNTIME:NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE@@" \
    NEXT_PUBLIC_USE_DEMO_DATA="@@RUNTIME:NEXT_PUBLIC_USE_DEMO_DATA@@"

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.js ./scripts/docker-entrypoint.js

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["node", "scripts/docker-entrypoint.js"]
