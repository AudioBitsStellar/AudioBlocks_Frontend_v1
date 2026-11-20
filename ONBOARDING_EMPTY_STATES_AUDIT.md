# Onboarding and First-Run Experience Audit (Issue #853, PROD-02)

## Onboarding steps (defined and now tested)

`app/onboarding/page.tsx` already defines a clear, small first-run flow —
the gap was that none of it had test coverage (`lib/onboarding.ts`'s
localStorage flag and `components/auth/OnboardingRedirect.tsx`'s routing
guard were tested; the page itself wasn't):

1. An authenticated, first-time visitor (no `audioblocks_onboarding_complete`
   flag) is routed here by `OnboardingRedirect`; an unauthenticated visitor
   who lands here directly is bounced to `/`.
2. They pick **Listen & collect** or **Create & mint**, which saves the role
   (`useSetAccountType` → `PUT /api/user/account-type`).
3. Listener: onboarding is marked complete and the browser returns to
   `returnTo` (default `/dashboard`).
4. Artist: a second step confirms the choice and offers a link to the
   separate artist dashboard before continuing.
5. If saving fails, the selection stays visible with a retry action
   (`role="alert"`) instead of losing the user's choice.
6. **Skip for now** finishes onboarding without saving a role.

Added `tests/app/OnboardingPage.test.tsx`, covering all six steps above
(redirect-when-unauthenticated, both roles, the returnTo default, the
artist confirmation step, retry-after-failure, skip, and that both role
buttons disable while a choice is saving) — 7 tests, all passing against
the page as it already behaves; no page logic changed.

## Empty states

Checked every first-run-relevant list/section for what a brand-new account
with no history sees:

| Surface | Behavior | Verdict |
| --- | --- | --- |
| `components/common/RecentlyPlayed.tsx` | Renders nothing when there's no history | Fine — a home-page rail silently omitting itself is standard, not a gap. |
| `components/playlist/FollowedPlaylistsList.tsx` (sidebar) | Renders nothing when following zero playlists | Fine, same reasoning — an empty sidebar section isn't worth a dedicated message. |
| `app/dashboard/library/page.tsx` | Shows "No saved songs yet." | Minimal but present. |
| `app/dashboard/playlist/page.tsx` | Shows "Your playlist is empty." / "Your playlists are empty." | Present. |
| `components/search/SearchResults.tsx` | Has a dedicated no-results branch | Present. |
| `app/dashboard/notifications/page.tsx` | Backed by endpoints that don't exist yet (see `LAUNCH_SCOPE_AUDIT.md`) | Out of scope here — tracked as a backend gap, not a missing empty state. |

### Finding: the shared `EmptyState` component is dead code (partially fixed)

`components/ui/EmptyState.tsx` exists with illustration variants literally
named for scenarios already covered above (`NoCollections`, `NoResults`,
`NoRecentlyPlayed`, `NoFollowers`) but is imported nowhere in the app — it
was never wired up. It also didn't match the app's design system: it used
Tailwind's OS-driven `dark:` variant (there's no `@custom-variant dark` in
`app/globals.css`, so this only ever responds to the OS color scheme) and a
`teal-500` accent instead of the app's `brand` pink, while every page that
actually implements an empty state today (library, playlist, search) uses
hand-rolled markup with the real tokens instead.

Fixed the component's own tokens (`text-foreground`/`text-on-muted`/
`bg-brand`/`bg-surface`/`border-border-dark`, matching `COLOR_CONTRAST_AUDIT.md`)
and a separate pre-existing `tsc` error (`Cannot find name 'JSX'`, a React 19
global-namespace issue) so it's no longer broken if someone adopts it. Did
not wire it into the three pages above — swapping hand-rolled markup for a
shared component on three different pages, each with different copy and
actions, is a product/design decision beyond this audit's scope, not a
backend-support or accessibility defect. Flagging it here as a real but
separate cleanup opportunity.
