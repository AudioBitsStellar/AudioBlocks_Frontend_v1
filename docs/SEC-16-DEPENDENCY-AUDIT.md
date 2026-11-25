# SEC-16: Dependency Footprint Review - Findings Report

**Issue:** #797
**Reviewer:** fortezzalaboratory
**Date:** 2026-11-22
**Scope:** Audit of wallet stacks (Dynamic Labs, MetaMask SDK, Stellar Wallets Kit) and removal of unused dependencies

---

## Executive Summary

**Status:** DEPENDENCIES ACTIVELY USED; AUDIT VULNERABILITIES FOUND

All direct wallet dependencies are in active use. No unused dependencies to remove. However, `npm audit` reports 2 high-severity vulnerabilities in transitive dependencies introduced by wallet authentication libraries.

**Action required:**
1. Update `@privy-io/react-auth` to latest version to patch transitive vulnerabilities
2. Coordinate with Privy/wallet SDK maintainers for remaining unpatched transitive deps

---

## Wallet Stack Analysis

### Direct Dependencies - Usage Report

| Package | Version | Used | Locations | Purpose |
|---------|---------|------|-----------|---------|
| `@creit.tech/stellar-wallets-kit` | ^2.7.1 | YES | `context/StellarWalletContext.tsx` | Stellar wallet support |
| `@dynamic-labs/ethereum` | ^4.23.0 | YES | `context/provider.tsx` | Dynamic Labs Ethereum connector |
| `@dynamic-labs/sdk-api` | ^0.0.720 | YES | `context/provider.tsx` | Dynamic Labs types (SdkViewSectionType, SdkViewType) |
| `@dynamic-labs/sdk-react-core` | ^4.23.0 | YES | 28 files (auth hooks, components) | Dynamic Labs React integration (primary auth) |
| `@privy-io/react-auth` | ^2.12.0 | YES | 5 files (auth contexts, hooks) | Privy authentication (alternative/backup auth) |
| `@stellar/freighter-api` | ^6.0.1 | YES | `tests/components/TestnetFunding.test.tsx` | Stellar Freighter wallet API (test support) |
| `@stellar/stellar-sdk` | ^17.2.1 | YES | Used throughout for Stellar transactions | Stellar blockchain SDK |

**Conclusion:** No unused direct dependencies to remove. All are actively imported and used.

---

## Transitive Dependency Vulnerabilities

### npm audit Results

**Command:** `npm audit --audit-level=moderate`

**Result:** 2 high-severity vulnerabilities detected

#### Vulnerability 1: bigint-buffer

```
Severity: HIGH
CVE: GHSA-3gc7-fjrx-p6mg
Issue: Buffer Overflow via toBigIntLE() Function
Link: https://github.com/advisories/GHSA-3gc7-fjrx-p6mg
```

**Root cause chain:**
- `@privy-io/react-auth` → @solana dependencies
- `@solana/buffer-layout-utils` → `@solana/web3.js`
- `@solana/web3.js` → `bigint-buffer` (vulnerable version)

**Current version in node_modules:** Likely outdated; fix available via `npm audit fix --force`

#### Vulnerability 2: decode-uri-component

```
Severity: HIGH
CVE: GHSA-vcc3-ghjq-m6fr (and GHSA-qr28-fpjm-wq7f)
Issue: Denial of service via exponential decoding of percent-encoded input
Link: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
```

**Root cause chain:**
- `@privy-io/react-auth` → @walletconnect dependencies
- `@walletconnect/utils` → `query-string`
- `query-string` → `decode-uri-component` (vulnerable version)

**Current version in node_modules:** Likely outdated; fix available via `npm audit fix --force`

---

## Remediation Recommendations

### Short-term (Immediate)

1. **Update @privy-io/react-auth to latest version**

   ```bash
   npm update @privy-io/react-auth
   ```

   This may pull in newer versions of Solana and WalletConnect deps that have patched `bigint-buffer` and `decode-uri-component`.

   **Warning:** `npm audit fix --force` may introduce breaking changes (Privy 3.x major version bump). Test thoroughly after upgrade.

2. **Verify no breaking changes after update**
   - Run the app locally
   - Test wallet connection flows (Dynamic, Privy, Freighter)
   - Run test suite

### Medium-term (If vulnerabilities persist)

1. **Lock safe versions of transitive dependencies in package-lock.json**

   ```bash
   npm install --save-dev npm-audit-resolver
   npm audit fix --force
   ```

   Then commit the locked versions.

2. **Monitor Privy and wallet library releases**
   - Set up Dependabot alerts for `@privy-io/react-auth`
   - Track @solana and @walletconnect releases for security patches

3. **Consider alternative auth if needed**
   - If Privy does not patch transitive deps, consider using only Dynamic Labs (fewer deps)
   - Or implement a custom Stellar/Freighter auth layer

### Long-term (Pre-launch)

- [ ] All npm audit vulnerabilities must be resolved or accepted in writing
- [ ] Security sign-off required before production deployment
- [ ] Include vulnerability tracking in pre-launch security checklist

---

## Dependency Reduction Opportunities

### What Cannot Be Removed

Since all direct wallet dependencies are in use, removal would break auth flows:

- **Dynamic Labs ecosystem** - Removes 28 usages; breaks primary auth system
- **Privy** - Removes 5 usages; breaks alternative/backup auth
- **Stellar libraries** - Required for Stellar signing and test support

### What Could Be Investigated

1. **Are both Dynamic Labs AND Privy needed?**
   - Current code supports dual auth (switchable via `NEXT_PUBLIC_USE_PRIVY_AUTH`)
   - For launch, could standardize on one to reduce deps
   - Would require removing one auth context, testing thoroughly

2. **Evaluate transitive dependencies**
   - Privy pulls in Solana deps even if Solana wallet support isn't used
   - Dynamic Labs pulls in MetaMask/WalletConnect
   - Consider whether feature parity would allow consolidation

### Recommendation

Do NOT remove either auth system pre-launch. The complexity of dual auth is outweighed by flexibility for users. Post-launch, if performance/security concerns arise, re-evaluate.

---

## Verification Checklist

### Direct Dependencies

- [x] `@creit.tech/stellar-wallets-kit` - Used in StellarWalletContext
- [x] `@dynamic-labs/ethereum` - Used in provider setup
- [x] `@dynamic-labs/sdk-api` - Used for types in provider
- [x] `@dynamic-labs/sdk-react-core` - Used extensively (28 locations)
- [x] `@privy-io/react-auth` - Used in auth hooks and contexts
- [x] `@stellar/freighter-api` - Used in Testnet funding test
- [x] `@stellar/stellar-sdk` - Used for blockchain operations

### npm audit Status

- [ ] High-severity vulnerabilities: **2 outstanding**
  - [ ] `bigint-buffer` via Solana deps
  - [ ] `decode-uri-component` via WalletConnect deps
- [ ] Medium/low severity: (not checked; focus on high)

### Pre-Launch Security Gate

- [ ] npm audit fully clean (all high-severity resolved)
- [ ] Updated transitive deps tested with all auth flows
- [ ] No new vulnerabilities introduced by updates

---

## References

- `package.json` - Direct dependencies listed
- `package-lock.json` - Locked versions and transitive deps
- `.github/workflows/security.yml` - Dependency audit CI check
- `docs/ENVIRONMENT_VARIABLES.md` - `NEXT_PUBLIC_USE_PRIVY_AUTH` configuration

---

## Conclusion

**All direct wallet dependencies are in active use. No removals possible without breaking functionality.**

The npm audit vulnerabilities are transitive, introduced by wallet SDK maintainers. Recommend updating `@privy-io/react-auth` and validating that auth flows still work. If vulnerabilities persist after update, escalate to Privy/wallet library maintainers or reconsider auth consolidation post-launch.

Dependency footprint is reasonable given dual-auth requirement and Stellar/EVM support.
