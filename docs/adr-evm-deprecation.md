# ADR: EVM Wallet Support Removal

**Status:** Decided  
**Date:** 2026-11-21  
**Author:** opepraise  

## Context

AudioBlocks previously supported both Stellar and EVM (Ethereum/Lisk) wallets through Dynamic Labs SDK. However, the backend has retired EVM support entirely, focusing exclusively on Stellar network integration.

Current state:
- **Frontend**: Maintains EVM wallet connectors via Dynamic Labs (`@dynamic-labs/ethereum`)
- **Backend**: No longer supports EVM transactions or chain operations
- **Impact**: EVM wallet connection is non-functional on the user-facing app

## Decision

**Remove all EVM wallet support from the frontend**, including:
1. `@dynamic-labs/ethereum` package dependency
2. `EthereumWalletConnectors` initialization in `context/provider.tsx`
3. Wagmi-related hooks (`useAccount`, `useChainId`, `useDisconnect`)
4. `WalletContext` EVM-specific logic (SUPPORTED_CHAIN_IDS, wagmi integration)
5. All Dynamic Labs EVM configuration

## Rationale

- **Backend parity**: Backend no longer supports EVM, making frontend EVM support dead code
- **Maintenance burden**: Unused dependencies increase bundle size and require ongoing security updates
- **User clarity**: Single wallet provider (Stellar) reduces confusion in authentication flows
- **Simplification**: Consolidates to Stellar + Privy for auth, removing branching logic

## Consequences

**Benefits:**
- Smaller bundle size (removes EVM provider libraries)
- Simplified authentication flow
- Reduced maintenance surface
- Clear single-chain identity

**Migration:**
- No action needed for existing users on Stellar network
- Users previously using EVM wallets will see only Stellar option available
- Documentation updated to reflect Stellar-only support

## Related Issues

- #808: Consolidate auth/wallet stacks (follow-up consolidation)
- #809: Failed-purchase UX (refund policy aligned to Stellar-only model)
