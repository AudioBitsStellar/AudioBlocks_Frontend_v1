import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';
import { unwrapList } from './api/unwrap';

export interface MerchItem {
  id: string;
  song: string;
  artist: string;
  description: string;
  image: string;
}

export interface EventItem {
  id: string;
  name: string;
  image: string;
  date: string;
  going: number;
  price: string;
}

export async function getMerchListings(): Promise<MerchItem[]> {
  const res = await apiClient.get(API_ENDPOINTS.MERCH);
  return unwrapList(res);
}

export async function getEventListings(): Promise<EventItem[]> {
  const res = await apiClient.get(API_ENDPOINTS.EVENTS);
  return unwrapList(res);
}

export interface ExploreCategory {
  id: string;
  name: string;
  image: string;
}

export interface ExploreCollectionItem {
  id: string;
  song: string;
  artist: string;
  description: string;
  image: string;
}

export interface ExploreArtistItem {
  id: string;
  song: string;
  artist: string;
  description: string;
  image: string;
}

export async function getExploreCategories(): Promise<ExploreCategory[]> {
  const res = await apiClient.get(API_ENDPOINTS.EXPLORE_CATEGORIES);
  return unwrapList(res);
}

export async function getExploreCollections(): Promise<ExploreCollectionItem[]> {
  const res = await apiClient.get(API_ENDPOINTS.EXPLORE_COLLECTIONS);
  return unwrapList(res);
}

export async function getExploreArtists(): Promise<ExploreArtistItem[]> {
  const res = await apiClient.get(API_ENDPOINTS.EXPLORE_ARTISTS);
  return unwrapList(res);
}

export interface SearchResult {
  id: string;
  type: 'track' | 'artist' | 'collection';
  title: string;
  subtitle: string;
  image: string;
}

export interface SearchOptions {
  /** Aborts the search; forward it to `apiClient.get` once this hits the backend. */
  signal?: AbortSignal;
}

export async function searchContent(
  query: string,
  { signal }: SearchOptions = {}
): Promise<SearchResult[]> {
  signal?.throwIfAborted();
  if (!query || query.length < 3) return [];

  // Mock data for search
  const results: SearchResult[] = [
    { id: 't1', type: 'track', title: 'Bigger', subtitle: 'Wiffi Drips', image: '/wif.jpg' },
    { id: 't2', type: 'track', title: 'ASILW', subtitle: 'Mchivir', image: '/chilli.jpg' },
    { id: 'a1', type: 'artist', title: 'Wiffi Drips', subtitle: 'Artist', image: '/wif.jpg' },
    { id: 'a2', type: 'artist', title: 'Mchivir', subtitle: 'Artist', image: '/chilli.jpg' },
    {
      id: 'c1',
      type: 'collection',
      title: 'World Tour',
      subtitle: 'Wiffi Drips Tour',
      image: '/AFRO.jpg',
    },
  ];

  return results.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(query.toLowerCase())
  );
}
