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
