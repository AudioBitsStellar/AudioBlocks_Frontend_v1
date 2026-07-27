import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';

export interface SectionDataState<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}

type UseSectionDataOptions<T> = {
  queryKey: string[];
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
  const { data, isLoading, isError } = useQuery<T[]>({
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
  };
}
