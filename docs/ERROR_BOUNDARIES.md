# Section error boundaries + retry pattern (#40)

Dashboard pages (`/dashboard`, `/dashboard/collection`, `/dashboard/community`,
`/dashboard/playlist`) currently render local mock arrays that can't fail — but
they will once real fetches are wired in. This pattern lets one section fail
without taking down the rest of the page, and gives the user a way to recover.

## Pieces

| Component                                    | Role                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/common/ErrorState.tsx`           | Presentational error block: illustration, title, message, **Retry** button. Variants: `generic`, `network`, `not-found`.                                                             |
| `components/common/DataErrorBoundary.tsx`    | Class error boundary whose fallback **is** `ErrorState`. Catches render errors in its subtree, shows the retry UI, and remounts the subtree on retry.                                |
| `components/common/SectionErrorBoundary.tsx` | Heavier boundary with a "Reload page" / "Contact support" / expandable stack-trace fallback. Use for a whole route section or a crash-prone widget where the extra affordances help. |

## Usage

Wrap each independently-loading section:

```tsx
import DataErrorBoundary from '@/components/common/DataErrorBoundary';

<DataErrorBoundary name="Collections" onRetry={() => collectionsQuery.refetch()}>
  <CollectionsGrid data={collectionsQuery.data} />
</DataErrorBoundary>;
```

- `name` — used in the fallback heading (`"<name> failed to load"`) and dev logs.
- `variant` — `"network"` for fetch/connectivity failures, `"generic"` otherwise.
- `onRetry` — optional. Runs before the subtree remounts; use it to
  `refetch()` / invalidate a query. Retry always remounts the children
  regardless, so a component that fetches on mount recovers even without it.

`DataErrorBoundary` only catches **render-phase** errors. For an async fetch
that resolves to an error state (React Query `isError`), render `ErrorState`
directly:

```tsx
if (query.isError) {
  return <ErrorState variant="network" onRetry={query.refetch} isRetrying={query.isFetching} />;
}
```

## Applied so far

- **Explore** (`app/dashboard/page.tsx`) — every section (`RecentlyPlayed`,
  `CategorySection`, `Collections`, `EventSection`, `Artists`, `Merch`) is
  wrapped.

## To do on the other pages

When real data is wired into Collection / Community / Playlist, wrap each
section the same way and pass the section's `refetch` as `onRetry`. Prefer one
boundary per data source over one boundary for the whole page, so a single
failed request doesn't hide the sections that loaded fine.
