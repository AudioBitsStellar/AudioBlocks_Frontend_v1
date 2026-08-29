# ADR-001: Use Dynamic Labs for Wallet Authentication

## Status

Accepted

## Context

AudioBlocks needs to support multiple wallets (Freighter, Lobstr, Albedo, etc.) and a smooth onboarding flow for both crypto-native and non-crypto users. Building and maintaining wallet connection logic, embedded wallets, and passkey support in-house would be error-prone and would delay core product work.

## Decision

Use [Dynamic Labs](https://www.dynamic.xyz/) as the wallet authentication provider.

## Consequences

### Positive

- Faster time-to-market for wallet connection and authentication.
- Built-in support for multiple Stellar wallets and embedded wallets.
- Handles connection state, disconnections, and session persistence.
- Provides UI components for wallet selection and profile management.

### Negative

- Vendor lock-in to Dynamic Labs for authentication flows.
- Requires external `environmentId` configuration.
- Adds a third-party dependency that must be monitored for security updates.

## Alternatives Considered

- **Freighter API only**: Too limited; supports only one wallet.
- **Custom wallet adapter**: Maximum flexibility but high maintenance cost.

## References

- `context/DynamicProvider.tsx`
- `components/auth/WalletButton.tsx`
