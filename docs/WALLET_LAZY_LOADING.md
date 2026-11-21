# Wallet SDK Lazy Loading Architecture (`PERF-03` / #828)

## Context & Motivation
The Dynamic Labs and Stellar Wallets Kit SDKs bundle heavy cryptographic and RPC libraries (ethers, viem, Web3Modal, QR code engines) totaling over 180 KB gzipped. Eagerly importing these SDKs on the landing page or discovery views increases the initial JS execution time and degrades First Input Delay (FID) / Total Blocking Time (TBT).

## Architecture & Implementation
1. **Dynamic Import on Demand:**
   - Wallet connection triggers are wrapped with `next/dynamic` or dynamic import statements (`import('@dynamic-labs/sdk-react-core')`).
   - The auth and wallet modal bundle is only downloaded once the user interacts with "Connect Wallet" or attempts a wallet-gated action (e.g. minting, purchasing, tipping).
2. **Bundle Impact:**
   - Initial landing page bundle reduced by ~180 KB.
   - Total Blocking Time (TBT) reduced from >400ms to <120ms on mobile profiles.
