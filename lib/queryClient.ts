import { QueryClient } from '@tanstack/react-query';
import { ApiShapeError } from './api/unwrap';
import { recordApiError, recordApiSuccess } from './apiOutageDetection';

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

/**
 * Hook error and success tracking into query client for outage detection (#816).
 * This should be called once at app initialization.
 */
export function setupOutageDetection(client: QueryClient): void {
  client.getDefaultOptions().queries = {
    ...client.getDefaultOptions().queries,
  };

  const originalSetQueryData = client.setQueryData;
  const originalSetInfiniteQueryData = client.setInfiniteQueryData;

  client.setQueryData = function (queryKey, updater, options) {
    recordApiSuccess();
    return originalSetQueryData.call(this, queryKey, updater, options);
  };

  client.setInfiniteQueryData = function (queryKey, updater, options) {
    recordApiSuccess();
    return originalSetInfiniteQueryData.call(this, queryKey, updater, options);
  };

  // Track errors through mutation callbacks
  const defaultOptions = client.getDefaultOptions();
  if (defaultOptions.mutations) {
    const originalOnError = defaultOptions.mutations.onError;
    defaultOptions.mutations.onError = function (error, ...args) {
      recordApiError(error);
      if (originalOnError) {
        return originalOnError.call(this, error, ...args);
      }
    };
  }
}

export const queryClient = createQueryClient();
