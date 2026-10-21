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

/**
 * Get artists from Stellar/Soroban contracts
 * TODO: Integrate with backend API for Soroban contract reads
 */
export function useGetChainArtists() {
  return { 
    artists: [], 
    isLoading: false 
  };
}

/**
 * Get collections from Stellar/Soroban contracts
 * TODO: Integrate with backend API for Soroban contract reads
 */
export function useGetChainCollections() {
  return { 
    albums: [], 
    isLoading: false 
  };
}
