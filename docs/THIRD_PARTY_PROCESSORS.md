# Third-Party Processor Inventory

Launch-readiness item `COMP-04`. This registers every third-party service the
AudioBlocks Frontend sends user or artist data to, what it receives, and
whether a Data Processing Agreement (DPA) is on file. It is a companion to
[`THIRD_PARTY_AI_SECURITY_REVIEW.md`](./THIRD_PARTY_AI_SECURITY_REVIEW.md),
which covers the NVIDIA integration in depth.

This document was compiled from a read-only review of the codebase (what is
actually wired up and what data each call sends) — it does not state whether a
DPA has been signed. The **DPA status** column must be completed and kept
current by whoever owns vendor contracts; update it in the same PR that
changes which data a processor receives.

## Legend

- **Data received** — what the frontend actually sends, not everything the
  vendor's product is capable of collecting.
- **DPA status** — ☐ *Needs legal review* (default until confirmed otherwise),
  ✅ *Executed* (link it), ➖ *Not applicable* (no personal data leaves
  AudioBlocks for this processor).

## Processors

| Processor | Purpose | Data received | Where it's wired up | DPA status |
|---|---|---|---|---|
| **Dynamic (Dynamic Labs)** | Wallet-based login / EVM wallet connection | Wallet public address, connection metadata (chain id, connector used). No private keys. | `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`, wallet provider in `context/` | ☐ Needs legal review |
| **Privy** | Alternative auth: email OTP login and Google OAuth, embedded wallet creation | Email address (OTP flow), OAuth profile data from Google, session tokens (`privy-token`, `privy-id-token`, `privy-session`) | `context/PrivyAuthProvider.tsx`, see [`PRIVY_SETUP.md`](./PRIVY_SETUP.md); gated by `NEXT_PUBLIC_USE_PRIVY_AUTH` | ☐ Needs legal review |
| **Segment** | Client-side product analytics | Event name and the flat properties passed to `trackEvent` (no raw wallet secrets; see `R3`-style scrubbing in `instrumentation.ts` for the Sentry equivalent) | `lib/analytics.ts`, gated by `NEXT_PUBLIC_SEGMENT_WRITE_KEY` and visitor consent (`lib/analyticsConsent.ts`); not requested until first interaction (`lazyOnload`) | ☐ Needs legal review |
| **Sentry** | Error monitoring / crash reporting | Stack traces, request metadata with `authorization`/`cookie`/`token` headers redacted, and any `extra` fields that look like a wallet address or hex string redacted (`instrumentation.ts`) | `NEXT_PUBLIC_SENTRY_DSN`, `sentry.client.config.ts`, `instrumentation.ts` | ☐ Needs legal review |
| **NVIDIA (AI quality-filter provider)** | AI-assisted song quality assessment before a track reaches the public catalog | Song title, artist, genre, duration, optional lyrics — **metadata only, never raw audio** (see [`THIRD_PARTY_AI_SECURITY_REVIEW.md`](./THIRD_PARTY_AI_SECURITY_REVIEW.md) R1–R7) | `lib/songQualityFilter.ts`, `lib/stemAnalysis.ts`, server-side only | ☐ Needs legal review — tracked as blocking item **R6** in the AI security review for any future move to audio-based analysis |
| **Google Analytics** | Legacy analytics fallback (`ga()`) alongside Segment | Same event name/properties as Segment, sent only if the `ga` snippet is present | `lib/analytics.ts` fallback path | ☐ Needs legal review |
| **IPFS gateway (e.g. Pinata-hosted gateway)** | Serving cover art and published audio from IPFS | Content-addressed media only; no personal data in the request beyond the viewer's IP at the HTTP layer | `NEXT_PUBLIC_IPFS_GATEWAY`, see [`IPFS_INTEGRATION.md`](./IPFS_INTEGRATION.md) | ➖ Not applicable (no personal data processed on AudioBlocks' behalf) |

## Keeping this current

- Adding a new third-party SDK, analytics destination, or server-side API
  call that receives user or artist data means adding a row here in the same
  PR.
- If a processor stops receiving a category of data (e.g., a flag is removed,
  a field is dropped from a payload), update its row rather than leaving it
  stale — this is a register of what is live today, not a historical log.
- Changing what the **NVIDIA** integration receives also requires a re-review
  of `THIRD_PARTY_AI_SECURITY_REVIEW.md`, not just this table.
