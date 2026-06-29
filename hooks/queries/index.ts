/**
 * React Query Hooks - Unified Data Fetching Layer
 * 
 * This directory contains all React Query hooks for data fetching across the application.
 * Follow the conventions below when adding new hooks:
 * 
 * 1. Naming Convention:
 *    - Hook name: use[Entity][Action] (e.g., useExploreCollections, useUserCollection)
 *    - Query key: ['entity', 'action', ...params] (e.g., ['collections', 'explore'])
 *    - File name: [entity].ts (e.g., collections.ts, users.ts)
 * 
 * 2. Hook Structure:
 *    - Export hook function with descriptive name
 *    - Use useQuery for data fetching, useMutation for mutations
 *    - Include appropriate staleTime, cacheTime, and retry configurations
 *    - Return consistent shape: { data, isLoading, error, refetch, ... }
 * 
 * 3. Query Keys:
 *    - Define query key constants at the top of each file
 *    - Use array format for hierarchical keys
 *    - Include parameters in keys for proper cache invalidation
 * 
 * 4. Error Handling:
 *    - Let errors propagate to components for UI handling
 *    - Use error boundaries for route-level error handling
 * 
 * 5. TypeScript:
 *    - Define interfaces for all data types
 *    - Use generics where appropriate for reusability
 */

export * from './collections';
export * from './tracks';
export * from './users';
