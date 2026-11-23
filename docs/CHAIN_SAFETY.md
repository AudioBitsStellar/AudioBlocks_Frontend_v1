# Chain launch gates (#800–#802)

Status: frontend safeguards added; backend integration and runtime verification pending.
No builds or tests were executed for this change.

`public` is the existing canonical Stellar mainnet value; `testnet` is the only
other accepted network. EVM `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, and
0x contract settings belong to wallet authentication, not the Stellar relay.
Do not compare an Ethereum chain ID to a Stellar network. Stellar uses the
separate `NEXT_PUBLIC_STELLAR_*` variables documented in `.env.example`.

## Required backend interfaces

GET `{NEXT_PUBLIC_API_URL}/api/chain-config` must return:

```json
{
  "networkPassphrase": "Test SDF Network ; September 2015",
  "chainId": "SHA-256 hex digest of networkPassphrase",
  "rpcUrl": "https://soroban-testnet.stellar.org",
  "contracts": ["<approved marketplace/NFT C-address>"],
  "assets": ["<approved token C-address>"]
}
```

Populate real addresses and chain ID independently in deployment configuration.
The client compares both allowlists exactly, checks valid Stellar contract keys,
and calls RPC `getNetwork` to verify the passphrase. Empty lists, unavailable
services and mismatches block signing. Serve configuration over trusted HTTPS;
configure backend/RPC CORS for the frontend origin. The backend must also enforce
allowlists, source, network, amounts, recipients, fees, function selectors,
authorization trees and simulated internal calls on prepare and submit.

POST `{NEXT_PUBLIC_API_URL}/api/transactions/review` accepts `{xdr, source,
networkPassphrase}`. Independently decode and simulate the transaction, verify
all authorizations/subcalls and derive monetary details from trusted marketplace
state. Reject changed prices, extra payments, unexpected recipients or functions.
Return `{verified: true, xdr, source, networkPassphrase, summary}` where summary
contains nonempty human-readable `item`, `price`, `royalties`, `fees`, `recipient`.
Recipient must be a checksummed Stellar G-address. Amounts must include asset
identifiers, royalties must identify beneficiaries, and fees must include network
and platform fees (explicit zero when applicable). Never echo client descriptions.
Bind review to the exact XDR and its expiration. Enforce transaction expiry and
revalidation during submit. Neither endpoint exists in this frontend repository;
missing endpoints intentionally keep transactions unavailable.

## Frontend enforcement and remaining work

The wallet boundary displays the backend-derived summary before invoking the
wallet and rechecks policy after approval. A single operation from the connected
source is accepted; only allowlisted contract invocations and contract addresses
inside nested vector/map arguments are supported. Unsupported envelopes and
operations fail closed. Backend simulation is required for indirect calls,
authorization trees and semantic verification of human-readable details.

The purchase/transfer relay still has its pre-existing explicit signing-disabled
error. Listing and bid dialogs also have a pre-existing incompatible relay API
and unsigned-XDR placeholders. Do not enable these paths until their backend
contracts, signing integration and integration tests are implemented. All actual
Stellar signing must go through `StellarWalletContext.signTransaction`.

Before closing #800–#802, verify startup/off-mainnet banner, RPC/backend mismatch,
outage, malformed config, hostile/nested addresses, invalid XDR, review cancellation,
duplicate clicks, disconnect/account changes, summary-to-XDR tampering and each
purchase/transfer/listing/bid path. Add backend enforcement tests and run the
frontend regression suite in the authorized development environment. Remote issue
overlap search remains pending; repository documentation was inspected locally.
