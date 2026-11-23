# Funnel metrics: signup, first play, save, purchase

`OBS-07` (#839) asks for funnel metrics across signup, first play, save and
purchase, with a dashboard. Events are emitted client-side through the
existing [`trackEvent`](../lib/analytics.ts) helper (`lib/analytics.ts`,
added in #323), which already fans out to Segment (`window.analytics.track`)
and a Google Analytics fallback, and already no-ops until the visitor has
accepted analytics consent (#597) or when
`NEXT_PUBLIC_ANALYTICS_ENABLED=false`. No new tracking infrastructure was
added — this wires the four funnel steps into the SDK that was already
there, following the one existing precedent
(`hooks/useWalletAnalytics.ts`'s `wallet_connect`/`wallet_disconnect`).

## Events

| Event | Fires when | Where | Properties |
|---|---|---|---|
| `signup` | The backend creates a new account (login 404s, then `/api/auth/register` succeeds) — see `hooks/useAuth.tsx` | `authenticateUser` | `role`, `method` |
| `first_play` | The *first* track this browser has ever audibly started playing (native `playing` event, not just a click) — see `hooks/useQueuedAudio.ts` | the `playing()` handler | `trackId` |
| `save` | A playlist follow succeeds (`follow: true`) — see `hooks/usePlaylists.ts` | `useToggleFollowPlaylist`'s `onSuccess` | `kind: 'playlist'`, `playlistId` |
| `purchase` | A marketplace buy transaction is prepared, signed, submitted and confirmed — see `components/common/BuyButton.tsx` | `useSorobanRelay`'s `onSuccess` | `tokenId`, `price`, `network` |

`first_play` is deduplicated per browser via a dedicated localStorage flag
(`lib/firstPlay.ts`, `audioblocks_first_play_complete`), the same pattern
`lib/onboarding.ts` already uses for the onboarding redirect — it fires once
per browser, not once per track.

### `save` only covers playlists today

There is no track-level "favorite"/"save a song" write action in the
frontend yet — `PlayerActions.tsx` has `Heart`/`ListPlus` buttons but they
have no `onClick` handlers, and `/api/users/me/library` is read-only from
the frontend's side. Following a playlist
(`useToggleFollowPlaylist`) is the closest real, backend-confirmed "save"
action that exists, so that's what `save` measures for now. When track-level
saving ships, fire `trackEvent('save', { kind: 'track', trackId })` from
that success path and this funnel step will cover both.

## Dashboard

The dashboard itself lives in whichever destination receives these events
(Segment → a connected warehouse/Mixpanel/Amplitude, or GA), not in this
repo. To build the signup → first play → save → purchase funnel:

1. In your analytics destination, create a funnel report with these steps in
   order: `signup`, `first_play`, `save`, `purchase`.
2. Segment's Personas/Engage (or the GA4 "Funnel exploration" template, if
   routed to GA) can build this directly from the event names above with no
   additional instrumentation.
3. Conversion at each step is comparable across releases as long as the
   event names/properties in the table above don't change — treat renaming
   one as a breaking change to the dashboard.

## Verifying locally

With `NEXT_PUBLIC_ANALYTICS_ENABLED` unset (defaults to enabled) and after
accepting the analytics consent banner, each event logs via
`console.debug('[analytics] ...')` in non-production builds (see
`lib/analytics.ts`) — open the browser console and walk through sign-up,
play a track, follow a playlist, and buy to see all four fire.
