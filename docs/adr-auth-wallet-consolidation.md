# ADR: Consolidate Authentication & Wallet Stacks

**Status:** Proposed  
**Date:** 2026-11-21  
**Author:** opepraise  

## Context

AudioBlocks currently maintains three separate authentication/wallet providers:

1. **Privy** (`@privy-io/react-auth`)
   - Handles: Email + Google social login
   - Provides: Embedded wallet creation
   - Used in: `context/PrivyAuthProvider.tsx`

2. **Dynamic Labs** (`@dynamic-labs/sdk-react-core`)
   - Handles: Wallet connection and user session
   - Provides: EVM chain support (deprecated per ADR-evm-deprecation)
   - Used in: `context/provider.tsx`, `context/WalletContext.tsx`

3. **Stellar Wallets Kit** (`@creit.tech/stellar-wallets-kit`)
   - Handles: Stellar wallet connection (Freighter, etc.)
   - Provides: Transaction signing on Stellar network
   - Used in: `context/StellarWalletContext.tsx`

This fragmented approach creates:
- Multiple provider contexts with overlapping responsibilities
- Confusion about which wallet/auth layer handles which operation
- Unnecessary bundle bloat from maintaining three SDKs
- Complex component coupling to specific providers

## Decision

**Consolidate to a unified auth/wallet adapter pattern:**

1. **Remove Dynamic Labs entirely** (follow ADR-evm-deprecation)
2. **Create unified adapter interface** at `lib/auth/adapter.ts`:
   ```typescript
   interface AuthAdapter {
     connect(): Promise<void>;
     disconnect(): void;
     getAddress(): string | null;
     signTransaction(xdr: string): Promise<string>;
     isConnected(): boolean;
   }
   ```

3. **Implement two providers**:
   - `SocialAuthProvider` (Email/Google via Privy)
   - `StellarWalletProvider` (Stellar wallets via Wallets Kit)

4. **Single context** at `context/AuthContext.tsx`:
   - Manages both social auth and wallet connection
   - Abstracts adapter selection
   - Provides unified interface to components

## Migration Path

**Phase 1**: Create new adapter interface and unified context (non-breaking)
**Phase 2**: Update components to use new context (gradual, via feature flag if needed)
**Phase 3**: Deprecate old contexts and remove dead imports

## Benefits

- Single source of truth for auth state
- Clearer component dependencies
- Easier to test and maintain
- Smaller bundle (fewer provider libraries)
- Simplified onboarding logic

## Related Issues

- #807: EVM deprecation (prerequisite)
- #809: Failed-purchase UX (benefits from unified auth state)
