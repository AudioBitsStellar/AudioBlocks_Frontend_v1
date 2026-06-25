import { useQuery } from '@tanstack/react-query';
import { getMerchListings, getEventListings } from '@/lib/exploreService';

export function useGetMerch() {
  return useQuery({
    queryKey: ['explore-merch'],
    queryFn: getMerchListings,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useGetEvents() {
  return useQuery({
    queryKey: ['explore-events'],
    queryFn: getEventListings,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
