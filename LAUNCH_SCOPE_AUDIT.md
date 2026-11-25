# Launch Scope Audit: Routes vs. Backend Support (Issue #852, PROD-01)

## Method

`docs/api-contract.md` already maps every backend call the frontend makes
(`ok` / `path mismatch` / `missing on backend` / `mocked`), current as of
2026-10-19 — this audit doesn't re-derive that, it rolls it up to the
**page** level app-router route by app-router route, checks whether every
route whose data isn't backed is actually hidden or safely degraded, and
checks the systems this issue names explicitly (marketplace, community
voting, merch, events) weren't missed by the existing flag coverage.

## Finding: marketplace trading had no flag, and was worse than unfinished (fixed)

`lib/featureFlags.ts` already gates merch, events, and community voting —
each is unfinished on the backend and hidden in production. Marketplace
buying/bidding/listing is equally unfinished (`useSorobanRelay` has no
wallet-signing implementation and calls a path no backend route serves —
see `docs/api-contract.md`'s Transactions & on-chain table) but had **no
flag at all**, and `AuctionBidDialog`/`ListNFTDialog` additionally called a
hook method (`relay`/`isPending`) that doesn't exist on `useSorobanRelay`,
a hard `tsc` error that would throw a raw `TypeError` on first click in
production. Added a `marketplaceTrading` flag (off by default in
production, same as the others), gated all three entry points, and fixed
the two dialogs to call the hook's real API so that if the flag is ever
flipped on before the backend is ready, a user at least gets a readable
error instead of a crash. Full detail in the commit that made this change.

## Go/no-go per route

**Go** — ships correctly as-is, including routes whose unfinished parts are
properly hidden:

| Route | Why |
| --- | --- |
| `/login` | Auth endpoints are `ok` per the contract map. |
| `/onboarding` | Depends on profile endpoints, `ok`. |
| `/dashboard` (home) | Merch and Events sections self-hide (`isFeatureEnabled`); personalization rows degrade through `DataErrorBoundary`. |
| `/dashboard/community` | Already gated by `communityVoting`; returns nothing when off. |
| `/dashboard/profile`, `/dashboard/profile/edit` | Profile read/write is `ok` (two non-critical fields, `website`/`twitter`, silently don't persist — documented, not launch-blocking). |
| `/dashboard/playlist/:id` | Playlist endpoints are `ok`. |
| `/dashboard/settings` | `DataSaverToggle` is local-only; the parts that hit the backend (account linking, privacy export) degrade through their own loading/error states rather than crashing. |
| `(home)/search` | `tracks/search` is `mocked`, not broken — returns mock results, not an error. |
| `(home)/artist-hub`, `(home)/collective`, `(home)/quality-standards`, `(home)/page` (marketing home) | Static marketing content, no backend dependency. |
| `/embed/song/:id` | Standalone embed player; streams from the song endpoint directly. |

**Go, but showing mock or empty data, not real data** — won't break, but
isn't done either:

| Route | What's actually behind it |
| --- | --- |
| `/dashboard/all-artists`, `/dashboard/all-collections` | `hooks/queries/{artists,collections}.ts` are `mocked`. |
| `(home)/marketPlace`, `/dashboard/collection` | `NftCollections` renders `lib/fixtures/marketplace.ts` only when `NEXT_PUBLIC_USE_DEMO_DATA=true`; in production it's `[]` by design (see `lib/fixtures/index.ts`), so the page shows whatever empty state the grid has rather than fake listings. Trading itself is now flag-gated per the fix above. |
| `/dashboard/collection/:id` | `useNFTCollection`/`useOwnedCollection` back onto `GET /api/nfts/owned/:address`, `missing on backend`. |

**Degraded, needs a maintainer decision** — not hidden, not crashing, but
quietly non-functional:

| Route | Issue |
| --- | --- |
| `/dashboard/notifications` | All three notification endpoints are `missing on backend` (#746). `useNotifications` surfaces `isError`, so the page shows an error/retry state instead of crashing, but there is no working notifications feature right now and nothing tells the user that's expected rather than transient. Candidate for the same `isFeatureEnabled` treatment as merch/events if this is going to stay unbacked past launch. |
| `/dashboard/transactions` | `context/TransactionContext`'s status-polling endpoint is `missing on backend`; the page's own on-chain activity call is a `path mismatch`. Transactions list may show stale/pending status indefinitely. |

## Secondary finding: most "path mismatch" rows share one root cause

A large fraction of `docs/api-contract.md`'s `path mismatch` rows (playlists,
collaborators, on-chain activity, the stream URL) come from the same thing:
`apiClient` builds URLs as `NEXT_PUBLIC_API_URL + /api/...`, but several raw
`fetch` call sites assume `NEXT_PUBLIC_API_URL` already ends in `/api` and
append paths without it (the contract doc's own "Base URLs" note explains
this). That's one env-convention bug wearing a dozen different disguises in
the table, not a dozen independent integration bugs. Left unfixed here — it
touches `NEXT_PUBLIC_API_URL`'s documented contract and every raw-`fetch`
call site that depends on it, which is a larger, riskier change than this
audit's scope, but worth a maintainer picking one convention and fixing it
in one pass rather than call-site by call-site.

## Not re-verified here

Every `ok` verdict above is inherited from `docs/api-contract.md`, not
re-checked against a live backend (none was available in this environment).
If that document is stale, so is this one.
