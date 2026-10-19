# Dashboard Section Data Pattern (#23)

## Overview

The `useSectionData` hook and `SectionWrapper` component provide a standardized pattern for handling loading, error, and empty states across dashboard sections.

## Hook: `useSectionData`

Located at `hooks/useSectionData.ts`.

```ts
const { data, isLoading, isError, isEmpty } = useSectionData<T>({
  queryKey: ['explore-collections'],
  fetchFn: getExploreCollections,
  staleTime: CACHE_DURATIONS.MEDIUM, // optional
  retry: RETRY_CONFIG.DEFAULT, // optional
  enabled: true, // optional
});
```

Returns:

- `data: T[]` — fetched items (empty array if none)
- `isLoading: boolean` — initial load in progress
- `isError: boolean` — fetch failed
- `isEmpty: boolean` — no data and not loading/error

## Component: `SectionWrapper`

Located at `components/common/dashboard/SectionWrapper.tsx`.

A generic wrapper that uses `useSectionData` to standardize loading/error/empty states and optional carousel rendering.

```tsx
<SectionWrapper
  title="Collections"
  viewAllHref="/dashboard/all-collections"
  queryKey={QUERY_KEYS.EXPLORE_COLLECTIONS}
  fetchFn={getExploreCollections}
  searchQuery={searchQuery}
  activeGenre={activeGenre}
  searchFields={(item) => [item.song, item.artist, item.description]}
  genreField={(item) => item.description}
  renderEmpty={(query) => <p>{query ? 'No matches' : 'No data'}</p>}
  renderItem={(item, index) => <div>...</div>}
/>
```

## Migration Guide for Remaining Sections

### Merch

```tsx
import { SectionWrapper } from '@/components/common/dashboard/SectionWrapper';
import { QUERY_KEYS } from '@/lib/constants';
import { getMerchListings } from '@/lib/exploreService';

<SectionWrapper
  title="Merch"
  queryKey={QUERY_KEYS.EXPLORE_MERCH}
  fetchFn={getMerchListings}
  renderEmpty={() => <p>No merch available yet.</p>}
  renderItem={(item) => <MerchCard item={item} />}
  carousel={false}
/>;
```

### EventSection

```tsx
<SectionWrapper
  title="Events"
  queryKey={QUERY_KEYS.EXPLORE_EVENTS}
  fetchFn={getEventListings}
  renderEmpty={() => <p>No upcoming events yet.</p>}
  renderItem={(item) => <EventCard item={item} />}
/>
```

## Adopted Sections

- ✅ **Collections** — refactored to `SectionWrapper`
- ✅ **Artists** — refactored to `SectionWrapper`
- ⬜ **Merch** — pending migration
- ⬜ **EventSection** — pending migration

## Adding New Sections

1. Add a query function to `lib/exploreService.ts`
2. Add query key to `lib/constants.ts` under `QUERY_KEYS`
3. Create a hook in `hooks/useExplore.ts` if needed
4. Use `<SectionWrapper>` in the dashboard page
