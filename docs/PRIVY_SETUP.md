# Privy Setup

This document describes how the [Privy React SDK](https://docs.privy.io/) is
installed and configured in AudioBlocks Frontend.

## Installation

The SDK lives in `package.json` as a runtime dependency:

```
@privy-io/react-auth
```

After cloning the repo, run your normal package-manager install step — the
SDK ships no additional setup beyond that.

## Configuration

`context/PrivyAuthProvider.tsx` wraps the app in `<PrivyProvider>` and reads
its app id at runtime from the environment.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | yes (when Privy is enabled) | App id from the [Privy dashboard](https://dashboard.privy.io) |
| `NEXT_PUBLIC_USE_PRIVY_AUTH` | no (default `false`) | Feature flag — when `true`, the app uses Privy for authentication instead of Dynamic |

Add both to `.env.local` (see `.env.example` for placeholders):

```bash
NEXT_PUBLIC_USE_PRIVY_AUTH=true
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### Login methods

`PrivyAuthProvider` enables:

- **Email (OTP)** — used by `components/auth/EmailOtpLoginForm.tsx`
- **Google OAuth**

Embedded wallets are created automatically for users who log in without a
connected wallet (`createOnLogin: 'users-without-wallets'`).

## Usage

Any client component inside the provider tree can call Privy hooks:

```tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';

export function LoginButton() {
  const { login } = usePrivy();
  return <button onClick={login}>Sign in</button>;
}
```
