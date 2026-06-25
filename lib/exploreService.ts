import apiClient from './apiClient';

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
  const res = await apiClient.get('/api/merch');
  return res.data?.data ?? res.data ?? [];
}

export async function getEventListings(): Promise<EventItem[]> {
  const res = await apiClient.get('/api/events');
  return res.data?.data ?? res.data ?? [];
}
