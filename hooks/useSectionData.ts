import { useQuery, UseQueryOptions } from '@tanstack/react-query';

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
  staleTime = 1000 * 60 * 5,
  retry = 1,
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
