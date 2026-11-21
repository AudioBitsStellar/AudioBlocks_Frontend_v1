# Refund Policy for NFT Purchases

**Last Updated:** 2026-11-21

## Overview

AudioBlocks operates on the Stellar blockchain using Soroban smart contracts. All NFT purchases are on-chain transactions that are final and irreversible once confirmed.

## Purchase Finality

Once a purchase transaction is **confirmed on-chain**:
- The transaction cannot be reversed or refunded
- The NFT is transferred to your wallet immediately
- Your XLM payment is received by the artist/seller

This is a fundamental property of blockchain technology and applies to all Soroban purchases on Stellar.

## When a Purchase Fails

Purchases can fail for several reasons before confirmation:

### Transaction Preparation Failures
- **Insufficient XLM balance** — Your wallet doesn't have enough XLM for the purchase price + network fees
- **Network errors** — API or backend service temporarily unavailable
- **Invalid wallet state** — Your wallet is disconnected or not properly configured

**What happens:** The transaction never reaches the blockchain. No XLM is deducted.

### Signature Rejection
- **User declined** — You rejected the signature request in your wallet
- **Wallet locked** — Your wallet requires re-authentication

**What happens:** The transaction is not signed or submitted. No XLM is deducted.

### On-Chain Failures
- **Insufficient account reserves** — Your Stellar account doesn't meet minimum reserve requirements
- **Smart contract error** — The NFT has been delisted or is no longer available
- **Blockchain network congestion** — Rare; Stellar prioritizes transactions fairly

**What happens:** The transaction failed on-chain. Your XLM is returned to your wallet (minus a small network fee for the failed attempt).

## Getting Support

If your purchase:
- **Failed but you see XLM deducted** — This is a rare blockchain state issue
- **Succeeded but you didn't receive the NFT** — The transfer may be pending
- **Needs investigation** — You have questions about a transaction

### Contact Support

**Email:** support@audioblocks.dev  
**Include:**
- Your wallet public address (starts with `G`)
- Transaction hash (if available; shown in explorer link)
- Purchase details (artist name, track/collection, price)
- Description of what happened

Our team will investigate and help resolve the issue.

## Blockchain Transaction Records

All transactions are recorded on Stellar's public ledger and can be verified at:
- [Stellar Expert](https://stellar.expert/) — Public mainnet explorer
- [Stellar Laboratory](https://laboratory.stellar.org/) — Transaction inspection tool

Your wallet may also show transaction history directly.

## Stellar Account Reserves

Stellar requires minimum reserve balances (currently ~6.5 XLM for a basic account). Purchases fail if accepting the NFT would violate this reserve. Increase your account balance or delete unused NFTs/trustlines to free up reserve capacity.

See [Stellar's documentation](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#reserve) for details.
