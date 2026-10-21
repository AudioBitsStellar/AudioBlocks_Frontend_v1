# Wallet help, releases, unavailable songs and queued HLS playback

Implements the frontend work for #639–#642. Backend compatibility was inspected
against AudioBitsStellar/AudioBlock_Backend commit
`f649cbcba1e0da1c93bef8a126c92dbb58af9345`. No backend code is changed by this PR,
and source inspection is not confirmation from backend maintainers.

## Wallet guide (#639)

`/help/wallet` covers keys, installing Freighter, account backup, Testnet versus
Mainnet, and funding. It links from the connect prompt, missing-extension toast,
connection-error toast, account-linking panel, and purchase confirmation.

The guide connects directly through `@stellar/freighter-api`. Stellar Wallets
Kit (#543) and i18n have not landed in this frontend. Other Stellar wallets are
identified as alternatives, not advertised as currently integrated. The existing
EVM transaction stack is unchanged; an EVM account is never passed to Friendbot.

Friendbot receives only the address returned by Freighter, after rechecking both
the account and exact Testnet passphrase at click time. The button is absent for
Mainnet/custom networks. Account-not-found, missing-extension, rejection, network
change, timeout, and funding failure states expose recovery guidance. No secret
keys or recovery phrases are requested. Reference:
[Stellar Testnet guide](https://developers.stellar.org/docs/build/guides/freighter/connect-testnet),
[Stellar networks](https://developers.stellar.org/docs/networks).

## Releases (#640)

`GET /api/releases/:id` is expected to return `{ success, data: release }`.
The page uses `title`, `type`, `artistId`, optional `artist`, `coverArt`,
`releaseDate`, and `tracks: [{ trackNumber, song }]`, matching ReleaseController
and ReleaseService. Tracks are sorted by `trackNumber`, normalized, and passed to
`playTracks`, which replaces the playing collection and queues its remaining
available tracks in order. Shuffle creates a shuffled copy without mutating the
release response. Release links on artist pages use paginated
`GET /api/releases?artistId=...`, ordered newest first.

Unknown releases return `notFound()` in both the page and metadata. The current
backend entity has no publication field. The frontend rejects future release
dates and supports `published: false` or `status` other than `published` for the
forthcoming publication contract. **Backend maintainers must confirm the
publication field and mount ReleaseRoutes**; that router is not mounted in the
inspected `app.ts`. Draft releases must be filtered server-side too. The artist
page's independent artist API is still pending; releases do not
require already-minted on-chain songs to appear.

## Availability (#641)

The existing streaming gate is: song exists, `status === 'ready'`,
`flagged === false`, and nonempty `hlsMasterUrl`. TakedownService sets `flagged`;
SongModerationService can flag a song or set its status to `failed`.

`songToTrack` applies those fields and also accepts explicit `available: false`
or `isAvailable: false`. Missing songs/stream metadata become visible disabled
rows. `isTrackAvailable` guards all playback/queue entry points and restored
queue data. Unavailable rows have text labels, a hover explanation and a
keyboard/screen-reader description; both play and queue buttons are disabled.

Playlist details read `GET /api/playlists/:id`, sorting `songs` by `position`.
Only the matching `userId` owner of a non-rule-based playlist sees the bulk
cleanup action. It calls the existing `DELETE /api/playlists/:id/songs/:songId`
for each unavailable song, refetches persisted state, and reports partial
failures. It never treats a local deletion as a successful backend update.

The new Library integration point reads `GET /api/users/me/library` and preserves
null saved-song entries. **Backend maintainers must extend SaveService.toView**:
the current slim song projection has only id/title/cover/duration/artistId and
omits stream/availability fields. Until that projection supplies availability
and stream metadata, these entries fail closed as unavailable rather than
making a counted stream request to probe availability. Deleted rows that the
backend cascades away cannot be reconstructed by the frontend; tombstones must
be retained server-side if those rows should remain visible. This contract
requires backend review; no agreement with maintainers is claimed.

## HLS and prefetch (#642; necessary foundation from #557)

`getStreamUrl` uses `/api/song/stream/:id` and handles API origins both with and
without a trailing `/api`. `attachAudioSource` loads hls.js dynamically, uses
native HLS for normal playback when available, handles bounded fatal-error
recovery, and destroys resources when replaced. Prefetch always uses hls.js so
its segment limit is enforceable. Native-only browsers without Media Source
support skip speculative loading and retain native normal playback.

`useQueuedAudio` owns two persistent decks. When 20 seconds or less remain (or
metadata reveals a shorter track), it loads the next available queued track;
with an empty queue it can warm a deterministic sequential successor. It skips
speculation for an unknown shuffle successor, repeat-one, browser `saveData`,
and the application Data saver setting. It stops hls.js after the first
`FRAG_BUFFERED` event. Promotion retains the same audio element, Hls instance,
and media buffer; it never copies a MediaSource blob URL into another element.
Crossfade uses both decks and preserves Web Audio normalization. Queue edits,
skips, saver changes, page exit and unmount cancel pending loads. A lazy import
that resolves after cancellation cannot allocate a new Hls instance.

### Play counting: rollout blocker and explicit gate

The inspected backend's `SongController.streamSong` increments `playCount` and
inserts a SongPlayEvent on a GET of the manifest, throttled for 30 seconds per
IP/song. It does this even for cached manifests. **Prefetch is disabled by
default**, because fetching that endpoint would count a song nobody heard.
An arbitrary query parameter/header cannot safely bypass this backend logic.

Enable only after the deployed backend stops counting manifest requests and
provides a separately reviewed playback-event endpoint:

```env
NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE=event
NEXT_PUBLIC_PLAYBACK_EVENT_URL=https://your-api.example/api/playback/:id
```

The URL above is an example contract, not an endpoint that exists in the current
backend. It must contain `:id`; the player POSTs `{ songId }` with credentials on
the actual media `playing` event, once per loaded track, never during prefetch.
The endpoint needs the backend's chosen authentication, deduplication and play
qualification policy. A real rollout should reconcile that policy with other
play reporters; this frontend does not invent a listening-duration threshold.
Leave mode `request` and the URL empty until that integration is deployed.

### Measured transitions

Run `npm run test:playback` after installing Playwright Chromium. The isolated
Vite harness exercises the production playback hook and real hls.js with a
locally generated AAC HLS sine-wave fixture. It does not need a wallet or API.
The fixture is generated audio, without third-party recordings.

The benchmark adds 150 ms to every manifest and segment response. It measures
`performance.now()` from the outgoing element's `ended` event to the incoming
track's `playing` event, surfaced as `audioblocks:transition`. Three trials on
local Chromium produced:

| Mode                           |  Trial 1 |  Trial 2 |  Trial 3 |   Median |
| ------------------------------ | -------: | -------: | -------: | -------: |
| Cold, data saver enabled       | 644.2 ms | 647.2 ms | 701.5 ms | 647.2 ms |
| Prefetched, event-mode fixture |  21.7 ms |  29.5 ms |  17.2 ms |  21.7 ms |

That is a 98.6% lower median in this controlled fixture, **not a production
latency claim**. The test asserts a reduction, a single prefetched segment, no
play event during prefetch, queue replacement, and no prefetch with data saver.
The test attaches raw measurements as JSON. Safari's native-only path and real
backend/CDN latency need integration validation after the backend rollout.

## Local validation and baseline

Install with `npm ci --legacy-peer-deps`: the pre-existing Sentry 7 dependency
has a Next <=14 peer range while this project uses Next 15. The updated lockfile
records Sentry, which was already declared but absent from the original lock.
The stylesheet also restores the missing Tailwind import and supplies the brand,
muted-text and border tokens used by these pages, including readable light/dark
colors. The component harness loads the actual stylesheet.

Use targeted formatting/lint checks for changed files; the repository-wide
format gate and type check already contain unrelated failures on upstream.
Detailed test/build results and baseline comparison are recorded in the PR.
