# Data Fetching Patterns & Caching Strategy

This guide documents the data fetching architecture and conventions used in AudioBlocks Frontend. It covers React Query setup, custom hooks, caching strategies, and error handling.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 React Components                        │
├─────────────────────────────────────────────────────────┤
│          Custom Hooks (useProfile, useCommunity)       │
├─────────────────────────────────────────────────────────┤
│      React Query Hooks (useQuery, useMutation)         │
├─────────────────────────────────────────────────────────┤
│          API Service Layer (apiClient, services)        │
├─────────────────────────────────────────────────────────┤
│                  Backend API                            │
└─────────────────────────────────────────────────────────┘
```

## React Query Configuration

React Query is configured in `lib/queryClient.ts` and provided via `context/provider.tsx`:

```typescript
// lib/queryClient.ts
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,            // Data fresh for 30 seconds
        gcTime: 5 * 60 * 1000,           // Keep in cache for 5 minutes
        retry: 3,                        // Retry failed queries 3 times
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000), // Exponential backoff
        refetchOnWindowFocus: false,     // Don't refetch on window focus
        refetchOnReconnect: true,        // Refetch when back online
      },
      mutations: {
        retry: 0,                        // Don't retry mutations
      },
    },
  });
}
```

Devtools are mounted in development only inside `context/provider.tsx`.

## Custom Hooks Pattern

All data fetching should go through custom hooks in the `hooks/` directory. This centralizes API logic and makes components cleaner.

### Basic Query Hook

```typescript
// hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { profileService } from '@/lib/profileService';

interface Profile {
  id: string;
  name: string;
  avatar: string;
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],        // Unique cache key
    queryFn: () => profileService.getProfile(userId),
    staleTime: 5 * 60 * 1000,            // Optional: override defaults
    enabled: !!userId,                   // Skip query if userId is undefined
  });
}

// Usage in component
function ProfileCard({ userId }: { userId: string }) {
  const { data, isLoading, error } = useProfile(userId);
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  
  return <div>{data.name}</div>;
}
```

### Mutation Hook

```typescript
// hooks/useUpdateProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/lib/profileService';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ProfileUpdate) => profileService.updateProfile(data),
    onSuccess: (updatedProfile) => {
      // Invalidate cache to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ['profile', updatedProfile.id],
      });
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
    },
  });
}

// Usage in component
function EditProfileForm({ userId }: { userId: string }) {
  const { mutate, isLoading } = useUpdateProfile();
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutate({ id: userId, name: 'New Name' });
    }}>
      <button disabled={isLoading}>Save</button>
    </form>
  );
}
```

### Dependent Query Hook

```typescript
// hooks/useCollectionArtists.ts
export function useCollectionArtists(collectionId?: string) {
  return useQuery({
    queryKey: ['collection-artists', collectionId],
    queryFn: () => artistService.getByCollection(collectionId!),
    enabled: !!collectionId,  // Only fetch when collectionId exists
  });
}
```

## Caching Strategy

### Cache Keys

Cache keys should follow a hierarchical pattern for easy invalidation:

```typescript
// Profile data
['profile', userId]
['profile', userId, 'collections']
['profile', userId, 'followers']

// Collections
['collections']
['collections', { page: 1, limit: 20 }]
['collection', collectionId]

// Search
['search', { query: 'beatles', limit: 10 }]
```

### Cache Invalidation

Invalidate cache after mutations to keep data fresh:

```typescript
// Single query
queryClient.invalidateQueries({ queryKey: ['profile', userId] });

// All queries matching prefix
queryClient.invalidateQueries({ queryKey: ['profile'] });

// All queries
queryClient.invalidateQueries();
```

## Stale Time & GC Time

Understanding these settings is crucial:

| Setting | Default | Purpose |
|---------|---------|---------|
| `staleTime` | 0 | How long data is considered fresh (no background refetch) |
| `gcTime` (was `cacheTime`) | 5 minutes | How long to keep unused data in memory |

```typescript
// Example: Fresh data for 5 min, garbage collect after 10 min
useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
  staleTime: 5 * 60 * 1000,   // Fresh for 5 minutes
  gcTime: 10 * 60 * 1000,     // Keep in cache for 10 minutes
});
```

## Error Handling Patterns

### Query Errors

```typescript
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <ErrorState 
        title="Failed to load users"
        message={error.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    );
  }
  
  return <ul>{data?.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

### Mutation Errors

```typescript
function CreatePlaylist() {
  const { mutate, error, isLoading } = useMutation({
    mutationFn: (name: string) => playlistService.create(name),
    onError: (error) => {
      if (error.statusCode === 409) {
        // Handle specific errors
        toast.error('Playlist name already exists');
      } else {
        toast.error('Failed to create playlist');
      }
    },
  });
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutate(name);
    }}>
      {error && <p className="text-red-600">{error.message}</p>}
      <button disabled={isLoading}>Create</button>
    </form>
  );
}
```

## Common Patterns

### Pagination

```typescript
function CollectionList() {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useQuery({
    queryKey: ['collections', page],
    queryFn: () => collectionService.getAll({ page, limit: 20 }),
  });
  
  return (
    <>
      <div>{data?.items.map(item => <CollectionCard key={item.id} {...item} />)}</div>
      <Pagination 
        page={page}
        total={data?.total}
        onPageChange={setPage}
      />
    </>
  );
}
```

### Search with Debounce

```typescript
import { useDeferredValue } from 'react';

function SearchTracks() {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const { data: results } = useQuery({
    queryKey: ['search', deferredSearchTerm],
    queryFn: () => searchService.searchTracks(deferredSearchTerm),
    enabled: deferredSearchTerm.length > 0,
  });
  
  return (
    <>
      <input 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      {results?.map(track => <TrackCard key={track.id} {...track} />)}
    </>
  );
}
```

### Infinite Queries (Scroll Loading)

```typescript
function InfiniteCollections() {
  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['collections-infinite'],
    queryFn: ({ pageParam = 1 }) => 
      collectionService.getAll({ page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.nextPage : undefined,
  });
  
  const collections = data?.pages.flatMap(page => page.items);
  
  return (
    <InfiniteScroll
      dataLength={collections?.length || 0}
      next={fetchNextPage}
      hasMore={hasNextPage || false}
      loader={<LoadingSpinner />}
    >
      {collections?.map(c => <CollectionCard key={c.id} {...c} />)}
    </InfiniteScroll>
  );
}
```

## API Service Layer

Services should handle HTTP details, responses are passed to React Query:

```typescript
// lib/profileService.ts
import { apiClient } from './apiClient';

export const profileService = {
  async getProfile(userId: string) {
    const { data } = await apiClient.get(`/profiles/${userId}`);
    return data;
  },
  
  async updateProfile(profile: Profile) {
    const { data } = await apiClient.put(`/profiles/${profile.id}`, profile);
    return data;
  },
};
```

## Common Pitfalls & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Infinite loops | Query key includes object that changes | Use stable query keys, stringify objects |
| Stale data on navigation | Cache not invalidated | Invalidate on mutation success |
| Duplicate requests | Missing `enabled` flag | Add `enabled: !!dependency` to skip queries |
| Memory leaks | Not cleaning up queries | React Query handles this automatically |
| Race conditions | Multiple mutations in flight | Use `isPending` state or disable button |

## Testing Data Fetching

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('loads and displays user', async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  const { User } = render(
    <QueryClientProvider client={queryClient}>
      <UserProfile userId="123" />
    </QueryClientProvider>
  );
  
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## React Query DevTools

In development, React Query DevTools helps debug queries:

```typescript
// Enable in .env.local: NEXT_PUBLIC_ENABLE_DEVTOOLS=true
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function App() {
  return (
    <>
      <YourApp />
      {process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </>
  );
}
```

## Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Caching Strategy Guide](https://tanstack.com/query/latest/docs/react/guides/caching)
