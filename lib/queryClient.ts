import { QueryClient } from '@tanstack/react-query';
import { ApiShapeError } from './api/unwrap';

const DEFAULT_STALE_TIME = 30 * 1000;
const DEFAULT_GC_TIME = 5 * 60 * 1000;
const DEFAULT_RETRY_COUNT = 3;
const RETRY_BASE_DELAY_MS = 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        // A response with the wrong shape won't fix itself on retry (#564).
        retry: (failureCount, error) =>
          !(error instanceof ApiShapeError) && failureCount < DEFAULT_RETRY_COUNT,
        retryDelay: (attemptIndex) => Math.min(RETRY_BASE_DELAY_MS * 2 ** attemptIndex, 30_000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Shape mismatches go to the nearest error boundary instead of
        // rendering as an empty list (#564). Other errors keep using each
        // query's own error state.
        throwOnError: (error) => error instanceof ApiShapeError,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();
