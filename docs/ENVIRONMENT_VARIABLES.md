# Environment Variables Documentation

This document describes all environment variables used by AudioBlocks Frontend. Each variable is categorized by its purpose and required for proper application functionality.

## Overview

Environment variables are loaded from `.env.local` at startup. Missing required variables will cause validation errors and prevent the app from rendering.

## Required Variables

### Blockchain & Web3

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_CHAIN_ID` | number | The blockchain chain ID (1=Ethereum Mainnet, 11155111=Sepolia) | `11155111` |
| `NEXT_PUBLIC_RPC_URL` | string | RPC endpoint URL for the blockchain | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | string | Smart contract address for AudioBlocks | `0x...` |
| `NEXT_PUBLIC_USDC_ADDRESS` | string | USDC token contract address | `0x...` |

### API Configuration

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | string | Backend API base URL | `https://api.audioblocks.dev` |
| `NEXT_PUBLIC_API_TIMEOUT` | number | API request timeout in ms | `30000` |

### Dynamic Labs (Wallet Connection)

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | string | Dynamic Labs environment ID for wallet connection. Use a separate Dynamic environment for local, staging and production so test logins never mix with real users | `YOUR_ENV_ID` |

If the variable is missing, `EnvCheck` logs a warning in the browser console instead of crashing the app, but login will not work until it is set.

### Third-party Services

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_SEGMENT_WRITE_KEY` | string | Segment analytics write key (optional for analytics) | `YOUR_KEY` |

Analytics is not requested until the visitor's first interaction, then loads with Next.js `lazyOnload`. App fonts use `next/font` with `display: 'swap'`.

### Feature Flags

Flags gate sections whose backend endpoints are not live yet. They live in `lib/featureFlags.ts`. An unset (or unrecognized) value falls back to the environment default: **on** in development and test, **off** in production. Accepted values are `true`/`false`, `1`/`0`, `on`/`off` and `yes`/`no` (case-insensitive).

| Flag | Variable | Default (dev / test) | Default (production) | Gates | Waiting on |
|------|----------|----------------------|----------------------|-------|------------|
| `merch` | `NEXT_PUBLIC_FEATURE_MERCH` | on | off | Merch section on the Explore page | `/api/merch` |
| `events` | `NEXT_PUBLIC_FEATURE_EVENTS` | on | off | Events section on the Explore page | `/api/events` |
| `communityVoting` | `NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING` | on | off | Community voting and leaderboard page (the route 404s when off) | `/api/community/leaderboard`, `/api/community/vote`, `/api/community/votes/me` |

`.env.example` keeps these three lines commented out so a copy to `.env.local` gets the environment default. Setting a variable to `false` in `.env.local` hides that section locally, so uncomment a line only when you want to override the default. Restart the dev server after changing it. See "Feature flags" in `CONTRIBUTING.md` for how to add a flag.

### Privy Authentication

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_USE_PRIVY_AUTH` | boolean | Feature flag — when `true`, use Privy instead of Dynamic for authentication | `true` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | string | Privy app id from the [Privy dashboard](https://dashboard.privy.io) (required when Privy is enabled) | `YOUR_APP_ID` |

See `docs/PRIVY_SETUP.md` for the full setup guide.

## Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_USE_DEMO_DATA` | boolean | unset (off) | Show demo fixture data from `lib/fixtures/` (default playlist, marketplace listings, sample artists and collections). Keep it unset in production, where those screens show empty states until the backend is wired up |
| `NEXT_PUBLIC_LOG_LEVEL` | string | `"info"` | Logging level: `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS` | boolean | `"false"` | Enable React Query DevTools | `"true"` |
| `NEXT_PUBLIC_CACHE_TTL` | number | `300000` | Cache time-to-live in milliseconds | `600000` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | boolean | `"true"` | Enable analytics tracking. Even when enabled, analytics load only after the visitor accepts the consent banner (#597) | `"false"` |
| `NEXT_PUBLIC_ARTIST_DASHBOARD_URL` | string | unset | Link to the artist dashboard app, shown to artists after onboarding (#596). The CTA is hidden when unset | `https://artists.audioblocks.dev` |

## Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in required values:**
   Edit `.env.local` and replace all placeholder values with your actual configuration.

3. **Verify configuration:**
   The app will validate all required variables at startup and display clear error messages if any are missing.

## Validation Rules

### At Startup

The application runs validation before rendering:

1. **Required variables check** - All variables in the "Required Variables" section must be present
2. **Format validation** - URLs must be valid HTTP/HTTPS URLs
3. **Type validation** - Numbers must be valid integers, booleans must be 'true' or 'false'

### Error Messages

If validation fails, you'll see an error screen with:
- ✗ Missing variable names
- → What each variable is for
- → How to fix it

Example error:
```
Configuration Error

Missing required environment variables:
  • NEXT_PUBLIC_CHAIN_ID
    Required for blockchain connection. See .env.example

  • NEXT_PUBLIC_RPC_URL
    Required for Web3 operations. Use an RPC provider like Infura or Alchemy
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module with error" | Check `.env.local` exists and contains required vars |
| "Invalid RPC URL" | Ensure `NEXT_PUBLIC_RPC_URL` is a valid HTTP/HTTPS URL |
| "Chain ID mismatch" | Verify `NEXT_PUBLIC_CHAIN_ID` matches your RPC provider |
| Variables not loading | Restart dev server after changing `.env.local` |

## Security Notes

- **Never commit** `.env.local` to version control
- **Never store secrets** in `NEXT_PUBLIC_*` variables (they're public)
- **Use `.env.example`** as a template - it's safe to commit
- **For production**, set variables via your deployment platform (Vercel, etc.)

## Local Development

For local development with Sepolia testnet:

```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your-env-id
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
```

## Production

For production deployment:

1. Set all variables in your deployment platform's secrets
2. Remove `NEXT_PUBLIC_ENABLE_DEVTOOLS` (keep false)
3. Set `NEXT_PUBLIC_LOG_LEVEL` to `"error"` or `"warn"`
4. Use mainnet chain ID (1) and mainnet RPC
