# API Contract Map: Listener App ↔ AudioBlock Backend

This page lists every backend call the listener app makes, the backend route that serves it, and whether the two match. Use it to see which calls are real, which are mocked, and which are still waiting on the backend.

- **Frontend:** every `apiClient` call, every `API_ENDPOINTS` entry in [`lib/constants.ts`](../lib/constants.ts), every raw `fetch` to the backend, and the commented-out calls behind the mocks in `hooks/queries/`.
- **Backend:** route mounts in [`src/app.ts`](https://github.com/AudioBitsStellar/AudioBlock_Backend/blob/main/src/app.ts) and the routers in [`src/routes/`](https://github.com/AudioBitsStellar/AudioBlock_Backend/tree/main/src/routes), as of `main` on 2026-10-19. A router file that exists but is not mounted in `app.ts` is unreachable, so it counts as **missing on backend**.

**Status values**

| Status             | Meaning                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| ok                 | The frontend path and method match a mounted backend route.                                                                    |
| path mismatch      | The backend serves this, but at a different path, method or base URL.                                                          |
| missing on backend | No mounted backend route serves this. The linked backend issue tracks it.                                                      |
| mocked             | The frontend returns mock data and the real call is commented out. The backend column shows the route to use when it is wired. |

**Base URLs.** `apiClient` builds each URL as `NEXT_PUBLIC_API_URL + path`, and every path starts with `/api`. `.env.example` sets `NEXT_PUBLIC_API_URL=http://localhost:4000`, with no `/api`. Some raw `fetch` calls assume the opposite: they fall back to `http://localhost:4000/api` and append paths without `/api`. Those rows are marked **path mismatch** because they lose the `/api` prefix when the documented env value is used.

## Auth & session

| Frontend call site                                            | Path used                    | Backend route                                                                              | Status                                        |
| ------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `lib/apiClient.ts` (`refreshAccessToken`)                     | `POST /api/auth/refresh`     | `POST /api/auth/refresh`                                                                   | ok                                            |
| `hooks/useAuth.tsx`                                           | `POST /api/auth/login`       | `POST /api/auth/login` (legacy EVM flow)                                                   | ok                                            |
| `hooks/useAuth.tsx`                                           | `POST /api/auth/register`    | `POST /api/auth/register` (legacy EVM flow)                                                | ok                                            |
| `lib/profileSync.ts` (`AUTH_SYNC_ENDPOINT`)                   | `POST /api/auth/sync`        | none. Privy users sync through `POST /api/auth/privy/login` and `POST /api/webhooks/privy` | missing on backend (issue to open, see below) |
| `lib/apiClient.ts`, `hooks/useAuth.tsx`, `hooks/useLogout.ts` | `POST`/`DELETE /api/session` | Next.js route handler `app/api/session/route.ts`, not the backend                          | ok                                            |

## Profile & account

| Frontend call site                            | Path used                      | Backend route                            | Status                                                                                                                  |
| --------------------------------------------- | ------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `lib/profileService.ts` (`USER_PROFILE`)      | `GET /api/users/profile`       | `GET /api/users/profile`                 | ok                                                                                                                      |
| `lib/profileService.ts` (`USER_PROFILE`)      | `PUT /api/users/profile`       | `PUT /api/users/profile`                 | ok. The backend saves `name` and `bio`; it ignores `website` and `twitter` without an error, so those two don't persist |
| `lib/profileService.ts` (`USER_ACCOUNT_TYPE`) | `PUT /api/user/account-type`   | `POST /api/account-type`                 | path mismatch (path and method)                                                                                         |
| `lib/accountService.ts` (`ACCOUNT_DELETION`)  | `GET /api/account/deletion`    | `GET /api/account/deletion-status`       | path mismatch                                                                                                           |
| `lib/accountService.ts` (`ACCOUNT_DELETION`)  | `POST /api/account/deletion`   | `POST /api/account/deletion-request`     | path mismatch                                                                                                           |
| `lib/accountService.ts` (`ACCOUNT_DELETION`)  | `DELETE /api/account/deletion` | `DELETE /api/account/deletion-request`   | path mismatch                                                                                                           |
| `lib/accountService.ts` (`ACCOUNT_EXPORT`)    | `GET /api/account/export`      | `GET /api/account/data`                  | path mismatch                                                                                                           |
| `context/UserPreferencesContext.tsx`          | `PUT /api/user/preferences`    | none                                     | missing on backend (issue to open, see below)                                                                           |
| `hooks/queries/users.ts`                      | `GET /api/users/:id`           | `GET /api/users/:id`                     | mocked                                                                                                                  |
| `hooks/queries/users.ts`                      | `GET /api/users/:id/activity`  | `GET /api/activity/users/:id/activities` | mocked                                                                                                                  |

## Songs & streaming

| Frontend call site                        | Path used                              | Backend route                                                                                                                            | Status        |
| ----------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `hooks/queries/tracks.ts`                 | `GET /api/tracks/:id`                  | `GET /api/song/:id` (different path)                                                                                                     | mocked        |
| `hooks/queries/tracks.ts`                 | `GET /api/tracks/trending`             | `GET /api/charts/trending`. The charts router is not mounted ([#743](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/743)) | mocked        |
| `hooks/queries/tracks.ts`                 | `GET /api/tracks/search?q=`            | `GET /api/song/search`, not routed yet ([#812](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/812))                       | mocked        |
| `components/common/Player.tsx`            | `GET {NEXT_PUBLIC_API_URL}/stream/:id` | `GET /api/song/stream/:id`                                                                                                               | path mismatch |
| `components/common/home/HeroCarousel.tsx` | `GET {NEXT_PUBLIC_API_URL}/stream/:id` | `GET /api/song/stream/:id`                                                                                                               | path mismatch |

## Comments

| Frontend call site                          | Path used                       | Backend route                                                          | Status                                                                                         |
| ------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/commentService.ts` (`SONG_COMMENTS`)   | `GET /api/song/:id/comments`    | `songEngagementRoutes`, to be mounted on `/api/song` as #749 specifies | missing on backend ([#749](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/749)) |
| `lib/commentService.ts` (`SONG_COMMENTS`)   | `POST /api/song/:id/comments`   | `songEngagementRoutes`, to be mounted on `/api/song` as #749 specifies | missing on backend ([#749](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/749)) |
| `lib/commentService.ts` (`COMMENT_REPLIES`) | `GET /api/comments/:id/replies` | `GET /api/comments/:id/replies`                                        | ok                                                                                             |
| `lib/commentService.ts` (`COMMENT`)         | `PUT /api/comments/:id`         | `PUT /api/comments/:id`                                                | ok                                                                                             |
| `lib/commentService.ts` (`COMMENT`)         | `DELETE /api/comments/:id`      | `DELETE /api/comments/:id`                                             | ok                                                                                             |

## Notifications

| Frontend call site                                      | Path used                             | Backend route                     | Status                                                                                         |
| ------------------------------------------------------- | ------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/notificationService.ts` (`NOTIFICATIONS`)          | `GET /api/notifications?page=&limit=` | `notificationRoutes`, not mounted | missing on backend ([#746](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/746)) |
| `lib/notificationService.ts` (`NOTIFICATION_READ`)      | `PUT /api/notifications/:id/read`     | `notificationRoutes`, not mounted | missing on backend ([#746](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/746)) |
| `lib/notificationService.ts` (`NOTIFICATIONS_READ_ALL`) | `POST /api/notifications/read-all`    | `notificationRoutes`, not mounted | missing on backend ([#746](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/746)) |

## Playlists

| Frontend call site                              | Path used                                                          | Backend route                                     | Status                          |
| ----------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------- |
| `lib/playlistService.ts` (`PLAYLIST`)           | `GET /api/playlists/:id`                                           | `GET /api/playlists/:id`                          | ok                              |
| `lib/playlistService.ts` (`PLAYLISTS_FOLLOWED`) | `GET /api/playlists/followed`                                      | `GET /api/playlists/followed`                     | ok                              |
| `lib/playlistService.ts` (`PLAYLISTS`)          | `POST /api/playlists`                                              | `POST /api/playlists`                             | ok                              |
| `lib/playlistService.ts` (`PLAYLIST_FOLLOW`)    | `POST /api/playlists/:id/follow`                                   | `POST /api/playlists/:id/follow`                  | ok                              |
| `lib/playlistService.ts` (`PLAYLIST_FOLLOW`)    | `DELETE /api/playlists/:id/follow`                                 | `DELETE /api/playlists/:id/follow`                | ok                              |
| `app/dashboard/playlist/page.tsx`               | `GET /api/playlists`, relative to the Next.js origin               | `GET /api/playlists` on the backend origin        | path mismatch                   |
| `components/playlist/CollaboratorsPanel.tsx`    | `GET {NEXT_PUBLIC_API_URL}/playlists/:id/collaborators`            | `GET /api/playlists/:id/collaborators`            | path mismatch                   |
| `components/playlist/CollaboratorsPanel.tsx`    | `POST {NEXT_PUBLIC_API_URL}/playlists/:id/collaborators`           | `POST /api/playlists/:id/collaborators`           | path mismatch                   |
| `components/playlist/CollaboratorsPanel.tsx`    | `PATCH {NEXT_PUBLIC_API_URL}/playlists/:id/collaborators/:userId`  | `PUT /api/playlists/:id/collaborators/:userId`    | path mismatch (path and method) |
| `components/playlist/CollaboratorsPanel.tsx`    | `DELETE {NEXT_PUBLIC_API_URL}/playlists/:id/collaborators/:userId` | `DELETE /api/playlists/:id/collaborators/:userId` | path mismatch                   |

## Listening history & personalization

| Frontend call site                                 | Path used                                       | Backend route                                                                                                                              | Status                                                                                         |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `lib/recentlyPlayedService.ts` (`RECENTLY_PLAYED`) | `GET /api/users/me/recently-played`             | none on `main`. [#838](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/838) is closed, but the route is not in `src/routes/` | missing on backend ([#838](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/838)) |
| `lib/recentlyPlayedService.ts` (`RECENTLY_PLAYED`) | `DELETE /api/users/me/recently-played`          | none on `main`                                                                                                                             | missing on backend ([#838](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/838)) |
| `hooks/usePersonalizationRow.ts`                   | `GET {NEXT_PUBLIC_API_URL}/genres/:name/songs`  | `GET /api/genres/:id/songs` (takes a genre id). The genre router is not mounted                                                            | missing on backend ([#745](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/745)) |
| `hooks/usePersonalizationRow.ts`                   | `GET {NEXT_PUBLIC_API_URL}/artists/:name/songs` | `GET /api/song?artistId=:id`                                                                                                               | path mismatch                                                                                  |

## Explore & discovery

These calls are behind feature flags (#637), so production never sends them while the flags are off.

| Frontend call site                              | Path used                      | Backend route                                                                                                                            | Status                                        |
| ----------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `lib/exploreService.ts` (`MERCH`)               | `GET /api/merch`               | none                                                                                                                                     | missing on backend (issue to open, see below) |
| `lib/exploreService.ts` (`EVENTS`)              | `GET /api/events`              | none                                                                                                                                     | missing on backend (issue to open, see below) |
| `lib/exploreService.ts` (`EXPLORE_CATEGORIES`)  | `GET /api/explore/categories`  | none. The closest is `GET /api/genres`, which is not mounted ([#745](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/745)) | missing on backend (issue to open, see below) |
| `lib/exploreService.ts` (`EXPLORE_COLLECTIONS`) | `GET /api/explore/collections` | none                                                                                                                                     | missing on backend (issue to open, see below) |
| `lib/exploreService.ts` (`EXPLORE_ARTISTS`)     | `GET /api/explore/artists`     | none                                                                                                                                     | missing on backend (issue to open, see below) |

## Community

| Frontend call site                                  | Path used                         | Backend route | Status                                        |
| --------------------------------------------------- | --------------------------------- | ------------- | --------------------------------------------- |
| `lib/communityService.ts` (`COMMUNITY_LEADERBOARD`) | `GET /api/community/leaderboard`  | none          | missing on backend (issue to open, see below) |
| `lib/communityService.ts` (`COMMUNITY_VOTE`)        | `POST /api/community/vote`        | none          | missing on backend (issue to open, see below) |
| `lib/communityService.ts` (`COMMUNITY_MY_VOTES`)    | `GET /api/community/votes/me`     | none          | missing on backend (issue to open, see below) |
| `hooks/useCommunityActivity.ts`                     | `GET /api/community/:id/activity` | none          | missing on backend (issue to open, see below) |

## Collections & NFTs

| Frontend call site                                   | Path used                           | Backend route                                                                                                                                                        | Status                                        |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `lib/ownedCollectionService.ts` (`OWNED_COLLECTION`) | `GET /api/nfts/owned/:address`      | none. `GET /api/users/me/library/collections` is a different resource and is not mounted ([#748](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/748)) | missing on backend (issue to open, see below) |
| `hooks/queries/useCollectionMetadata.ts`             | `GET /api/collections/:id/metadata` | none                                                                                                                                                                 | missing on backend (issue to open, see below) |
| `hooks/queries/collections.ts`                       | `GET /api/collections/explore`      | none                                                                                                                                                                 | mocked                                        |
| `hooks/queries/collections.ts`                       | `GET /api/users/:id/collections`    | none                                                                                                                                                                 | mocked                                        |
| `hooks/queries/collections.ts`                       | `GET /api/collections/:id`          | none                                                                                                                                                                 | mocked                                        |

## Transactions & on-chain

| Frontend call site                    | Path used                                                            | Backend route                                                                    | Status                                        |
| ------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| `context/TransactionContext.tsx`      | `GET /api/transactions/:hash/status`, relative to the Next.js origin | none. The closest is `GET /api/wallet/history`                                   | missing on backend (issue to open, see below) |
| `app/dashboard/transactions/page.tsx` | `GET {NEXT_PUBLIC_API_URL}/activity/onchain?page=&limit=`            | `GET /api/activity/onchain`                                                      | path mismatch                                 |
| `hooks/useSorobanRelay.ts`            | `POST {NEXT_PUBLIC_API_BASE_URL}/soroban/relay`                      | `POST /api/marketplace/prepare-{listing,buy,auction,bid}` followed by `submit-*` | path mismatch                                 |

## Moderation

| Frontend call site                        | Path used                       | Backend route                   | Status                                                                                                          |
| ----------------------------------------- | ------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `lib/reportService.ts` (`SONG_REPORT`)    | `POST /api/song/:id/report`     | `POST /api/song/:id/report`     | ok. The comment next to `SONG_REPORT` in `lib/constants.ts` still says this route is not mounted, but it now is |
| `lib/reportService.ts` (`COMMENT_REPORT`) | `POST /api/comments/:id/report` | `POST /api/comments/:id/report` | ok                                                                                                              |

## Backend issues to open

No existing AudioBlock_Backend issue covers the routes below. Each one needs an issue before it can be linked from the tables above.

| Area                             | Routes                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Community voting and leaderboard | `GET /api/community/leaderboard`, `POST /api/community/vote`, `GET /api/community/votes/me`, `GET /api/community/:id/activity` |
| Merch catalogue                  | `GET /api/merch`                                                                                                               |
| Events                           | `GET /api/events`                                                                                                              |
| Explore feeds                    | `GET /api/explore/categories`, `GET /api/explore/collections`, `GET /api/explore/artists`                                      |
| Owned NFTs by wallet             | `GET /api/nfts/owned/:address`                                                                                                 |
| Collection metadata              | `GET /api/collections/:id/metadata`                                                                                            |
| Listener preferences sync        | `PUT /api/user/preferences`                                                                                                    |
| Provider profile sync            | `POST /api/auth/sync`                                                                                                          |
| Transaction status by hash       | `GET /api/transactions/:hash/status`                                                                                           |
