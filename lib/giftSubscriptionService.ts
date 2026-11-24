import { unwrapPaginated } from './api/unwrap';
import apiClient from './apiClient';

export interface GiftSubscription {
  id: string;
  senderId: string;
  recipientId: string;
  tier: string;
  durationDays?: number | null;
  message?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface SubscriptionTier {
  tier: string;
  displayName: string;
  monthlyPriceCents: number;
  annualPriceCents?: number | null;
  features: string[];
  hidden: boolean;
}

export interface GiftArtist {
  id: string;
  name?: string | null;
  username?: string | null;
  profileImage?: string | null;
}

const BASE = '/api/subscriptions';

export async function listGiftSubscriptions(): Promise<GiftSubscription[]> {
  const response = await apiClient.get(`${BASE}/gifts`);
  return Array.isArray(response.data?.gifts) ? response.data.gifts : [];
}

export async function listGiftTiers(): Promise<SubscriptionTier[]> {
  const response = await apiClient.get(`${BASE}/tiers`);
  const tiers = Array.isArray(response.data?.tiers) ? response.data.tiers : [];
  return tiers.filter((tier: SubscriptionTier) => !tier.hidden);
}

export async function searchGiftArtists(): Promise<GiftArtist[]> {
  const response = await apiClient.get('/api/artist?page=1&limit=100');
  return unwrapPaginated<GiftArtist>(response).items;
}

export async function sendGiftSubscription(input: {
  recipientId: string;
  tier: string;
  message?: string;
}): Promise<GiftSubscription> {
  const response = await apiClient.post(`${BASE}/gift`, input);
  return response.data?.gift;
}

export async function respondToGift(id: string, action: 'accept' | 'decline'): Promise<void> {
  await apiClient.post(`${BASE}/gift/${encodeURIComponent(id)}/${action}`);
}
