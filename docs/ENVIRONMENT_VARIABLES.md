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
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | string | Dynamic Labs environment ID for wallet connection | `YOUR_ENV_ID` |

### Third-party Services

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_SEGMENT_WRITE_KEY` | string | Segment analytics write key (optional for analytics) | `YOUR_KEY` |

## Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_LOG_LEVEL` | string | `"info"` | Logging level: `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS` | boolean | `"false"` | Enable React Query DevTools | `"true"` |
| `NEXT_PUBLIC_CACHE_TTL` | number | `300000` | Cache time-to-live in milliseconds | `600000` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | boolean | `"true"` | Enable analytics tracking | `"false"` |

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
NEXT_PUBLIC_DYNAMIC_ENV_ID=your-env-id
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
```

## Production

For production deployment:

1. Set all variables in your deployment platform's secrets
2. Remove `NEXT_PUBLIC_ENABLE_DEVTOOLS` (keep false)
3. Set `NEXT_PUBLIC_LOG_LEVEL` to `"error"` or `"warn"`
4. Use mainnet chain ID (1) and mainnet RPC
