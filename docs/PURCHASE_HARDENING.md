# Purchase hardening integration contract (#803–#806)

Frontend changes are implemented but backend integration is required before these issues can be closed. No builds or tests were run at the user's request.

## Required backend behavior

- `POST /api/marketplace/prepare-buy` and `POST /api/marketplace/submit-buy` receive the same `Idempotency-Key` header. Persist an attempt scoped to authenticated buyer, network and listing. Atomically deduplicate submission, bind the key to the original request, and return the original result for repeated requests. Reject reuse with different input. Permit the header in CORS. Never rely on browser locks for server correctness.
- `GET /api/marketplace/purchases/:idempotencyKey` is a proposed endpoint, not an endpoint verified in this checkout. Return `{ status: "pending" | "confirmed" | "failed", txHash?: string }`. Confirmed must include the transaction hash and indexed ownership. Failed must mean that the attempt cannot later settle, including an expired unsigned preparation; an absent record or indexer lag must not be treated as failed. Check authenticated ownership of each attempt.
- `GET /api/transactions/:hash/status` is also a required backend endpoint (already listed as missing in api-contract.md). Return `{ status: "pending" | "confirmed" | "failed" }`. The transaction context prefers this endpoint and falls back to chain RPC if unavailable. Timeouts remain pending.
- Return structured `code`/`errorCode` errors for insufficient funds and missing trustlines. Identify the required asset code, issuer, and whether the buyer or seller must act. The UI must never guess an issuer or automatically add a trustline.

## Frontend behavior and limits

A purchase attempt is persisted before preparation. Repeat clicks, other mounted buttons and tabs using Web Locks are blocked. Reload recovery queries server truth and never repeats signing/submission. Unknown server status and submission network failures remain locked. A server-confirmed failure permits retry. Confirmed receipts persist so another reload cannot immediately purchase the same token again.

Local storage and Web Locks coordinate one browser only. Different devices, browsers without Web Locks, cleared storage, and malicious clients require backend idempotency. Recovery requires local storage. Signed XDR and wallet secrets are never persisted.

Wallet errors share actionable copy for missing, locked, wrong-network and declined requests. Wallet-specific SDK error formats still require validation with each supported module. The balance check uses the connected Stellar address, reserves, liabilities and sponsorships; issued-asset availability and trustlines are validated by preparation, not guessed from the display price.

## Verification to run later

The relay unit tests cover a rapid double call, an interrupted submission recovered from server truth, an ambiguous network failure, and a rejected signature. They have not been executed. Also manually verify each supported wallet module, a missing buyer/seller trustline, an unfunded account, two-tab purchase attempts, account changes during signing, backend idempotency across devices, and indexer lag. Existing EVM marketplace end-to-end tests do not verify this Stellar flow.

The issue search did not return useful repository matches; overlap was not verified. Related existing work includes #549 (relay), #555 (balance), and the missing status endpoint recorded in api-contract.md.
