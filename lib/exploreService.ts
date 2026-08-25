import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

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
  return res.data?.data ?? res.data ?? [];
}

export async function getEventListings(): Promise<EventItem[]> {
  const res = await apiClient.get(API_ENDPOINTS.EVENTS);
  return res.data?.data ?? res.data ?? [];
}

export interface SearchResult {
  id: string;
  type: 'track' | 'artist' | 'collection';
  title: string;
  subtitle: string;
  image: string;
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 3) return [];
  
  // Mock data for search
  const results: SearchResult[] = [
    { id: 't1', type: 'track', title: 'Bigger', subtitle: 'Wiffi Drips', image: '/wif.jpg' },
    { id: 't2', type: 'track', title: 'ASILW', subtitle: 'Mchivir', image: '/chilli.jpg' },
    { id: 'a1', type: 'artist', title: 'Wiffi Drips', subtitle: 'Artist', image: '/wif.jpg' },
    { id: 'a2', type: 'artist', title: 'Mchivir', subtitle: 'Artist', image: '/chilli.jpg' },
    { id: 'c1', type: 'collection', title: 'World Tour', subtitle: 'Wiffi Drips Tour', image: '/AFRO.jpg' },
  ];
  
  return results.filter(r => 
    r.title.toLowerCase().includes(query.toLowerCase()) || 
    r.subtitle.toLowerCase().includes(query.toLowerCase())
  );
}
