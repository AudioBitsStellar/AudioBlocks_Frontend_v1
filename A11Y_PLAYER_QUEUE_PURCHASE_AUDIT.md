# Screen-Reader and Keyboard Audit: Player, Queue, Purchase Flow (Issue #850, A11Y-02)

## Scope

`components/common/Player.tsx` and `components/player/*`, `components/common/QueueDrawer.tsx`,
and the purchase flow (`components/common/BuyButton.tsx`,
`components/marketplace/AuctionBidDialog.tsx`, `components/marketplace/ListNFTDialog.tsx`).

## Method

Read every interactive element's markup for keyboard reachability, focus
management, and whether state communicated visually (color, icon swap) is
also exposed to assistive tech. Verified behavioral fixes against the
existing test suite where coverage exists (`tests/components/QueueDrawer.test.tsx`).

## Checklist

| Area | Keyboard reachable | State exposed to AT | Focus managed on open/close | Notes |
| --- | --- | --- | --- | --- |
| Transport controls (play/pause/next/prev) | ✅ | ✅ (`aria-label` swaps) | n/a | Already correct |
| Shuffle / repeat toggles | ✅ | ❌ → ✅ fixed | n/a | Color-only state |
| Volume slider | ✅ | ✅ | n/a | Reveals on `focus-within`, already correct |
| Progress/seek slider | ✅ | ✅ | n/a | Already correct |
| "More options" / speed popovers | ✅ | ✅ | ❌ → ✅ fixed | No Escape, no focus return |
| Comments panel toggle | ✅ | ✅ | ✅ | Already correct |
| Queue drawer (open/close, reorder) | ✅ | ✅ | ✅ | Already correct |
| Queue row "Remove" button | ❌ → ✅ fixed | n/a | n/a | Invisible to everyone, not just keyboard users |
| Purchase confirm (`BuyButton` → `Modal`) | ✅ | ❌ → ✅ fixed | ✅ | Error wasn't announced |
| Auction bid dialog | ❌ → ✅ fixed | n/a | ❌ → ✅ fixed | Hand-rolled, non-trapping modal |
| List-for-sale dialog | ❌ → ✅ fixed | n/a | ❌ → ✅ fixed | Same as above |

## Defects found and fixed

1. **Queue row "Remove" button was invisible to everyone** —
   `QueueDrawer.tsx`'s remove button used `opacity-0 group-hover:opacity-100`,
   but its `<li>` never had the `group` class, so the `group-hover` selector
   never matched. The button was permanently `opacity-0`: present, clickable,
   keyboard-focusable, but never visible — the worst version of a 2.4.7
   (Focus Visible) failure, affecting sighted mouse users too. Added the
   `group` class and also reveal on `group-focus-within`/`focus` so keyboard
   users see it the same way mouse users now do.

2. **Shuffle/repeat state was color-only.** Both toggles changed to pink when
   active with no other signal; a screen reader announced "Toggle shuffle,
   button" regardless of state. Added `aria-pressed`.

3. **"More options" and playback-speed popovers had no Escape handling and
   no focus return.** Keyboard users who opened either menu with Enter/Space
   had no keyboard way to close it except clicking elsewhere (which a
   keyboard-only user may not be able to target); focus was also abandoned
   on close. Added an Escape handler that closes whichever menu is open and
   returns focus to its trigger button, matching the pattern the comments
   panel and the full-screen player already use.

4. **Purchase errors weren't announced.** `BuyButton`'s confirm modal renders
   the relay error as a plain `<p>`; a screen reader user tabbing through the
   modal might never land on it. Added `role="alert"`.

5. **`AuctionBidDialog` and `ListNFTDialog` were hand-rolled dialogs with none
   of the accessible-dialog behavior the shared `Modal` component already
   provides** — no `role="dialog"`/`aria-modal`, no focus trap (Tab could
   leave the dialog entirely), no Escape to close, no initial focus, no
   focus restore to the trigger on close. Both are reachable from real
   purchase-flow surfaces (`components/common/NftCollections.tsx`,
   `app/dashboard/collection/page.tsx`). Replaced the custom backdrop/panel
   markup in both with the shared `Modal` component (same one `BuyButton`
   already uses for its confirm dialog), keeping their existing content and
   button layout unchanged.

## Verified

- `tests/components/QueueDrawer.test.tsx` (9 tests) passes unchanged.
- No existing automated coverage for `PlayerControls`, `PlayerActions`,
  `BuyButton`, `AuctionBidDialog`, or `ListNFTDialog` — verified these by
  reading the resulting markup/behavior directly; flagging the gap rather
  than claiming test coverage that doesn't exist.
