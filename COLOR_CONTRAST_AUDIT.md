# Color Contrast Audit (Issue #851, A11Y-03)

## Scope

Audited every color token backing the `className` color utilities used across
`app/` and `components/`, plus the handful of free-floating `text-gray-400` /
`text-gray-500` usages outside the dashboard's always-dark shell, against
WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text/UI components).

## Method

Rather than eyeballing hex values, compiled `app/globals.css` through the
project's actual `@tailwindcss/postcss` pipeline and checked which color
utility classes used in `.tsx` files produced *no* CSS rule at all — Tailwind
v4 silently drops a utility whose underlying `--color-*` token isn't defined,
with no build warning or error. Any class that didn't compile is a guaranteed
contrast failure, since there's no color at all. Surviving tokens were then
checked by computing relative luminance and contrast ratio against the
background(s) they're actually paired with in the markup.

## Findings and fixes

### 1. `bg-surface` / `bg-surface-input` / `bg-surface-elevated` / `bg-surface-hover` were never defined (fixed)

84 occurrences across 32 files — modals (`BuyButton`'s confirm dialog via the
shared `Modal`), the marketplace dialogs, the player bar, dropdown menus,
form inputs, cards. None of these classes compiled to anything, so every one
of those surfaces rendered with **no background color at all** (transparent),
the worst possible outcome for this audit: not low contrast, no contrast,
because there was nothing there to contrast against.

Added a fixed dark panel hierarchy to `app/globals.css` (`--color-surface:
#1a1a1a`, `-elevated: #1e1e1e`, `-input: #121212`, `-hover: #262626`), not
toggled by the light/dark theme switch, since every one of those 32 files
already pairs the surface class with literal `text-white` / `text-gray-400`
/ `border-border-dark` rather than the theme-aware `--foreground`. Verified
contrast against the white/gray text used on them:

| Pair | Ratio |
| --- | --- |
| white on `--surface` (#1a1a1a) | 17.4:1 |
| white on `--surface-elevated` (#1e1e1e) | 16.7:1 |
| white on `--surface-input` (#121212) | 18.7:1 |
| gray-400 (#9ca3af) on `--surface` | 6.9:1 |

### 2. shadcn/ui semantic tokens were never defined (fixed)

`components.json` requests `cssVariables: true`, and `components/ui/{button,
badge,card,input,tooltip}.tsx` are written against the standard shadcn
token set (`primary`, `secondary`, `accent`, `destructive`, `muted-foreground`,
`input`, `ring`, `card`, `card-foreground`) — none of which existed in
`app/globals.css`. `Button` in particular is used on real pages
(`/dashboard/transactions`, `/dashboard/all-artists`, `/dashboard/all-collections`,
the session-expiry modal, the sidebar) and rendered every variant with no
intentional background or text color.

Added the missing tokens, reusing the existing brand color and the new
surface tokens so the result stays visually consistent with the rest of the
app instead of introducing a third unrelated palette:

| Pair | Ratio |
| --- | --- |
| white on `--primary` (brand `#d2045b`) | 5.4:1 |
| white on `--destructive` (`#dc2626`) | 4.8:1 |
| white on `--secondary` / `--accent` (`#262626`) | 15.1:1 |

`--ring` reuses the brand color, matching the global `:focus-visible` outline
already defined just below in the same file. `--input` reuses `--border-dark`,
the color already used for every other input/card border in the app.

### 3. `hover:border-border-muted` typo (fixed)

`app/dashboard/collection/page.tsx` had one stat card using
`hover:border-border-muted` instead of the `border-border-dark` used by every
other hover/border state in the dashboard. `--color-border-muted` was never
defined, so the hover border silently never appeared. Corrected to match the
rest of the dashboard.

### 4. Literal `text-gray-400` on a theme-aware background (fixed)

`app/(home)/search/page.tsx`'s loading fallback (`text-gray-400` on the
page's theme-toggled `--background`) fails AA in light mode: Tailwind's
`gray-400` (#9ca3af) on white is ~2.5:1. Everywhere else `text-gray-400` is
used, it's paired with a hardcoded dark background (e.g. `app/login/page.tsx`'s
`bg-[#0A0A0A]`) where the same literal gray clears 7:1+, so those were left
alone. This one instance was switched to the project's own theme-aware
`text-on-muted` token (#595959 on light / #b8b8b8 on dark — 7:1 / 10.6:1),
which already exists for exactly this purpose.

## Not addressed (flagged, not fixed)

- `text-gray-400` / `text-gray-500` have ~175 other occurrences across ~48
  files, nearly all inside the dashboard/player/marketplace's always-dark
  shell (hardcoded `bg-[#0A0A0A]`/`bg-[#1e1e1e]`/etc. or the new `bg-surface*`
  tokens above), where the same gray already clears AA against a near-black
  background (~7–9:1). Spot-checked a representative sample of each pattern
  rather than re-deriving every background per call site; none outside the
  one case above pair gray text with a light/white background.
- The dashboard's "elevated panel" color is hardcoded ad hoc across the
  codebase as at least a dozen distinct near-black hex values (`#1e1e1e`,
  `#1e181d`, `#2a2a2a`, `#161616`, `#1a1a1a`, `#121212`, `#171016`, …) instead
  of a single token. All of them individually clear contrast against white
  text, so this isn't a contrast failure, just a design-consistency one —
  out of scope for this audit, and too large a refactor (100+ call sites) to
  bundle into a contrast fix.
