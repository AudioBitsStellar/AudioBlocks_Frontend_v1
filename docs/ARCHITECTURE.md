# Architecture: Listener, Backend, Chain & Media Data Flow

Launch-readiness item `DOC-04` (#868). This is the cross-cutting reference
for how a listener's actions move through this frontend, the shared backend,
the Stellar/Soroban chain, and the two separate media paths (backend-served
streams vs. IPFS-hosted assets). It links out to the specialized docs rather
than repeating them — see "Related docs" at the end.

For the system diagram and component-tree diagram, see
["Architecture Overview" in the README](../README.md#architecture-overview);
this doc adds the piece that diagram leaves out — media delivery — and walks
through full request lifecycles rather than a single data-flow sketch.

## Services involved

| Service | Repo | Role here |
|---|---|---|
| **This repo** | `AudioBlocks_Frontend_v1` | Listener-facing Next.js app: discovery, streaming, community, NFT marketplace |
| **Artist app** | `AudioBlocks_For_Artist` (sibling repo) | Upload, on-chain minting, earnings — out of scope for this doc |
| **Backend** | `AudioBlock_Backend` | REST API: auth, catalog, playlists, collection, moderation. See [`docs/api-contract.md`](api-contract.md) for the exact endpoint-by-endpoint status |
| **Chain** | Stellar / Soroban (the app also still carries legacy EVM config — see below) | On-chain NFT ownership, royalty enforcement, wallet signing |
| **Media** | Backend-fronted storage (`NEXT_PUBLIC_MEDIA_HOST`) and IPFS (`NEXT_PUBLIC_IPFS_GATEWAY`) | Audio streams, cover art, NFT artwork |

**Two chains, one in migration.** The codebase has an active Stellar/Soroban
integration (`@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`,
`lib/stellarConfig.ts`, `context/StellarWalletContext.tsx`) alongside older
EVM-oriented config and auth code (`NEXT_PUBLIC_CHAIN_ID`,
`NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS`, Dynamic Labs
wallet auth, `hooks/useAuth.tsx`'s "legacy EVM flow" per
`docs/api-contract.md`). Don't treat the presence of EVM env vars as evidence
this app still targets an EVM chain in production — **(verify with
maintainers)** which flow is authoritative today and whether the EVM path is
scheduled for removal; this doc describes both because both are live in the
code.

## Request lifecycles

### 1. Wallet connect & auth

```
Listener (browser)
   │ connect wallet
   ▼
Dynamic Labs SDK  ──or──  Stellar Wallets Kit / Freighter
   │ wallet address                  │ wallet address
   ▼                                  ▼
Frontend (context/StellarWalletContext.tsx, hooks/useAuth.tsx)
   │ sign auth message
   ▼
Backend: POST /api/auth/login (legacy EVM) or Privy-backed flow
(NEXT_PUBLIC_USE_PRIVY_AUTH gates which path runs — see
docs/PRIVY_SETUP.md)
   │ JWT
   ▼
Next.js route handler: app/api/session/route.ts
   │ sets httpOnly cookie (audioblocks_jwt)
   ▼
Frontend treats the listener as authenticated
```

The JWT never touches `NEXT_PUBLIC_*` client state; it's set as an httpOnly
cookie by a same-origin Next.js route handler specifically so client JS
cannot read it (see the comment in `app/api/session/route.ts`).

### 2. Discovery & streaming (backend-served media)

```
Listener browses /  or  /dashboard
   │
   ▼
Frontend: React Query hooks (hooks/queries/) → apiClient
   │ GET /api/songs, /api/playlists, ...  (NEXT_PUBLIC_API_URL + path)
   ▼
Backend: catalog/playlist services
   │ song metadata incl. hlsMasterUrl, flagged, status
   ▼
Frontend gates playback: isTrackAvailable() requires status === 'ready',
flagged === false, and a non-empty hlsMasterUrl (see
docs/LISTENER_WALLET_RELEASES_PLAYBACK.md, "Availability")
   │ user presses play
   ▼
GET /stream/:trackId  (lib/player/streamUrl.ts, backend-fronted — not IPFS)
   │ audio bytes / HLS manifest
   ▼
context/PlaybackContext manages playback state; the service worker
(docs/SERVICE_WORKER.md) can serve cached segments if the network drops
```

Play-count semantics depend on `NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE`: a
`request`-counted stream increments on the `GET /stream/:id` call itself; an
`event`-counted deployment instead POSTs to `NEXT_PUBLIC_PLAYBACK_EVENT_URL`
after playback starts (`hooks/useQueuedAudio.ts`). See
[`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) for both
variables.

### 3. Cover art & NFT artwork (IPFS media path)

This is the path the README's top-level diagram omits.

```
Frontend needs an image for a track/NFT
   │
   ▼
lib/ipfs.ts: resolve CID → gateway URL
   │ NEXT_PUBLIC_IPFS_GATEWAY if set, else the public https://ipfs.io fallback
   ▼
next/image fetches through the resolved gateway origin
   │ next.config.ts remotePatterns allow only NEXT_PUBLIC_IPFS_GATEWAY's
   │ origin (/ipfs/**) and NEXT_PUBLIC_MEDIA_HOST's origin (/**) —
   │ no arbitrary remote host is allowed through the optimizer
   ▼
On fetch failure (404/504, gateway down): UI falls back to a local
placeholder (/audio.jpg, /placeholder-cover.svg) — see
docs/IPFS_INTEGRATION.md, "Resilience & Gateway Fallbacks"
```

`NEXT_PUBLIC_MEDIA_HOST` (the backend's own S3/CDN bucket) and
`NEXT_PUBLIC_IPFS_GATEWAY` are two independent, separately-configured origins
— a track's audio can be backend-hosted while its cover art is on IPFS, or
vice versa, depending on what the artist-side upload flow produced for that
asset.

### 4. On-chain collection / marketplace data

```
Listener views /dashboard/collection
   │
   ▼
Frontend: GET /api/collection
   │
   ▼
Backend queries the chain for on-chain ownership/metadata
(Stellar/Soroban — see docs/STELLAR_TRANSACTION_FLOW.md for the
frontend-side transaction/approval hooks, and docs/api-contract.md for
which of these endpoints are confirmed wired vs. still mocked)
   │ NFT metadata (may include an ipfs:// token URI — path 3 above
   │ resolves it to a displayable image)
   ▼
Frontend renders the collection grid
```

Marketplace purchase/transfer flows (gas estimation, signing, submission,
explorer links) are covered in full in
[`docs/STELLAR_TRANSACTION_FLOW.md`](STELLAR_TRANSACTION_FLOW.md) — this doc
only places that flow in the larger picture.

### 5. AI song-quality gate (artist-side, visible here as a gate on availability)

Not triggered by the listener directly, but it's why some songs are
unavailable in path 2 above: songs are screened by the quality filter before
`status` becomes `'ready'`. See
[`docs/AI_SONG_QUALITY_FILTER.md`](AI_SONG_QUALITY_FILTER.md) and
[`docs/THIRD_PARTY_AI_SECURITY_REVIEW.md`](THIRD_PARTY_AI_SECURITY_REVIEW.md)
for what does and doesn't leave AudioBlocks infrastructure during that step.

## Related docs

- [`README.md#architecture-overview`](../README.md#architecture-overview) —
  system/component diagrams, routes, project structure
- [`docs/api-contract.md`](api-contract.md) — endpoint-by-endpoint frontend ↔
  backend status
- [`docs/STELLAR_TRANSACTION_FLOW.md`](STELLAR_TRANSACTION_FLOW.md) — wallet
  transaction flow in depth
- [`docs/IPFS_INTEGRATION.md`](IPFS_INTEGRATION.md) — gateway resolution and
  fallbacks in depth
- [`docs/LISTENER_WALLET_RELEASES_PLAYBACK.md`](LISTENER_WALLET_RELEASES_PLAYBACK.md)
  — availability gating and release/queue behavior in depth
- [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) — every
  variable named above
- [`docs/SECURITY_INCIDENT_RUNBOOK.md`](SECURITY_INCIDENT_RUNBOOK.md) — what
  happens when a piece of this flow is compromised
