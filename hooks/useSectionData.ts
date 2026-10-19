import { useQuery } from '@tanstack/react-query';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';

export interface SectionDataState<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

type UseSectionDataOptions<T> = {
  queryKey: readonly string[];
  fetchFn: () => Promise<T[]>;
  staleTime?: number;
  retry?: number;
  enabled?: boolean;
};

export function useSectionData<T>({
  queryKey,
  fetchFn,
  staleTime = CACHE_DURATIONS.MEDIUM,
  retry = RETRY_CONFIG.DEFAULT,
  enabled = true,
}: UseSectionDataOptions<T>): SectionDataState<T> {
  const { data, isLoading, isError, refetch } = useQuery<T[]>({
    queryKey,
    queryFn: fetchFn,
    staleTime,
    retry,
    enabled,
  });

  return {
    data: data ?? [],
    isLoading,
    isError,
    isEmpty: !isLoading && !isError && (!data || data.length === 0),
    refetch: async () => {
      await refetch();
    },
  };
}
